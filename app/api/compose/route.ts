import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabaseServer";
import { GoogleGenerativeAI } from "@google/generative-ai";

type JobRow = {
  id: string;
  product_asset_id: string | null;
  scene_asset_id: string | null;
  style_key: string | null;
  palette: string[] | null;
  status: "queued" | "processing" | "done" | "error";
  meta: any;
};

type AssetRow = {
  id: string;
  bucket: string;
  path: string;
  width: number | null;
  height: number | null;
  mime: string | null;
};

type StyleRow = {
  key: string;
  label: string;
  params: {
    engine?: string;       // "gemini" | fallback
    prompt?: string;       // con {{palette}}
    negative?: string;
    variants?: number;     // cuántas variantes pedir (mín 2)
    [k: string]: any;
  };
};

const W = 1080;
const H = 1920;

export async function POST() {
  const supabase = supabaseServer();

  try {
    // 1) último job en queued
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(1)
      .single<JobRow>();

    if (jobErr || !job) {
      return NextResponse.json({ ok: false, message: "No queued jobs" }, { status: 200 });
    }

    // 2) marcar processing
    await supabase.from("jobs").update({ status: "processing" }).eq("id", job.id);

    // 3) cargar assets y style
    const ids = [job.product_asset_id, job.scene_asset_id].filter(Boolean) as string[];

    const [{ data: assets, error: aErr }, { data: styles, error: sErr }] = await Promise.all([
      supabase.from("assets").select("*").in("id", ids),
      supabase.from("styles").select("*").eq("key", job.style_key).limit(1),
    ]);
    if (aErr) throw aErr;
    if (sErr) throw sErr;

    const product = assets?.find((a) => a.id === job.product_asset_id) as AssetRow | undefined;
    const scene   = assets?.find((a) => a.id === job.scene_asset_id) as AssetRow | undefined;
    const style   = (styles?.[0] as StyleRow | undefined) ?? undefined;

    if (!product || !scene) throw new Error("Missing product or scene asset");
    if (!style) throw new Error("Style not found");

    // URLs públicas desde Storage
    const sceneUrl   = supabase.storage.from(scene.bucket).getPublicUrl(scene.path).data.publicUrl;
    const productUrl = supabase.storage.from(product.bucket).getPublicUrl(product.path).data.publicUrl;

    // 4) prompt con palette
    const palette = job.palette ?? [];
    const paletteStr = palette.join(", ");
    const basePrompt = (style.params?.prompt ?? "").replaceAll("{{palette}}", paletteStr);
    const negative   = style.params?.negative ?? "";
    const wantVariants = Math.max(2, Number(style.params?.variants ?? 2));

    // 5) decidir motor: Gemini SDK o fallback sharp
    const useGemini = style.params?.engine === "gemini" && !!process.env.GEMINI_API_KEY;

    
    let results: { buffer: Buffer; ext: "jpg" | "png" }[];

    if (useGemini) {
      results = await composeWithGeminiSDK({
        prompt: basePrompt,
        negative,
        productUrl,
        sceneUrl,
        variants: wantVariants,
      });
    } else {
      results = await composeFakeWithSharp({ sceneUrl, productUrl, palette });
    }

    // 6) subir las primeras 2 variantes a renders + registrar en BD
    const ups = await Promise.all(
      results.slice(0, 2).map((r, i) =>
        uploadRenderAndInsert(supabase, r.buffer, job.id, (i + 1) as 1 | 2)
      )
    );

    // 7) done
    await supabase.from("jobs").update({ status: "done" }).eq("id", job.id);

    return NextResponse.json({
      ok: true,
      job_id: job.id,
      variants: ups.map((u, i) => ({
        variant: i + 1,
        render_id: u.render_id,
        asset_id: u.asset_id,
        url: u.publicUrl,
      })),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, message: err.message ?? "compose failed" }, { status: 500 });
  }
}

/* ================== Helpers ================== */

