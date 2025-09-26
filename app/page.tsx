"use client";
import { Canvas, extend } from "@react-three/fiber";
import {
  useGLTF,
  useTexture,
  Environment,
  Lightformer,
} from "@react-three/drei";
import { Physics } from "@react-three/rapier";

import Band from "@/components/band";

// Componente para el fondo (debe estar dentro del Canvas)
function StudioBackground() {
  const studioTexture = useTexture("/assets/images/studio.png");
  
  return (
    <mesh position={[0, 0, -25]} scale={[60, 35, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={studioTexture} />
    </mesh>
  );
}

useGLTF.preload("/assets/3d/card.glb");
useTexture.preload("/assets/images/tag_texture.png");
useTexture.preload("/assets/images/back.png");
useTexture.preload("/assets/images/photo1.png");
useTexture.preload("/assets/images/photo2.png");
useTexture.preload("/assets/images/photo3.png");
useTexture.preload("/assets/images/studio.png");

export default function Register() {
  return (
    <div className="relative h-screen w-full">
      <div className="flex h-screen w-full ">
        <Canvas
          camera={{ position: [0, 0, 13], fov: 25 }}
          style={{ backgroundColor: "transparent" }}
        >
          {/* Fondo con la imagen studio.png */}
          <StudioBackground />
          
          <ambientLight intensity={Math.PI} />
          <Physics
            debug={false}
            interpolate
            gravity={[0, -40, 0]}
            timeStep={1 / 60}
          >
            <Band offset={[-4, 0, 0]} imageUrl="/assets/images/photo1.png" />
            <Band offset={[0, 0, 0]} imageUrl="/assets/images/photo2.png" />
            <Band offset={[4, 0, 0]} imageUrl="/assets/images/photo3.png" />
          </Physics>
          <Environment background blur={0.75}>
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
    </div>
  );
}
