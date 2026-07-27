// Reads a File, downscales it via a canvas, and returns a base64 data URL.
// We keep uploads small (~30KB typical) so they can live directly in the DB
// as TEXT — no separate blob storage needed for MVP.
export async function resizeImageToDataUrl(
  file: File,
  maxSize: number,
  quality: number,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Nepavyko įkelti paveikslėlio.'));
    el.src = dataUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas nepalaikomas.');
  ctx.drawImage(img, 0, 0, w, h);
  // Use PNG when source is PNG (preserves transparency for logos); otherwise
  // JPEG which is smaller for photos.
  const isPng = file.type === 'image/png';
  return canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
}
