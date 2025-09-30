// app/page.tsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import CardControls from "@/components/CardControls";
import Palette32 from "@/components/Palette32";
import StylePicker from "@/components/StylePicker";
import RenderPickerModal from "@/components/RenderPickerModal";
import LoadingModal from "@/components/LoadingModal";
import UserAuth from "@/components/UserAuth";



export default function Page() {
  const [imgLeft, setImgLeft] = useState("/assets/images/photo1.png");
  const [imgMid, setImgMid] = useState("/assets/images/photo2.png");
  const [imgRight, setImgRight] = useState("/assets/images/photo3.png");
  const [productAssetId, setProductAssetId] = useState<string | null>(null);
  const [sceneAssetId, setSceneAssetId] = useState<string | null>(null);



  // NUEVO: colores de paleta (0–2) y estilo
  const [palette, setPalette] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  // NUEVO: feedback del job
  const [jobMsg, setJobMsg] = useState<string | null>(null);
  const readyToCreate =
    !!productAssetId && !!sceneAssetId && !!selectedStyle && palette.length > 0;
  const [creating, setCreating] = useState(false);

  // estados nuevos
  const [modalOpen, setModalOpen] = useState(false);
  const [modalJobId, setModalJobId] = useState<string | null>(null);
  const [modalVariants, setModalVariants] = useState<any[]>([]);
  const [selectedRender, setSelectedRender] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  async function createJob() {
    try {
      setJobMsg(null);
      if (!readyToCreate || creating) return;
      setCreating(true);
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          product_asset_id: productAssetId,
          scene_asset_id: sceneAssetId,
          style_key: selectedStyle,
          palette,
          status: "queued",
        })
        .select("id")
        .single();
      if (error) throw error;
      setJobMsg(`Job created ✔ id=${data.id}`);
    } catch (e: any) {
      console.error(e);
      setJobMsg(e.message ?? "Job creation failed");
    } finally {
      setCreating(false);
    }
  }

  async function composeLast() {
    try {
      const res = await fetch("/api/compose", { method: "POST" });
      const json = await res.json();
      console.log("compose result:", json);
      if (json.ok) {
        setJobMsg(`Rendered 2 variants for job ${json.job_id}`);
        setModalJobId(json.job_id);
        setModalVariants(json.variants);
        setModalOpen(true); // abre modal
      } else {
        setJobMsg(json.message ?? "Compose failed");
      }
    } catch (e: any) {
      console.error(e);
      setJobMsg(e.message ?? "Compose failed");
    }
  }

  // helper: crea job y devuelve id
  async function createJobOnce() {
    const readyToCreate =
      !!productAssetId &&
      !!sceneAssetId &&
      !!selectedStyle &&
      palette.length > 0;
    if (!readyToCreate)
      throw new Error("Missing: product, scene, palette or style.");

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        product_asset_id: productAssetId,
        scene_asset_id: sceneAssetId,
        style_key: selectedStyle,
        palette,
        status: "queued",
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  // NUEVO: flujo completo
  async function generateImage() {
    try {
      setJobMsg(null);
      if (creating) return;
      setCreating(true);

      // 1) crear job
      const jobId = await createJobOnce();
      setJobMsg(`Job created ✔ ${jobId}`);

      // 2) componer
      const res = await fetch("/api/compose", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? "Compose failed");

      // 3) abrir modal
      setJobMsg(`Rendered 2 variants for job ${json.job_id}`);
      setModalJobId(json.job_id);
      setModalVariants(json.variants);
      setModalOpen(true);
    } catch (e: any) {
      console.error(e);
      setJobMsg(e.message ?? "Generation failed");
    } finally {
      setCreating(false);
    }
  }

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <UserAuth onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: "url(/assets/images/studio.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Card Generator Studio
        </h1>

            {/* Marcos Polaroid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
              {/* Marco 1 - Product */}
              <div className="flex flex-col items-center">
                <div className="relative w-80 h-96 mx-auto mb-6">
                  {/* Fondo blanco para simular papel polaroid */}
                  <div className="absolute inset-0 bg-white rounded-sm shadow-lg z-0"></div>
                  
                  {/* Imagen optimizada con ajuste automático */}
                  <div className="absolute top-4 left-4 right-4 bottom-16 z-10 overflow-hidden rounded-sm">
                    <Image 
                      src={imgLeft} 
                      alt="Product" 
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  
                  {/* Marco adelante */}
                  <div 
                    className="absolute -inset-4 z-20 pointer-events-none"
                    style={{
                      backgroundImage: "url(/assets/images/frame.png)",
                      backgroundSize: "120%",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center"
                    }}
                  ></div>
                  
                  {/* Texto en el marco */}
                  <div className="absolute bottom-2 left-0 right-0 text-center z-30">
                    <span className="text-lg font-handwriting text-gray-800 font-medium">Product</span>
                  </div>
                </div>
                <CardControls
                  title="Upload Product"
                  kind="product"
                  onSetImage={setImgLeft}
                  onUploaded={setProductAssetId}
                />
              </div>

              {/* Marco 2 - Scene */}
              <div className="flex flex-col items-center">
                <div className="relative w-80 h-96 mx-auto mb-6">
                  {/* Fondo blanco para simular papel polaroid */}
                  <div className="absolute inset-0 bg-white rounded-sm shadow-lg z-0"></div>
                  
                  {/* Imagen optimizada con ajuste automático */}
                  <div className="absolute top-4 left-4 right-4 bottom-16 z-10 overflow-hidden rounded-sm">
                    <Image 
                      src={imgMid} 
                      alt="Scene" 
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  
                  {/* Marco adelante */}
                  <div 
                    className="absolute -inset-4 z-20 pointer-events-none"
                    style={{
                      backgroundImage: "url(/assets/images/frame.png)",
                      backgroundSize: "120%",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center"
                    }}
                  ></div>
                  
                  {/* Texto en el marco */}
                  <div className="absolute bottom-2 left-0 right-0 text-center z-30">
                    <span className="text-lg font-handwriting text-gray-800 font-medium">Scene</span>
                  </div>
                </div>
                <CardControls
                  title="Upload Scene"
                  kind="scene"
                  onSetImage={setImgMid}
                  onUploaded={setSceneAssetId}
                />
              </div>

              {/* Marco 3 - Palette Preview */}
              <div className="flex flex-col items-center">
                <div className="relative w-80 h-96 mx-auto mb-6">
                  {/* Fondo blanco para simular papel polaroid */}
                  <div className="absolute inset-0 bg-white rounded-sm shadow-lg z-0"></div>
                  
                  {/* Imagen optimizada con ajuste automático */}
                  <div className="absolute top-4 left-4 right-4 bottom-16 z-10 overflow-hidden rounded-sm">
                    <Image 
                      src={imgRight} 
                      alt="Palette Preview" 
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  
                  {/* Marco adelante */}
                  <div 
                    className="absolute -inset-4 z-20 pointer-events-none"
                    style={{
                      backgroundImage: "url(/assets/images/frame.png)",
                      backgroundSize: "120%",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center"
                    }}
                  ></div>
                  
                  {/* Texto en el marco */}
                  <div className="absolute bottom-2 left-0 right-0 text-center z-30">
                    <span className="text-lg font-handwriting text-gray-800 font-medium">Colors</span>
                  </div>
                </div>
                <Palette32
                  onApplyToRightCard={setImgRight}
                  onColorsChange={setPalette}
                />
              </div>
            </div>

            {/* Style Picker y Generate Button */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
              <div className="w-full md:w-80">
                <StylePicker value={selectedStyle} onChange={setSelectedStyle} />
              </div>
              <button
                onClick={generateImage}
                disabled={
                  creating ||
                  !productAssetId ||
                  !sceneAssetId ||
                  !selectedStyle ||
                  palette.length === 0
                }
                className={`rounded-xl px-12 py-4 text-base font-medium transition shadow-lg min-w-60 ${
                  !creating &&
                  productAssetId &&
                  sceneAssetId &&
                  selectedStyle &&
                  palette.length > 0
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/20 text-white/40 cursor-not-allowed"
                }`}
              >
                {creating ? "Generating…" : "Generate image"}
              </button>
            </div>

        <LoadingModal 
          open={creating} 
          message="Creating your amazing image... This might take a moment! ✨"
        />

        <RenderPickerModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          jobId={modalJobId}
          variants={modalVariants}
          onSelected={(v) => {
            setJobMsg(`Selected variant ${v.variant} for job ${modalJobId}`);
          }}
        />

        {jobMsg && (
          <div className="w-full mt-6">
            <div className="bg-green-900/50 text-green-200 p-3 rounded-lg text-sm font-medium text-center">
              {jobMsg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
