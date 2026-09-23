import { TextItemModel, PageInfo, ColorRgb } from './types';

/**
 * Samples the underlying canvas pixels around and within each text item
 * to accurately determine the document background color and original text color.
 * Uses median perimeter sampling to avoid table border interference,
 * directional contrast scanning to identify glyph strokes, and strict contrast enforcement.
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

  // Single fast readback of the full canvas buffer
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
    const itemWPx = Math.max(Math.round(item.pdfWidth * scale * dpr), 8);
    const itemHPx = Math.max(Math.round(item.fontSize * scale * dpr), 8);
    const topY = Math.round(canvasBaselineY - itemHPx * 0.88);

    // 1. Immediate perimeter sampling:
    // Sample points immediately adjacent (1-2px outside) to avoid hitting adjacent table borders/cells
    const perimeterSamples = [
      getPixel(canvasX - 2 * dpr, topY + itemHPx * 0.5),          // immediate left
      getPixel(canvasX + itemWPx + 2 * dpr, topY + itemHPx * 0.5),// immediate right
      getPixel(canvasX + itemWPx * 0.2, topY - 1 * dpr),          // immediate top-left
      getPixel(canvasX + itemWPx * 0.8, topY - 1 * dpr),          // immediate top-right
      getPixel(canvasX + itemWPx * 0.2, canvasBaselineY + 1 * dpr),// immediate bottom-left
      getPixel(canvasX + itemWPx * 0.8, canvasBaselineY + 1 * dpr),// immediate bottom-right
    ].filter((p) => p.a > 50);

    // Sort perimeter samples by luminance to select median (eliminates border line contamination!)
    perimeterSamples.sort((a, b) => {
      const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
      const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
      return lumA - lumB;
    });

    const medianSample = perimeterSamples[Math.floor(perimeterSamples.length / 2)] || { r: 255, g: 255, b: 255 };
    const bgLum = (0.299 * medianSample.r + 0.587 * medianSample.g + 0.114 * medianSample.b) / 255;

    // Snap near-white paper (>0.82) to pure white (#ffffff)
    const sampledBgColor: ColorRgb =
      bgLum > 0.82
        ? { r: 255, g: 255, b: 255 }
        : { r: medianSample.r, g: medianSample.g, b: medianSample.b };

    const isDarkBg = bgLum < 0.5;

    // 2. Scan across the interior glyph area across 3 horizontal tracks to locate genuine text glyph strokes
    let bestGlyphColor: ColorRgb | null = null;
    let maxContrast = 0;

    const ySteps = [0.3, 0.5, 0.7];
    const xStepCount = Math.min(Math.max(Math.floor(itemWPx / 3), 4), 25);

    for (const yFrac of ySteps) {
      const sy = topY + itemHPx * yFrac;
      for (let i = 0; i <= xStepCount; i++) {
        const sx = canvasX + (itemWPx * i) / xStepCount;
        const p = getPixel(sx, sy);
        if (p.a < 100) continue;

        const pLum = (0.299 * p.r + 0.587 * p.g + 0.114 * p.b) / 255;
        // Directional contrast:
        // On light background, glyph strokes MUST be darker (bgLum - pLum > 0.22)
        // On dark background, glyph strokes MUST be lighter (pLum - bgLum > 0.22)
        const contrast = isDarkBg ? pLum - bgLum : bgLum - pLum;

        if (contrast > maxContrast && contrast > 0.22) {
          maxContrast = contrast;
          bestGlyphColor = { r: p.r, g: p.g, b: p.b };
        }
      }
    }

    // 3. Fallback and Strict Contrast Enforcement
    let sampledTextColor: ColorRgb;
    if (bestGlyphColor) {
      sampledTextColor = bestGlyphColor;
    } else {
      // High-contrast default fallback
      sampledTextColor = isDarkBg ? { r: 255, g: 255, b: 255 } : { r: 33, g: 37, b: 41 };
    }

    // Absolute contrast safeguard: Text color must NEVER blend into background color
    const textLum = (0.299 * sampledTextColor.r + 0.587 * sampledTextColor.g + 0.114 * sampledTextColor.b) / 255;
    if (Math.abs(bgLum - textLum) < 0.28) {
      sampledTextColor = bgLum > 0.5 ? { r: 33, g: 37, b: 41 } : { r: 255, g: 255, b: 255 };
    }

    result[item.id] = { sampledBgColor, sampledTextColor };
  }

  return result;
}
