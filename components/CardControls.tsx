"use client";
import React, { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  title: string;                 
  onSetImage: (url: string) => void;
  kind: "product" | "scene";
  onUploaded?: (assetId: string) => void;     
};

export default function CardControls({ title, onSetImage, kind,
  onUploaded, }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function pickAndUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const ok = ["image/png", "image/jpeg"];
      if (!ok.includes(file.type)) throw new Error("Only PNG/JPG");
      
      const name = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const path = `${kind}s/${name}`;

      // 2) subir archivo
      const { error: upErr } = await supabase
        .storage.from("uploads")
        .upload(path, file);
      if (upErr) throw upErr;

      // 3) insertar en assets y obtener id
    const { data: ins, error: insErr } = await supabase
      .from("assets")
      .insert({
        kind,
        bucket: "uploads",
        path,
        size_bytes: file.size,
        mime: file.type
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // 4) URL pública + actualizar tarjeta
      const pub = supabase.storage.from("uploads").getPublicUrl(path);
      const url = pub.data.publicUrl;
      onSetImage(url);
      
      // 5) avisar asset_id al padre
    onUploaded?.(ins.id);

      setMsg("Updated ✔");
    } catch (e: any) {
      setMsg(e.message ?? "Upload failed");
      console.error(e);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-2.5 backdrop-blur">
      <h4 className="mb-1.5 text-sm font-semibold">{title}</h4>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl px-3 py-1.5 text-sm font-medium bg-white/90 hover:bg-white transition"
          disabled={busy}
        >
          {busy ? "Processing…" : "Choose image"}
        </button>

        <button
          type="button"
          onClick={pickAndUpload}
          className="rounded-xl px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-black/80 transition"
          disabled={busy}
        >
          Upload & set
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
      />

      {msg && <p className="mt-1.5 text-xs opacity-80">{msg}</p>}
    </div>
  );
}
