export async function to916AndCompress(file: File, maxH = 1920) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  const targetW = Math.round((maxH * 9) / 16); // 1080 si maxH=1920
  const targetH = maxH;

  // recorte tipo "cover" para obtener 9:16 sin deformar
  const srcRatio = img.width / img.height;
  const dstRatio = targetW / targetH;

  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (srcRatio > dstRatio) {
    // muy ancho: recorta lados
    sw = Math.round(img.height * dstRatio);
    sx = Math.round((img.width - sw) / 2);
  } else if (srcRatio < dstRatio) {
    // muy alto: recorta arriba/abajo
    sh = Math.round(img.width / dstRatio);
    sy = Math.round((img.height - sh) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  // exporta JPEG comprimido (pequeño para 3D+web)
  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.82) // calidad 82%
  );

  URL.revokeObjectURL(img.src);

  return { blob, width: targetW, height: targetH, mime: "image/jpeg" as const };
}