// Gemini SDK: genera N variantes (hace N requests, típicamente 2)
async function composeWithGeminiSDK(args: {
  prompt: string;
  negative?: string;
  productUrl: string;
  sceneUrl: string;
  variants: number;
}): Promise<{ buffer: Buffer; ext: "jpg" | "png" }[]> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-image-preview";
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  // 1) descarga assets a Buffer
  const [prodBuf, sceneBuf] = await Promise.all([
    fetch(args.productUrl).then((r) => r.arrayBuffer()).then((b) => Buffer.from(b)),
    fetch(args.sceneUrl).then((r) => r.arrayBuffer()).then((b) => Buffer.from(b)),
  ]);

  // 2) preparar parts como inlineData base64
  const toPart = (buf: Buffer, mime = "image/jpeg") => ({
    inlineData: { data: buf.toString("base64"), mimeType: mime },
  });
  const productPart = toPart(prodBuf, "image/jpeg");
  const scenePart   = toPart(sceneBuf, "image/jpeg");

  // 3) modelo
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const textPrompt =
    `${args.prompt}\n` +
    (args.negative ? `Negative: ${args.negative}\n` : "") +
    // Hint de tamaño (algunos modelos atienden instrucciones textuales)
    `Output for Instagram portrait 1080x1920, no watermarks, no text overlays.`;

  // 4) pedir N variantes
  const count = Math.max(2, args.variants || 2);
  const outs: { buffer: Buffer; ext: "jpg" | "png" }[] = [];

  for (let i = 0; i < count; i++) {
    const resp = await model.generateContent({
      contents: [{ role: "user", parts: [productPart, scenePart, { text: textPrompt }] }],
    });

    // 5) extraer imágenes (inlineData base64) si el modelo entrega imagen
    const parts = resp.response?.candidates?.[0]?.content?.parts ?? [];
    let pushed = false;

    for (const p of parts) {
      const id = (p as any).inlineData;
      if (id?.data && id?.mimeType?.startsWith("image/")) {
        const isPng = id.mimeType.includes("png");
        outs.push({ buffer: Buffer.from(id.data, "base64"), ext: isPng ? "png" : "jpg" });
        pushed = true;
      }
    }

    // Si no envió imagen (algunos modelos devuelven solo texto), hacemos un fallback visual
    if (!pushed) {
      const [fallback] = await composeFakeWithSharp({
        sceneUrl: args.sceneUrl,
        productUrl: args.productUrl,
        palette: [], // sin tint
      });
      outs.push(fallback);
    }
  }

  return outs;
}

// Fallback local (mezcla rápida con sharp)
async function composeFakeWithSharp(args: {
  sceneUrl: string;
  productUrl: string;
  palette: string[];
}): Promise<{ buffer: Buffer; ext: "jpg" | "png" }[]> {
  const [sceneBuf, prodBuf] = await Promise.all([
    fetch(args.sceneUrl).then((r) => r.arrayBuffer()).then((b) => Buffer.from(b)),
    fetch(args.productUrl).then((r) => r.arrayBuffer()).then((b) => Buffer.from(b)),
  ]);

  const sceneBase = await sharp(sceneBuf).resize(W, H, { fit: "cover" }).blur(0.3).toBuffer();
  const PROD_W = Math.round(W * 0.82);
  const PROD_H = Math.round(H * 0.82);
  const prodResized = await sharp(prodBuf).resize(PROD_W, PROD_H, { fit: "inside" }).toBuffer();

  const tintTop = args.palette[0] ?? "#000000";
  const tintBottom = args.palette[1] ?? tintTop;
  const grad = await makeLinearGradientPng(W, H, tintTop, tintBottom);

  const v1 = await sharp(sceneBase)
    .composite([{ input: prodResized, gravity: "center", blend: "over" }, { input: grad, blend: "overlay" }])
    .jpeg({ quality: 90 })
    .toBuffer();

  const v2 = await sharp(sceneBase)
    .composite([{ input: grad, blend: "soft-light" }, { input: prodResized, gravity: "center", blend: "over" }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return [
    { buffer: v1, ext: "jpg" },
    { buffer: v2, ext: "jpg" },
  ];
}

// Gradiente vertical con alpha
async function makeLinearGradientPng(w: number, h: number, topHex: string, bottomHex: string) {
  const top = hexToRgb(topHex);
  const bot = hexToRgb(bottomHex);
  const raw = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const r = Math.round(top.r * (1 - t) + bot.r * t);
    const g = Math.round(top.g * (1 - t) + bot.g * t);
    const b = Math.round(top.b * (1 - t) + bot.b * t);
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      raw[idx + 0] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 90; // alpha ~35%
    }
  }
  return await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  if (h.length === 6) {
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }
  return {
    r: ((bigint >> 8) & 0xf) * 17,
    g: ((bigint >> 4) & 0xf) * 17,
    b: (bigint & 0xf) * 17,
  };
}

async function uploadRenderAndInsert(
  supabase: ReturnType<typeof supabaseServer>,
  buffer: Buffer,
  jobId: string,
  variant: 1 | 2
) {
  const name = `${crypto.randomUUID()}.jpg`;
  const path = `jobs/${jobId}/${name}`;

  const u = await supabase.storage.from("renders").upload(path, buffer, {
    contentType: "image/jpeg",
  });
  if (u.error) throw u.error;

  const { data: asset, error: aErr } = await supabase
    .from("assets")
    .insert({
      kind: "render",
      bucket: "renders",
      path,
      width: W,
      height: H,
      size_bytes: buffer.length,
      mime: "image/jpeg",
    })
    .select("id")
    .single();
  if (aErr) throw aErr;

  const { data: render, error: rErr } = await supabase
    .from("renders")
    .insert({
      job_id: jobId,
      variant,
      render_asset_id: asset.id,
      selected: false,
      caption: null,
    })
    .select("id")
    .single();
  if (rErr) throw rErr;

  const publicUrl = supabase.storage.from("renders").getPublicUrl(path).data.publicUrl;
  return { asset_id: asset.id, render_id: render.id, publicUrl };
}
