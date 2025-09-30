import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { to916AndCompress } from "@/lib/image";

type UploadedMeta = {
  id: string;
  kind: "product" | "scene";
  bucket: string;
  path: string;
  width: number;
  height: number;
  size_bytes: number;
  mime: string;
};

export default function Uploader() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const productRef = useRef<HTMLInputElement>(null);
  const sceneRef = useRef<HTMLInputElement>(null);

  async function handleUpload(kind: "product" | "scene", file: File) {
    // 1) Forzar 9:16 + comprimir
    const processed = await to916AndCompress(file, 1920);
    const fileName = `${crypto.randomUUID()}.jpg`;
    const path = `${kind}s/${fileName}`;

    // 2) Subir a Storage
    const { data: up, error: upErr } = await supabase.storage
      .from("uploads")
      .upload(path, processed.blob, { contentType: processed.mime, upsert: false });
    if (upErr) throw upErr;

    // 3) Insert en assets
    const size_bytes = processed.blob.size;
    const { data: ins, error: insErr } = await supabase
      .from("assets")
      .insert({
        kind,
        bucket: "uploads",
        path,
        width: processed.width,
        height: processed.height,
        size_bytes,
        mime: processed.mime
      })
      .select()
      .single();
    if (insErr) throw insErr;

    const meta: UploadedMeta = {
      id: ins.id,
      kind,
      bucket: "uploads",
      path,
      width: processed.width,
      height: processed.height,
      size_bytes,
      mime: processed.mime
    };
    return meta;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const productFile = productRef.current?.files?.[0];
      const sceneFile = sceneRef.current?.files?.[0];
      if (!productFile || !sceneFile) {
        setStatus("Please choose both: Product and Scene.");
        setLoading(false);
        return;
      }
      // Validar tipo
      const okTypes = ["image/png", "image/jpeg"];
      if (!okTypes.includes(productFile.type) || !okTypes.includes(sceneFile.type)) {
        setStatus("Only PNG or JPG files are allowed.");
        setLoading(false);
        return;
      }

      const prod = await handleUpload("product", productFile);
      const scen = await handleUpload("scene", sceneFile);

      setStatus(`Uploaded ✔ Product ${prod.path} & Scene ${scen.path}`);
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message ?? "upload failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="uploader">
      <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
        <div className="text-center">
          <h3 className="text-white text-lg font-semibold mb-2">Upload Images</h3>
          <p className="text-gray-300 text-sm">Choose product and scene images (auto-resized to 9:16)</p>
        </div>

        <label className="block">
          <div className="text-white font-medium mb-2">📦 Product Image</div>
          <input
            ref={productRef}
            type="file"
            accept="image/png,image/jpeg"
            capture="environment"
            className="block w-full text-sm text-gray-300
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100
                       file:cursor-pointer cursor-pointer"
          />
        </label>

        <label className="block">
          <div className="text-white font-medium mb-2">🏞️ Scene Image</div>
          <input
            ref={sceneRef}
            type="file"
            accept="image/png,image/jpeg"
            capture="environment"
            className="block w-full text-sm text-gray-300
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-green-50 file:text-green-700
                       hover:file:bg-green-100
                       file:cursor-pointer cursor-pointer"
          />
        </label>

        <button 
          type="submit" 
          disabled={loading}
          className="py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 
                     hover:from-purple-600 hover:to-pink-600 
                     disabled:from-gray-500 disabled:to-gray-600
                     text-white font-semibold rounded-lg
                     transition-all duration-200 ease-in-out
                     disabled:cursor-not-allowed"
        >
          {loading ? "⏳ Uploading..." : "🚀 Upload Both"}
        </button>

        {status && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            status.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
          }`}>
            {status}
          </div>
        )}
      </div>
    </form>
  );
}
