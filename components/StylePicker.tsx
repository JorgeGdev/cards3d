"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type StyleRow = { key: string; label: string };

export default function StylePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (key: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [styles, setStyles] = useState<StyleRow[]>([
    // Fallback por si no carga BD
    { key: "bokeh",           label: "Bokeh" },
    { key: "double_exposure", label: "Double Exposure" },
    { key: "hdr",             label: "HDR" },
    { key: "long_exposure",   label: "Long Exposure" },
    { key: "minimalism",      label: "Minimalism" },
  ]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("styles")
          .select("key,label")
          .eq("enabled", true)
          .order("label", { ascending: true });
        if (error) throw error;
        if (mounted && data?.length) setStyles(data as StyleRow[]);
      } catch (e: any) {
        setMsg("Using fallback styles (DB read failed).");
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur">
      <h4 className="mb-2 text-sm font-semibold">Style · pick one</h4>

      <div className="relative">
        {/* Select pequeño, glassy */}
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          className="
            w-full appearance-none rounded-xl border border-white/20 bg-white/90
            px-3 py-1.5 pr-9 text-sm font-medium text-black
            shadow-sm transition
            hover:bg-white focus:outline-none focus:ring-2 focus:ring-black/40
          "
        >
          <option value="" disabled>
            {loading ? "Loading styles…" : "Select a style"}
          </option>
          {styles.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Chevron */}
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70"
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z" />
        </svg>
      </div>

      {/* Estado mini */}
      <div className="mt-2 text-xs opacity-75">
        {value ? `Selected: ${value}` : "No style selected"}
        {msg && <div className="mt-1">{msg}</div>}
      </div>
    </div>
  );
}
