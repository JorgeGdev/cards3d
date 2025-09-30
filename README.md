# 🎨 Cards3D - Interactive 3D Artist Cards

Proyecto demo que muestra tarjetas 3D colgantes (con física y materiales) usando Next.js + React Three Fiber.

Si te ayuda, considera darle una estrella al repositorio.

## Resumen

Este repositorio contiene una pequeña experiencia interactiva en 3D donde varias tarjetas cuelgan de una banda (lanyard). Las tarjetas usan modelos GLB para la geometría y texturas para mostrar imágenes en el frente y una textura de reverso. La física está manejada por Rapier (vía @react-three/rapier) y la escena por React Three Fiber.

## Características principales

- Tarjetas colgando simuladas por joints físicos (Rapier)
- Interacción: arrastrar/soltar tarjetas (pointer events) con control cinemático
- Textura frontal configurable vía prop `imageUrl` y textura de reverso (`back.png`)
- Ajustes automáticos (repeat/offset) para adaptar imágenes con distintos aspect ratios
- Iluminación con `Environment` y `Lightformer` para look más realista
- Fondo de página estático (CSS) para evitar interferencias con interacciones táctiles

## Tecnologías

- Next.js 14 (App Router)
- React 18
- Three.js
- @react-three/fiber (React Three Fiber)
- @react-three/drei (useGLTF, useTexture, helpers)
- @react-three/rapier (fisica)
- meshline (para la banda visual)

## Estructura de carpetas

```
cards3d/
├─ app/
│  ├─ layout.tsx          # Layout global
│  └─ page.tsx            # Página principal (Canvas + configuración)
├─ components/
│  └─ band.tsx            # Lógica de la banda, nudos, tarjeta y texturas
├─ public/
│  └─ assets/
│     ├─ 3d/              # Modelos GLB (.glb)
│     │  ├─ card.glb
│     │  └─ card1.glb
│     └─ images/          # Imágenes y texturas
│        ├─ back.png
│        ├─ photo1.png
│        ├─ photo2.png
│        ├─ photo3.png
│        └─ studio.png    # Imagen de fondo (CSS)
├─ styles/
│  └─ globals.css
├─ next.config.mjs
├─ package.json
└─ README.md
```

## Instalación y ejecución local

Requisitos: Node 18+ y npm (o yarn).

Instalar dependencias y arrancar en modo desarrollo:

```powershell
npm install
npm run dev
```

Abrir en el navegador: http://localhost:3000

Build para producción:

```powershell
npm run build
npm start
```

## Cómo funcionan las texturas

- `components/band.tsx` carga el GLB (`/assets/3d/card.glb`) y aplica una `meshPhysicalMaterial` con `map` apuntando a la textura frontal (si `imageUrl` está presente) o a la textura del GLB por defecto.
- Para controlar recortes/escala, el componente usa `customMap.repeat` y `customMap.offset` junto con `wrapS/wrapT` (ClampToEdgeWrapping o RepeatWrapping según el caso).
- El reverso usa `back.png` y se coloca en la cara posterior del modelo.

## Recomendaciones para imágenes

- Resolución orientativa: 700x1000 o 1400x2000 para mantener buena calidad.
- Si la imagen tiene un aspect ratio distinto, el código intentará ajustarla; si necesitas resultados perfectos, adapta las imágenes al ratio ~1.6:2.25 (o 0.711).

## Deployment (Vercel)

1. Sube el repo a GitHub (ejemplo):

```powershell
git remote add origin https://github.com/JorgeGdev/cards3d.git
git push -u origin main
```

2. En Vercel: New Project → Import Git Repository → selecciona `cards3d`.

3. Configuración en Vercel (si lo solicita):
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

Vercel desplegará automáticamente después de cada push a `main`.

## Problemas comunes y soluciones rápidas

- Fondo negro al cargar: evita usar `Environment background`; usa un fondo CSS para que sea estático.
- Textura repetida: cambia `wrapS/wrapT` a `THREE.ClampToEdgeWrapping` o ajusta `repeat`/`offset`.
- Cambios en texturas que no aparecen: limpia cache, reinicia dev server.

## Contribuciones

1. Haz fork y crea una rama (`feature/mi-cambio`)
2. Haz commit y push
3. Abre un PR

## Licencia

MIT

---

Si quieres, puedo añadir ejemplos de snippets (por ejemplo: cómo calcular automáticamente `repeat`/`offset` según el tamaño de la textura), o preparar la PR para subir el proyecto a tu repositorio si me das permiso para empujar.
