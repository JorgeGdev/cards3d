"use client";
import { useEffect, useState } from "react";
import { PALETTE_32 } from "@/lib/palette";
import { make916TextureFromColors } from "@/lib/colorTexture";
import { supabase } from "@/lib/supabaseClient";

export default function Palette32({
  onApplyToRightCard,
  onColorsChange,
}: {
  onApplyToRightCard: (url: string) => void;
  onColorsChange?: (colors: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
  onColorsChange?.(selected);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selected]);

  function toggleColor(hex: string) {
  setSelected((prev) => {
    if (prev.includes(hex)) return prev.filter((c) => c !== hex);
    if (prev.length >= 2) return [prev[1], hex]; // mantiene 2 máximo
    return [...prev, hex];
  });
}

  async function apply() {
    try {
      setBusy(true);
      setMsg(null);
      if (selected.length === 0) {
        setMsg("Pick at least 1 color.");
        return;
      }

      // 1) Generar imagen 9:16 en memoria
      const tex = await make916TextureFromColors(selected, 1920);
      const name = `${crypto.randomUUID()}.jpg`;
      const path = `palettes/${name}`;

      // 2) Subir a Storage
      const { error: upErr } = await supabase
        .storage
        .from("uploads")
        .upload(path, tex.blob, { contentType: tex.mime });
      if (upErr) throw upErr;

      // 3) URL pública y aplicar a la tarjeta derecha
      const pub = supabase.storage.from("uploads").getPublicUrl(path);
      const url = pub.data.publicUrl;
      onApplyToRightCard(url);
      setMsg("Applied ✔");
    } catch (e: any) {
      console.error(e);
      setMsg(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  function clearSel() {
    setSelected([]);
    onColorsChange?.([]);
    setMsg(null);
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-2.5 backdrop-blur">
      <h4 className="mb-1.5 text-sm font-semibold">Brand palette · pick up to 2</h4>

      {/* Muestra selección actual */}
      <div className="mb-2 flex gap-1 flex-wrap">
        {selected.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-1.5 py-0.5 text-xs"
            style={{ background: c }}
          >
            <span className="rounded-full border border-white/30" style={{ width: 10, height: 10 }} />
            <span className="bg-black/30 px-1 rounded text-xs">{c}</span>
          </span>
        ))}
        {selected.length === 0 && <span className="text-xs opacity-70">None selected</span>}
      </div>

      {/* Grid 8x4 de 32 colores - más compacto */}
      <div className="grid grid-cols-8 gap-1.5">
        {PALETTE_32.map((hex) => {
          const active = selected.includes(hex);
          return (
            <button
              key={hex}
              type="button"
              onClick={() => toggleColor(hex)}
              className={`h-6 w-6 rounded border transition ${
                active ? "ring-2 ring-white scale-105" : "border-white/20 hover:scale-105"
              }`}
              style={{ background: hex }}
              title={hex}
            />
          );
        })}
      </div>

      {/* Acciones */}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={clearSel}
          className="rounded-xl px-3 py-1.5 text-sm font-medium bg-white/90 hover:bg-white transition"
          disabled={busy}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={apply}
          className="rounded-xl px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-black/80 transition"
          disabled={busy}
        >
          {busy ? "Generating…" : "Apply to right card"}
        </button>
      </div>

      {msg && <p className="mt-1.5 text-xs opacity-80">{msg}</p>}
    </div>
  );
}
