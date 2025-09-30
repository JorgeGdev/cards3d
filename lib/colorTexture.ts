// lib/colorTexture.ts
export async function make916TextureFromColors(
  colors: string[],  // 1 o 2 hex
  maxH = 1920
): Promise<{ blob: Blob; width: number; height: number; mime: "image/jpeg" }> {
  const targetH = maxH;
  const targetW = Math.round((targetH * 9) / 16);
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;

  if (colors.length === 0) colors = ["#000000"];
  if (colors.length === 1) {
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, targetW, targetH);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, targetH);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.9)
  );

  return { blob, width: targetW, height: targetH, mime: "image/jpeg" };
}
