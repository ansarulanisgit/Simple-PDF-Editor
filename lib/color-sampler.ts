import { TextItemModel, PageInfo, ColorRgb } from './types';

/**
 * Samples the underlying canvas pixels around and within each text item
 * to accurately determine the document background color and original text color.
 */
export function sampleColorsForItems(
  canvas: HTMLCanvasElement,
  items: TextItemModel[],
  pageInfo: PageInfo,
  scale: number
): Record<string, { sampledBgColor: ColorRgb; sampledTextColor: ColorRgb }> {
  const result: Record<string, { sampledBgColor: ColorRgb; sampledTextColor: ColorRgb }> = {};
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return result;

  const dpr = window.devicePixelRatio || 1;
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  if (canvasW <= 0 || canvasH <= 0) return result;

  // Perform a SINGLE readback of the canvas buffer (100x faster than thousands of getImageData(1,1) calls)
  let data: Uint8ClampedArray;
  try {
    const fullImageData = ctx.getImageData(0, 0, canvasW, canvasH);
    data = fullImageData.data;
  } catch (e) {
    console.warn('Canvas color sampling unavailable:', e);
    return result;
  }

  // Fast direct array lookup for pixel at (x, y)
  const getPixel = (x: number, y: number) => {
    const px = Math.min(Math.max(0, Math.round(x)), canvasW - 1);
    const py = Math.min(Math.max(0, Math.round(y)), canvasH - 1);
    const offset = (py * canvasW + px) * 4;
    return {
      r: data[offset],
      g: data[offset + 1],
      b: data[offset + 2],
      a: data[offset + 3],
    };
  };

  for (const item of items) {
    // Coordinate conversion from PDF points to canvas pixels
    const canvasX = Math.round(item.pdfX * scale * dpr);
    const canvasBaselineY = Math.round((pageInfo.pdfHeight - item.pdfY) * scale * dpr);
    const itemWPx = Math.round(item.pdfWidth * scale * dpr);
    const itemHPx = Math.round(item.fontSize * scale * dpr);
    const topY = Math.round(canvasBaselineY - itemHPx * 0.88);

    // Sample perimeter points around the text bounding box for the background color
    const perimeterPoints = [
      { x: canvasX - 5 * dpr, y: topY + itemHPx / 2 },          // Left
      { x: canvasX + itemWPx + 5 * dpr, y: topY + itemHPx / 2 },// Right
      { x: canvasX + itemWPx / 2, y: topY - 4 * dpr },          // Top
      { x: canvasX + itemWPx / 2, y: topY + itemHPx + 4 * dpr },// Bottom
      { x: canvasX - 3 * dpr, y: topY - 3 * dpr },              // Top-Left
      { x: canvasX + itemWPx + 3 * dpr, y: topY - 3 * dpr },    // Top-Right
    ];

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let sampleCount = 0;

    for (const pt of perimeterPoints) {
      const p = getPixel(pt.x, pt.y);
      if (p.a > 50) {
        totalR += p.r;
        totalG += p.g;
        totalB += p.b;
        sampleCount++;
      }
    }

    const bgR = sampleCount > 0 ? Math.round(totalR / sampleCount) : 255;
    const bgG = sampleCount > 0 ? Math.round(totalG / sampleCount) : 255;
    const bgB = sampleCount > 0 ? Math.round(totalB / sampleCount) : 255;

    // Calculate background luminance (0 to 1)
    const rawLum = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / 255;

    // If background is light/white paper (>0.82), snap to pure white (255, 255, 255)
    // so nearby table border lines or grid strokes do not tint the white paper gray!
    const sampledBgColor: ColorRgb =
      rawLum > 0.82 ? { r: 255, g: 255, b: 255 } : { r: bgR, g: bgG, b: bgB };

    const bgLuminance = (0.299 * sampledBgColor.r + 0.587 * sampledBgColor.g + 0.114 * sampledBgColor.b) / 255;
    const isDarkBg = bgLuminance < 0.5;

    // Default high-contrast text color based on luminance
    let textR = isDarkBg ? 255 : 0;
    let textG = isDarkBg ? 255 : 0;
    let textB = isDarkBg ? 255 : 0;
    let bestContrastDiff = 0;

    // Sample interior glyph pixels to detect custom text color (e.g. golden, white, green)
    const interiorSamples = [
      { x: canvasX + itemWPx * 0.25, y: topY + itemHPx * 0.5 },
      { x: canvasX + itemWPx * 0.5, y: topY + itemHPx * 0.5 },
      { x: canvasX + itemWPx * 0.75, y: topY + itemHPx * 0.5 },
      { x: canvasX + itemWPx * 0.5, y: topY + itemHPx * 0.3 },
      { x: canvasX + itemWPx * 0.5, y: topY + itemHPx * 0.7 },
    ];

    for (const pt of interiorSamples) {
      const p = getPixel(pt.x, pt.y);
      if (p.a > 100) {
        const diff = Math.abs(p.r - bgR) + Math.abs(p.g - bgG) + Math.abs(p.b - bgB);
        if (diff > bestContrastDiff && diff > 75) {
          bestContrastDiff = diff;
          textR = p.r;
          textG = p.g;
          textB = p.b;
        }
      }
    }

    const sampledTextColor: ColorRgb = { r: textR, g: textG, b: textB };
    result[item.id] = { sampledBgColor, sampledTextColor };
  }

  return result;
}
