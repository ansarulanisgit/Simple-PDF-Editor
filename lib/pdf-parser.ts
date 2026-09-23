import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api';
import { TextItemModel, PageInfo } from './types';
import { decodeBengaliPua } from './bengali-pua';

let pdfjsLibInstance: typeof import('pdfjs-dist') | null = null;

export async function getPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be loaded in the browser');
  }

  if (!pdfjsLibInstance) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    pdfjsLibInstance = pdfjs;
  }

  return pdfjsLibInstance;
}

export async function loadPdfDocument(arrayBuffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  // Pass a cloned slice so the original buffer is never transferred or detached by the PDF.js Web Worker
  const bufferSlice = arrayBuffer.slice(0);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bufferSlice),
    cMapUrl: '/cmaps/',
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

export async function extractDocumentPagesInfo(pdfDoc: PDFDocumentProxy): Promise<PageInfo[]> {
  const pages: PageInfo[] = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    pages.push({
      pageIndex: i - 1,
      pdfWidth: viewport.width,
      pdfHeight: viewport.height,
      aspectRatio: viewport.width / viewport.height,
    });
  }
  return pages;
}

export async function extractPageTextRuns(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number,
  groupLines: boolean = true
): Promise<TextItemModel[]> {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const textContent = await page.getTextContent();

  const rawItems: TextItemModel[] = [];

  textContent.items.forEach((item, idx) => {
    if (!('str' in item)) {
      return;
    }

    const textItem = item as TextItem;
    // Decode any Shohoz/Bangladesh Railway PUA custom characters
    const decodedStr = decodeBengaliPua(textItem.str);

    // Skip pure empty whitespace runs (e.g. spacer runs between columns)
    if (!decodedStr || decodedStr.trim().length === 0) {
      return;
    }

    const transform = textItem.transform;
    const scaleX = transform[0];
    const skewY = transform[1];
    const scaleY = transform[3];
    const tx = transform[4]; // PDF x coordinate (points)
    const ty = transform[5]; // PDF y coordinate (points, baseline)

    const fontSize = Math.sqrt(scaleX * scaleX + skewY * skewY) || Math.abs(scaleY) || 10;
    const width = textItem.width || (decodedStr.length * fontSize * 0.55);
    const height = textItem.height || fontSize;

    rawItems.push({
      id: `p${pageIndex}_item_${idx}`,
      pageIndex,
      originalText: decodedStr,
      currentText: decodedStr,
      pdfX: tx,
      pdfY: ty,
      pdfWidth: width,
      pdfHeight: height,
      fontSize: fontSize,
      fontName: textItem.fontName,
      isGrouped: false,
      subItemCount: 1,
    });
  });

  if (!groupLines) {
    return rawItems;
  }

  // --- Contiguous Line Run Grouping ---
  // Group adjacent word runs on the SAME line within the SAME column/cell.
  // We strictly limit max horizontal gap so table columns never accidentally merge.

  // Sort by Y descending (top to bottom), then X ascending (left to right)
  const sorted = [...rawItems].sort((a, b) => {
    const yDiff = b.pdfY - a.pdfY;
    if (Math.abs(yDiff) > 2.0) {
      return yDiff;
    }
    return a.pdfX - b.pdfX;
  });

  const grouped: TextItemModel[] = [];
  let currentGroup: TextItemModel | null = null;
  let groupCounter = 0;

  for (const item of sorted) {
    if (!currentGroup) {
      currentGroup = {
        ...item,
        id: `p${pageIndex}_grp_${groupCounter++}`,
        isGrouped: true,
        subItemCount: 1,
      };
      continue;
    }

    const sameY = Math.abs(item.pdfY - currentGroup.pdfY) <= 2.2;
    const prevRight = currentGroup.pdfX + currentGroup.pdfWidth;
    const gap = item.pdfX - prevRight;
    const sameFontSize = Math.abs(item.fontSize - currentGroup.fontSize) <= 3.0;

    // Strict adjacency threshold:
    // A normal inter-word space is 2 to 5 points.
    // If the gap is > 6.0 points, it indicates a separate table column or distinct data field.
    const maxGap = Math.min(Math.max(currentGroup.fontSize * 0.45, 3.0), 6.5);
    const isAdjacent = gap >= -3.0 && gap <= maxGap;

    if (sameY && isAdjacent && sameFontSize) {
      // Concatenate text, ensuring a single space if there's a visible gap
      const needsSpace =
        gap > 1.2 &&
        !currentGroup.originalText.endsWith(' ') &&
        !item.originalText.startsWith(' ');

      const combinedText = currentGroup.originalText + (needsSpace ? ' ' : '') + item.originalText;
      const newWidth = Math.max(item.pdfX + item.pdfWidth - currentGroup.pdfX, currentGroup.pdfWidth + item.pdfWidth);

      currentGroup.originalText = combinedText;
      currentGroup.currentText = combinedText;
      currentGroup.pdfWidth = newWidth;
      currentGroup.pdfHeight = Math.max(currentGroup.pdfHeight, item.pdfHeight);
      currentGroup.fontSize = Math.max(currentGroup.fontSize, item.fontSize);
      currentGroup.subItemCount = (currentGroup.subItemCount || 1) + 1;
    } else {
      grouped.push(currentGroup);
      currentGroup = {
        ...item,
        id: `p${pageIndex}_grp_${groupCounter++}`,
        isGrouped: true,
        subItemCount: 1,
      };
    }
  }

  if (currentGroup) {
    grouped.push(currentGroup);
  }

  return grouped;
}
