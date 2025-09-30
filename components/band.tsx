// components/band.tsx
import * as THREE from "three"
import { useEffect, useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF, useTexture } from "@react-three/drei"
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  RapierRigidBody,
} from "@react-three/rapier"

type V3 = [number, number, number]

const segmentProps = {
  type: "dynamic",
  canSleep: true,
  colliders: false,
  angularDamping: 2,
  linearDamping: 2,
} as const

export default function Band({
  maxSpeed = 50,
  minSpeed = 10,
  offset = [0, 0, 0],
  imageUrl, // <-- NUEVO: textura opcional para la cara de la card
}: {
  maxSpeed?: number
  minSpeed?: number
  offset?: V3
  imageUrl?: string
}) {
  // ---- refs físicas (ancla + 3 nudos + tarjeta) ----
  const fixed = useRef<RapierRigidBody>(null)
  const j1 = useRef<RapierRigidBody>(null)
  const j2 = useRef<RapierRigidBody>(null)
  const j3 = useRef<RapierRigidBody>(null)
  const card = useRef<RapierRigidBody>(null)

  // ---- estado de interacción card (drag/hover) ----
  const [dragged, setDragged] = useState<THREE.Vector3 | false>(false)
  const [hovered, setHovered] = useState(false)
  const vec = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const ang = useMemo(() => new THREE.Vector3(), [])
  const rot = useMemo(() => new THREE.Vector3(), [])

  // ---- GLB de la tarjeta (igual que repo) ----
  const { nodes, materials } = useGLTF("/assets/3d/card.glb") as any

  // ---- TEXTURAS (frontal e imagen de reverso) ----
  const customMap = useTexture(imageUrl || "") as THREE.Texture | undefined
  const backMap = useTexture("/assets/images/back.png") as THREE.Texture

  useEffect(() => {
    if (!imageUrl || !customMap) return

    console.log("Configurando textura:", imageUrl)

    // Correcciones básicas para mapas en GLTF
    customMap.colorSpace = THREE.SRGBColorSpace
    customMap.flipY = false
    customMap.anisotropy = 16
    
    // Usar ClampToEdgeWrapping para evitar repeticiones
    customMap.wrapS = THREE.ClampToEdgeWrapping
    customMap.wrapT = THREE.ClampToEdgeWrapping

    // Esperar a que la imagen se cargue para obtener dimensiones reales
    if (customMap.image) {
      const imgWidth = customMap.image.width
      const imgHeight = customMap.image.height
      const imgAspect = imgWidth / imgHeight
      
      // Aspect ratio de la carta (aproximadamente 2:1.75)
      const cardAspect = 2 / 1.75
      
      let scaleX = 1.3
      let scaleY = 1.3
      let offsetX = 0
      let offsetY = 0
      
      if (imgAspect > cardAspect) {
        // Imagen más ancha que la carta - ajustar por altura
        scaleY = imgAspect / cardAspect
        offsetY = -(scaleY - 1) / 35
      } else {
        // Imagen más alta que la carta - ajustar por ancho
        scaleX = cardAspect / imgAspect
        offsetX = -(scaleX - 1) / 35
      }
      
      customMap.repeat.set(scaleX, scaleY)
      customMap.offset.set(offsetX, offsetY)
      
      console.log("Imagen:", imgWidth, "x", imgHeight, "aspect:", imgAspect.toFixed(2))
      console.log("Ajuste - repeat:", scaleX.toFixed(2), scaleY.toFixed(2), "offset:", offsetX.toFixed(2), offsetY.toFixed(2))
    } else {
      // Fallback si no hay imagen cargada
      customMap.repeat.set(1, 1)
      customMap.offset.set(0, 0)
    }
    
    customMap.rotation = 0
    customMap.needsUpdate = true
  }, [imageUrl, customMap])

  useEffect(() => {
    if (!backMap) return

    // Configurar la textura del reverso con el mismo sistema adaptativo
    backMap.colorSpace = THREE.SRGBColorSpace
    backMap.flipY = false
    backMap.anisotropy = 16
    
    // Usar ClampToEdgeWrapping para evitar repeticiones
    backMap.wrapS = THREE.ClampToEdgeWrapping
    backMap.wrapT = THREE.ClampToEdgeWrapping
    
    // Sistema adaptativo para la imagen de reverso
    if (backMap.image) {
      const imgWidth = backMap.image.width
      const imgHeight = backMap.image.height
      const imgAspect = imgWidth / imgHeight
      const cardAspect = 2 / 1.75
      
      let scaleX = 1.3
      let scaleY = 1.3
      let offsetX = 0
      let offsetY = 0
      
      if (imgAspect > cardAspect) {
        scaleY = imgAspect / cardAspect
        offsetY = -(scaleY - 1) / 35
      } else {
        scaleX = cardAspect / imgAspect
        offsetX = -(scaleX - 1) / 35
      }
      
      backMap.repeat.set(scaleX, scaleY)
      backMap.offset.set(offsetX, offsetY)
    } else {
      backMap.repeat.set(1, 1)
      backMap.offset.set(0, 0)
    }
    
    backMap.needsUpdate = true
  }, [backMap])



  // ---- curva y malla de la banda tubular ----
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
    []
  )
  curve.curveType = "chordal"

  const bandMesh = useRef<THREE.Mesh>(null!)
  const offsetVec = useMemo(() => new THREE.Vector3(...offset), [offset])

  // ---- joints físicos (misma topología del proyecto) ----
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])

  // Enganche card: bajamos 1 “cm” para tocar el holder
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.30, -0.05],
  ])

  // ---- cursor para drag ----
  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab"
      return () => void (document.body.style.cursor = "auto")
    }
    return () => void (document.body.style.cursor = "auto")
  }, [hovered, dragged])

  // ---- frame loop: drag + geometría de la banda + suavizados ----
  useFrame((state, delta) => {
    if (
      !fixed.current ||
      !j1.current ||
      !j2.current ||
      !j3.current ||
      !card.current ||
      !bandMesh.current
    )
      return

    // Drag cinemático
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((r) => r.current?.wakeUp())
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      })
    }

    // Suavizado visual de j1/j2 (compat con tu lógica)
    const j1p = j1.current.translation()
    const j2p = j2.current.translation()
    const j1V = new THREE.Vector3(j1p.x, j1p.y, j1p.z)
    const j2V = new THREE.Vector3(j2p.x, j2p.y, j2p.z)

    // Puntos en MUNDO
    const pFixed = fixed.current.translation()
    const pJ1 = j1.current.translation()
    const pJ2 = j2.current.translation()
    const pJ3 = j3.current.translation()

    curve.points[0].set(pJ3.x, pJ3.y, pJ3.z)
    curve.points[1].set(j2V.x || pJ2.x, j2V.y || pJ2.y, j2V.z || pJ2.z)
    curve.points[2].set(j1V.x || pJ1.x, j1V.y || pJ1.y, j1V.z || pJ1.z)
    curve.points[3].set(pFixed.x, pFixed.y, pFixed.z)

    // A local del group (offset)
    const p0Local = curve.points[0].clone().sub(offsetVec)
    const p1Local = curve.points[1].clone().sub(offsetVec)
    const p2Local = curve.points[2].clone().sub(offsetVec)
    const p3Local = curve.points[3].clone().sub(offsetVec)

    const localCurve = new THREE.CatmullRomCurve3([p0Local, p1Local, p2Local, p3Local])

    // Geometría tubular (una sola cuerda)
    const newGeom = new THREE.TubeGeometry(localCurve, 64, 0.022, 12, false)
    bandMesh.current.geometry.dispose()
    bandMesh.current.geometry = newGeom

    // Suaviza rotación de la card
    const av = card.current.angvel()
    const r = card.current.rotation()
    ang.set(av.x, av.y, av.z)
    rot.set(r.x, r.y, r.z)
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, false)
  })

  // ---- JSX ----
  return (
    <group position={offset}>
      <group position={[0, 4.6, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody ref={j1} position={[0.5, 0, 0]} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody ref={j2} position={[1, 0, 0]} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody ref={j3} position={[1.5, 0, 0]} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>

        {/* Tarjeta */}
        <RigidBody
          ref={card}
          position={[2, 0, 0]}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.25, -0.05]}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerUp={(e) => {
              (e.target as Element)?.releasePointerCapture(e.pointerId)
              setDragged(false)
            }}
            onPointerDown={(e) => {
              (e.target as Element)?.setPointerCapture(e.pointerId)
              if (!card.current) return
              setDragged(
                new THREE.Vector3()
                  .copy((e as any).point)
                  .sub(vec.copy(card.current.translation()))
              )
            }}
          >
            {/* Tarjeta con geometría original del GLB */}
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={imageUrl ? customMap : materials.base.map}
                map-anisotropy={16}
                clearcoat={1}
                clearcoatRoughness={0.15}
                roughness={0.3}
                metalness={0.5}
                toneMapped={true}
                side={THREE.FrontSide}
              />
            </mesh>

            {/* Cara posterior de la tarjeta con geometría original */}
            <mesh geometry={nodes.card.geometry} scale={[1, 1, -1]}>
              <meshPhysicalMaterial
                map={backMap}
                map-anisotropy={16}
                clearcoat={1}
                clearcoatRoughness={0.15}
                roughness={0.3}
                metalness={0.5}
                toneMapped={true}
                side={THREE.FrontSide}
              />
            </mesh>

            {/* Partes metálicas sin cambios */}
            
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>

      {/* Banda tubular única (visual) */}
      <mesh ref={bandMesh}>
        <tubeGeometry
          args={[
            new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(0, -0.5, 0)]),
            8,
            0.022,
            12,
            false,
          ]}
        />
        <meshStandardMaterial color="#222" metalness={0.1} roughness={0.55} />
      </mesh>
    </group>
  )
}
