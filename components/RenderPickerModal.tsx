"use client";
import React from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Environment, Lightformer } from "@react-three/drei";
import { supabase } from "@/lib/supabaseClient";
import Band from "@/components/band";

type Variant = { variant: number; render_id: string; asset_id: string; url: string };

export default function RenderPickerModal({
  open,
  onClose,
  jobId,
  variants,
  onSelected,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string | null;
  variants: Variant[];
  onSelected: (v: Variant) => void; // notifica a la página
}) {
  if (!open) return null;

  async function selectVariant(v: Variant) {
    // marca selected=true en renders (MVP con RLS abierto)
    const { error } = await supabase
      .from("renders")
      .update({ selected: true })
      .eq("id", v.render_id);
    if (error) {
      console.error(error);
      alert("Could not select render");
      return;
    }
    onSelected(v);
    onClose();
  }

  async function download(url: string) {
    const r = await fetch(url);
    const b = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `render-${jobId ?? "image"}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur" onClick={onClose} />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">Pick your favorite</h3>
            <p className="text-sm opacity-80">Job {jobId ?? "—"}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/80 px-3 py-1 text-sm hover:bg-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {variants.map((v) => (
            <div
              key={v.render_id}
              className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur"
            >
              <div className="relative mb-4 overflow-hidden rounded-xl h-[420px]">
                <Canvas
                  camera={{ position: [0, 0, 8], fov: 45 }}
                  style={{ background: "transparent" }}
                >
                  <ambientLight intensity={Math.PI} />
                  <Physics
                    debug={false}
                    interpolate
                    gravity={[0, -40, 0]}
                    timeStep={1 / 60}
                  >
                    <Band offset={[0, 0, 0]} imageUrl={v.url} />
                  </Physics>
                  <Environment blur={0.75}>
                    <Lightformer
                      intensity={2}
                      color="white"
                      position={[0, -1, 5]}
                      rotation={[0, 0, Math.PI / 3]}
                      scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                      intensity={3}
                      color="white"
                      position={[-1, -1, 1]}
                      rotation={[0, 0, Math.PI / 3]}
                      scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                      intensity={3}
                      color="white"
                      position={[1, 1, 1]}
                      rotation={[0, 0, Math.PI / 3]}
                      scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                      intensity={10}
                      color="white"
                      position={[-10, 0, 14]}
                      rotation={[0, Math.PI / 2, Math.PI / 3]}
                      scale={[100, 10, 1]}
                    />
                  </Environment>
                </Canvas>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => selectVariant(v)}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80"
                >
                  Select this
                </button>
                <button
                  onClick={() => download(v.url)}
                  className="rounded-xl bg-white/90 px-4 py-2 text-sm font-medium hover:bg-white"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-xs opacity-70">
          You can close this window if you want to try again later.
        </div>
      </div>
    </div>
  );
}
