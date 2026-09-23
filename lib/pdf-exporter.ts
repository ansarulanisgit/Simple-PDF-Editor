import 'regenerator-runtime/runtime';
import { PDFDocument, rgb, PDFFont, PDFName } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import pako from 'pako';
import { TextItemModel, ItemEditConfig } from './types';
import { decodeBengaliPua } from './bengali-pua';

let cachedRobotoFontBytes: ArrayBuffer | null = null;
let cachedBengaliFontBytes: ArrayBuffer | null = null;
let cachedLatinFontBytes: ArrayBuffer | null = null;

async function loadFontBytes(url: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to load font from ${url} (status: ${res.status})`);
    }
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

interface PageTextRecord {
  x: number;
  y: number;
  fontName: string | null;
  color: { r: number; g: number; b: number };
}

/**
 * Dynamically parses the page font mapping and content stream operators to determine
 * the exact original font family and text color for each text coordinate.
 */
function getPageTextRecords(pdfDoc: PDFDocument, pageIndex: number): PageTextRecord[] {
  try {
    const page = pdfDoc.getPage(pageIndex);
    const resources = page.node.Resources();
    const fontDict = resources ? resources.get(PDFName.of('Font')) : null;
    const fonts = fontDict ? pdfDoc.context.lookup(fontDict) : null;
    const fontMap: Record<string, string> = {};
    if (fonts && typeof (fonts as any).entries === 'function') {
      for (const [key, ref] of (fonts as any).entries()) {
        const fObj = pdfDoc.context.lookup(ref) as any;
        if (!fObj || typeof fObj.get !== 'function') continue;
        const baseFont = fObj.get(PDFName.of('BaseFont'));
        if (baseFont) {
          let nameStr = baseFont.asString ? baseFont.asString() : (baseFont.value || String(baseFont));
          nameStr = nameStr.replace(/^\//, '').replace(/^[A-Z]{6}\+/, '');
          const keyStr = key.asString ? key.asString() : (key.value || String(key));
          fontMap[keyStr.replace(/^\//, '')] = nameStr;
        }
      }
    }

    const contents = page.node.Contents();
    const raw = contents && typeof (contents as any).asUint8Array === 'function'
      ? (contents as any).asUint8Array()
      : null;
    if (!raw) return [];
    let inflated: Uint8Array;
    try {
      inflated = pako.inflate(raw);
    } catch {
      inflated = raw;
    }
    const str = Buffer.from(inflated).toString('latin1');
    const lines = str.split('\n');
    let curFont: string | null = null;
    let curColor = { r: 51, g: 51, b: 51 };
    const records: PageTextRecord[] = [];

    for (const line of lines) {
      const rgM = line.match(/([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+rg/);
      if (rgM) {
        curColor = {
          r: Math.round(parseFloat(rgM[1]) * 255),
          g: Math.round(parseFloat(rgM[2]) * 255),
          b: Math.round(parseFloat(rgM[3]) * 255),
        };
      }
      const tfM = line.match(/\/([^\s]+)\s+([0-9.]+)\s+Tf/);
      if (tfM) {
        curFont = fontMap[tfM[1]] || tfM[1];
      }
      const tdM = line.match(/([0-9.]+)\s+([0-9.]+)\s+T[dD]/);
      if (tdM) {
        records.push({
          x: parseFloat(tdM[1]),
          y: parseFloat(tdM[2]),
          fontName: curFont,
          color: curColor,
        });
      }
    }
    return records;
  } catch {
    return [];
  }
}

function findOriginalProperties(records: PageTextRecord[], pdfX: number, pdfY: number): PageTextRecord | null {
  let closest: PageTextRecord | null = null;
  let minDiff = Infinity;
  for (const r of records) {
    const diff = Math.abs(r.y - pdfY) * 2 + Math.abs(r.x - pdfX);
    if (diff < minDiff && Math.abs(r.y - pdfY) < 5.0) {
      minDiff = diff;
      closest = r;
    }
  }
  return closest;
}

interface ScriptSegment {
  text: string;
  font: PDFFont;
}

/**
 * Splits text into segments suitable for Latin vs Bengali font rendering,
 * ensuring English digits and Latin characters dynamically use the exact font family
 * (e.g. Roboto Regular) and Bengali text renders with Noto Serif Bengali.
 */
function getScriptSegments(
  text: string,
  bengaliFont: PDFFont | null,
  latinFont: PDFFont
): ScriptSegment[] {
  if (!bengaliFont || !/[\u0980-\u09FF]/.test(text)) {
    return [{ text, font: latinFont }];
  }
  if (!/[A-Za-z0-9]/.test(text)) {
    return [{ text, font: bengaliFont }];
  }

  // Common ticket pattern: English/Latin prefix followed by (Bengali text)
  // E.g. "RUPSHA EXPRESS [758] (রুপসা এক্সপ্রেস [৭৫৮])" or "28-09-2026 12:40 (২৮-০৯-২০২৬ ১২:৪০)" or "S_CHAIR (শো.চেয়ার)"
  const parenMatch = text.match(/^([\s\S]*?)(\s*\([^\)]*[\u0980-\u09FF][^\)]*\)[\s\S]*)$/);
  if (parenMatch && parenMatch[2]) {
    const res: ScriptSegment[] = [];
    if (parenMatch[1]) {
      res.push({ text: parenMatch[1], font: latinFont });
    }
    res.push({ text: parenMatch[2], font: bengaliFont });
    return res;
  }

  // General token split on Bengali script boundaries
  const tokens = text.match(/[\u0980-\u09FF]+|[^\u0980-\u09FF]+/g) || [text];
  const segments: ScriptSegment[] = [];
  for (const tok of tokens) {
    const isBen = /[\u0980-\u09FF]/.test(tok);
    segments.push({
      text: tok,
      font: isBen ? bengaliFont : latinFont,
    });
  }
  return segments;
}

/**
 * Renders a snippet of Bengali Unicode text to a high-resolution PNG using
 * the browser's native HarfBuzz text shaper.
 * This completely avoids pdf-lib / fontkit advance width bugs with Bengali pre-base vowels (e-kar, i-kar)
 * and produces 100% connected, razor-sharp Bengali typography with ZERO unwanted spaces.
 */
async function renderBengaliSnippetToPng(
  text: string,
  fontSizePt: number,
  color: { r: number; g: number; b: number }
): Promise<{ pngBytes: Uint8Array; widthPt: number; heightPt: number; baselineYPt: number }> {
  // Ensure document fonts are loaded in browser
  if (typeof document !== 'undefined' && (document as any).fonts) {
    try {
      await (document as any).fonts.ready;
      await Promise.allSettled([
        (document as any).fonts.load(`${fontSizePt}px "Noto Serif Bengali"`),
        (document as any).fonts.load(`${fontSizePt}px "SolaimanLipiNormal"`),
        (document as any).fonts.load(`${fontSizePt}px "SolaimanLipi"`),
        (document as any).fonts.load(`${fontSizePt}px "Roboto"`),
      ]);
    } catch {}
  }

  const dpr = 4; // 4x oversampling (300+ DPI print quality for razor-sharp vector-like rendering)
  const padPt = 4; // 4pt margin around snippet to prevent any glyph clipping
  const padPx = Math.ceil(padPt * dpr);

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
  } else {
    throw new Error('Canvas not supported in non-browser environment');
  }

  if (!ctx) {
    throw new Error('Could not obtain 2D canvas context');
  }

  const fontStyle = `${fontSizePt}px 'Roboto', 'Noto Serif Bengali', 'SolaimanLipiNormal', 'SolaimanLipi', 'Noto Sans Bengali', Arial, sans-serif`;
  ctx.font = fontStyle;
  const metrics = ctx.measureText(text);

  const textWidthPt = metrics.width;
  const widthPt = textWidthPt + padPt * 2 + 4;
  const widthPx = Math.ceil(widthPt * dpr);

  const heightPt = fontSizePt * 1.8 + padPt * 2;
  const heightPx = Math.ceil(heightPt * dpr);

  canvas.width = widthPx;
  canvas.height = heightPx;

  const renderCtx = canvas.getContext('2d');
  if (!renderCtx) throw new Error('Failed to get 2D render context');

  renderCtx.scale(dpr, dpr);
  renderCtx.font = fontStyle;
  renderCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
  renderCtx.textBaseline = 'alphabetic';

  const baselineYPt = fontSizePt * 1.25 + padPt;
  renderCtx.fillText(text, padPt, baselineYPt);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });

  if (!blob) {
    throw new Error('Failed to create PNG blob from canvas');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const pngBytes = new Uint8Array(arrayBuffer);

  return {
    pngBytes,
    widthPt,
    heightPt,
    baselineYPt,
  };
}

export async function exportModifiedPdf(
  originalPdfBuffer: ArrayBuffer,
  items: TextItemModel[],
  configsMap: Record<string, ItemEditConfig | string>,
  fileName: string = 'edited-document.pdf'
): Promise<Blob> {
  // 1. Clone original buffer slice to ensure a fresh, non-detached ArrayBuffer
  const bufferCopy = originalPdfBuffer.slice(0);
  const pdfDoc = await PDFDocument.load(bufferCopy);

  // 2. Register fontkit to enable custom Unicode TrueType font embedding
  pdfDoc.registerFontkit(fontkit);

  // 3. Load font buffers if not already cached
  if (!cachedRobotoFontBytes) {
    try {
      cachedRobotoFontBytes = await loadFontBytes('/fonts/Roboto-Regular.ttf');
    } catch (e) {
      console.warn('Could not load Roboto-Regular.ttf, falling back:', e);
    }
  }

  if (!cachedBengaliFontBytes) {
    try {
      cachedBengaliFontBytes = await loadFontBytes('/fonts/NotoSerifBengali-Regular.ttf');
    } catch (e1) {
      console.warn('Could not load NotoSerifBengali-Regular.ttf, falling back:', e1);
      try {
        cachedBengaliFontBytes = await loadFontBytes('/fonts/SolaimanLipiNormal.ttf');
      } catch (e2) {
        try {
          cachedBengaliFontBytes = await loadFontBytes('/fonts/NotoSansBengali-Regular.ttf');
        } catch (e3) {
          console.warn('Could not load Bengali font:', e3);
        }
      }
    }
  }

  if (!cachedLatinFontBytes) {
    try {
      cachedLatinFontBytes = await loadFontBytes('/fonts/NotoSans-Regular.ttf');
    } catch (e) {
      console.warn('Could not load NotoSans-Regular.ttf, falling back:', e);
    }
  }

  // 4. Embed fonts into the PDF document
  let robotoFont: PDFFont | null = null;
  let bengaliFont: PDFFont | null = null;
  let latinFont: PDFFont | null = null;

  if (cachedRobotoFontBytes) {
    try {
      robotoFont = await pdfDoc.embedFont(cachedRobotoFontBytes.slice(0));
    } catch (e) {
      console.warn('Failed to embed Roboto font:', e);
    }
  }

  if (cachedBengaliFontBytes) {
    try {
      bengaliFont = await pdfDoc.embedFont(cachedBengaliFontBytes.slice(0));
    } catch (e) {
      console.warn('Failed to embed Bengali font:', e);
    }
  }

  if (cachedLatinFontBytes) {
    try {
      latinFont = await pdfDoc.embedFont(cachedLatinFontBytes.slice(0));
    } catch (e) {
      console.warn('Failed to embed Latin font:', e);
    }
  }

  const standardFont = robotoFont || latinFont || (await pdfDoc.embedFont('Helvetica'));
  const pdfPages = pdfDoc.getPages();

  // Cache parsed page text records (exact font and exact original color per item)
  const pageRecordsCache: Record<number, PageTextRecord[]> = {};

  // 5. Draw modified items:
  // Original content streams remain 100% untouched and pristine so unedited text
  // across the entire document is never corrupted.
  // Replacement text matches original font family, size, color, and baseline position.
  for (const item of items) {
    const rawVal = configsMap[item.id];
    const currentVal = typeof rawVal === 'string' ? rawVal : (rawVal?.text ?? item.originalText);
    const customFontSize = typeof rawVal === 'object' ? rawVal?.fontSize : undefined;
    const extraWidthPoints = typeof rawVal === 'object' ? (rawVal?.extraWidth || 0) : 0;

    const currentFontSize = (customFontSize !== undefined && customFontSize > 0)
      ? customFontSize
      : item.fontSize;

    const isModified =
      currentVal !== item.originalText ||
      (customFontSize !== undefined && Math.abs(customFontSize - item.fontSize) > 0.05) ||
      extraWidthPoints > 0;

    if (!isModified || item.pageIndex < 0 || item.pageIndex >= pdfPages.length) {
      continue;
    }

    const page = pdfPages[item.pageIndex];
    if (!pageRecordsCache[item.pageIndex]) {
      pageRecordsCache[item.pageIndex] = getPageTextRecords(pdfDoc, item.pageIndex);
    }
    const pageRecords = pageRecordsCache[item.pageIndex];
    const origProps = findOriginalProperties(pageRecords, item.pdfX, item.pdfY);

    const normalizedVal = decodeBengaliPua(currentVal);
    const trimmed = normalizedVal.trim();

    // Dynamically choose font based on the original document's detected font:
    // If the original font was Roboto (e.g. Bangladesh Railway tickets), use Roboto Regular.
    // If another standard font was used, use latinFont or standardFont.
    let activeLatinFont = standardFont;
    if (origProps?.fontName) {
      const fn = origProps.fontName.toLowerCase();
      if (fn.includes('roboto') && robotoFont) {
        activeLatinFont = robotoFont;
      } else if (latinFont) {
        activeLatinFont = latinFont;
      }
    } else if (robotoFont) {
      activeLatinFont = robotoFont;
    }

    // Determine segments and matching fonts (Roboto Regular for Latin, Noto Serif Bengali for Bengali)
    const segments = getScriptSegments(normalizedVal, bengaliFont, activeLatinFont);

    // Calculate total text width across segments
    let totalTextWidth = 0;
    for (const seg of segments) {
      try {
        totalTextWidth += seg.font.widthOfTextAtSize(seg.text, currentFontSize);
      } catch {
        totalTextWidth += seg.text.length * currentFontSize * 0.55;
      }
    }

    // Color sampling & matching
    const bg = item.sampledBgColor || { r: 255, g: 255, b: 255 };
    const bgLuminance = (0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b) / 255;
    const isDarkBg = bgLuminance < 0.5;

    // Erase rectangle color:
    // If background is white/light paper (>0.82), use pure white rgb(1, 1, 1)
    // If background is dark (e.g. green banner), match exact background rgb
    const rectColor = bgLuminance > 0.82
      ? rgb(1, 1, 1)
      : rgb(bg.r / 255, bg.g / 255, bg.b / 255);

    // Exact text color from original PDF stream:
    // If the original operator color is parsed, use it directly!
    // Otherwise fallback to sampledTextColor or dark charcoal.
    let chosenColor = origProps?.color || item.sampledTextColor;
    if (chosenColor) {
      const cLum = (0.299 * chosenColor.r + 0.587 * chosenColor.g + 0.114 * chosenColor.b) / 255;
      if (Math.abs(bgLuminance - cLum) < 0.28) {
        chosenColor = isDarkBg ? { r: 255, g: 255, b: 255 } : { r: 33, g: 37, b: 41 };
      }
    } else {
      chosenColor = isDarkBg ? { r: 255, g: 255, b: 255 } : { r: 33, g: 37, b: 41 };
    }
    const textRgb = rgb(chosenColor.r / 255, chosenColor.g / 255, chosenColor.b / 255);

    // 1. Check if text contains Bengali characters
    const hasBengali = /[\u0980-\u09FF]/.test(normalizedVal);
    let renderedPngInfo: { pngBytes: Uint8Array; widthPt: number; heightPt: number; baselineYPt: number } | null = null;

    if (trimmed.length > 0 && hasBengali && typeof document !== 'undefined') {
      try {
        renderedPngInfo = await renderBengaliSnippetToPng(normalizedVal, currentFontSize, chosenColor);
      } catch (e) {
        console.warn('Canvas text render failed for Bengali snippet:', e);
      }
    }

    const calculatedWidth = renderedPngInfo ? (renderedPngInfo.widthPt - 8) : totalTextWidth;
    const eraseX = item.pdfX - 1.5;
    const eraseY = item.pdfY - currentFontSize * 0.35;
    const eraseHeight = currentFontSize * 1.45;
    const eraseWidth = Math.max(item.pdfWidth, calculatedWidth) + 4 + extraWidthPoints;

    page.drawRectangle({
      x: eraseX,
      y: eraseY,
      width: eraseWidth,
      height: eraseHeight,
      color: rectColor,
    });

    // 2. Draw replacement text
    if (trimmed.length > 0) {
      if (renderedPngInfo) {
        // High-resolution HarfBuzz native Bengali text rendering (ZERO unwanted spaces, ZERO broken fonts!)
        const embeddedImg = await pdfDoc.embedPng(renderedPngInfo.pngBytes);
        const imgY = item.pdfY - (renderedPngInfo.heightPt - renderedPngInfo.baselineYPt);
        page.drawImage(embeddedImg, {
          x: item.pdfX - 4,
          y: imgY,
          width: renderedPngInfo.widthPt,
          height: renderedPngInfo.heightPt,
        });
      } else {
        // Pure Latin / ASCII text: draw with crisp vector font
        let curX = item.pdfX;
        for (const seg of segments) {
          if (!seg.text) continue;
          try {
            page.drawText(seg.text, {
              x: curX,
              y: item.pdfY,
              size: currentFontSize,
              font: seg.font,
              color: textRgb,
            });
            curX += seg.font.widthOfTextAtSize(seg.text, currentFontSize);
          } catch (drawErr) {
            console.error(`Error drawing segment "${seg.text}":`, drawErr);
            try {
              page.drawText(seg.text, {
                x: curX,
                y: item.pdfY,
                size: currentFontSize,
                font: standardFont,
                color: textRgb,
              });
              curX += standardFont.widthOfTextAtSize(seg.text, currentFontSize);
            } catch (e2) {}
          }
        }
      }
    }
  }

  // 6. Save modified PDF bytes and return Blob
  const modifiedBytes = await pdfDoc.save();
  return new Blob([modifiedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
