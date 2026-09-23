import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import { TextItemModel, PageInfo, ItemEditConfig, ColorRgb } from '@/lib/types';
import { RotateCcw, Edit2, GripVertical } from 'lucide-react';
import { sampleColorsForItems } from '@/lib/color-sampler';

interface PdfPageViewerProps {
  pdfDoc: PDFDocumentProxy;
  pageIndex: number;
  pageInfo: PageInfo;
  items: TextItemModel[];
  configsMap: Record<string, ItemEditConfig>;
  onItemClick: (item: TextItemModel) => void;
  onResetField: (id: string) => void;
  onUpdateExtraWidth: (id: string, extraWidth: number) => void;
  onColorsSampled?: (colorsMap: Record<string, { sampledBgColor: ColorRgb; sampledTextColor: ColorRgb }>) => void;
  scale: number;
}

export function PdfPageViewer({
  pdfDoc,
  pageIndex,
  pageInfo,
  items,
  configsMap,
  onItemClick,
  onResetField,
  onUpdateExtraWidth,
  onColorsSampled,
  scale,
}: PdfPageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const resizeStartRef = useRef<{ startX: number; initialExtraWidth: number } | null>(null);
  const colorsSampledPageIndexRef = useRef<number | null>(null);

  // Keep references to latest props to prevent re-triggering PDF.js rendering
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const configsMapRef = useRef(configsMap);
  configsMapRef.current = configsMap;
  const pageInfoRef = useRef(pageInfo);
  pageInfoRef.current = pageInfo;
  const onColorsSampledRef = useRef(onColorsSampled);
  onColorsSampledRef.current = onColorsSampled;

  // Repaint canvas with edits directly onto the visible canvas
  const drawEditsOnCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!canvas || !baseCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Reset visible canvas to pristine original PDF page render
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
    const currentItems = itemsRef.current;
    const currentConfigs = configsMapRef.current;
    const currentPageInfo = pageInfoRef.current;

    for (const item of currentItems) {
      const config = currentConfigs[item.id];
      if (!config) continue;

      const currentValue = config.text !== undefined ? config.text : item.originalText;
      const isEdited =
        currentValue !== item.originalText ||
        (config.fontSize && Math.abs(config.fontSize - item.fontSize) > 0.05) ||
        (config.extraWidth && config.extraWidth > 0);
      if (!isEdited) continue;

      // Coordinate calculation
      const canvasX = item.pdfX * scale;
      const canvasY = (currentPageInfo.pdfHeight - item.pdfY) * scale;
      const fontPt = config.fontSize || item.fontSize;
      const fontPx = fontPt * scale;
      const extraW = (config.extraWidth || 0) * scale;
      const itemWPx = item.pdfWidth * scale + extraW;
      const itemHPx = fontPx * 1.25;
      const topY = canvasY - fontPx * 0.88;

      // Physical pixel coordinates on baseCanvas
      const physX = Math.round(canvasX * dpr);
      const physTopY = Math.round(topY * dpr);
      const physW = Math.round(itemWPx * dpr);
      const physH = Math.round(itemHPx * dpr);
      const physBaselineY = Math.round(canvasY * dpr);

      let bgTop = item.sampledBgColor || { r: 255, g: 255, b: 255 };
      let bgBottom = item.sampledBgColor || { r: 255, g: 255, b: 255 };
      let textCol = item.sampledTextColor || { r: 33, g: 37, b: 41 };

      // If not yet sampled, sample from base canvas
      if (!item.sampledBgColor && baseCtx) {
        try {
          const sampleX = Math.min(baseCanvas.width - 1, Math.max(0, physX));
          const sampleY = Math.max(0, physTopY - 2);
          const p = baseCtx.getImageData(sampleX, sampleY, 1, 1).data;
          const lum = (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
          if (lum > 0.82) {
            bgTop = { r: 255, g: 255, b: 255 };
            bgBottom = { r: 255, g: 255, b: 255 };
            textCol = { r: 33, g: 37, b: 41 };
          } else {
            bgTop = { r: p[0], g: p[1], b: p[2] };
            bgBottom = { r: p[0], g: p[1], b: p[2] };
            textCol = lum < 0.5 ? { r: 255, g: 255, b: 255 } : { r: 15, g: 23, b: 42 };
          }
        } catch (e) {}
      }

      // Enforce high-contrast readability so text NEVER matches or blends with background
      const bgLum = (0.299 * bgTop.r + 0.587 * bgTop.g + 0.114 * bgTop.b) / 255;
      const textLum = (0.299 * textCol.r + 0.587 * textCol.g + 0.114 * textCol.b) / 255;
      if (Math.abs(bgLum - textLum) < 0.28) {
        textCol = bgLum > 0.5 ? { r: 33, g: 37, b: 41 } : { r: 255, g: 255, b: 255 };
      }

      // Erase original glyphs using seamless gradient matching exact background
      const eraseW = Math.max(itemWPx + 3, 10);
      const eraseH = itemHPx + 2;
      const eraseX = canvasX - 1.5;
      const eraseY = topY - 1;

      const grad = ctx.createLinearGradient(0, eraseY, 0, eraseY + eraseH);
      grad.addColorStop(0, `rgb(${bgTop.r}, ${bgTop.g}, ${bgTop.b})`);
      grad.addColorStop(1, `rgb(${bgBottom.r}, ${bgBottom.g}, ${bgBottom.b})`);
      ctx.fillStyle = grad;
      ctx.fillRect(eraseX, eraseY, eraseW, eraseH);

      // Draw replacement text natively on canvas
      if (currentValue && currentValue.trim().length > 0) {
        ctx.fillStyle = `rgb(${textCol.r}, ${textCol.g}, ${textCol.b})`;
        ctx.font = `${fontPx}px 'Roboto', 'Noto Serif Bengali', 'SolaimanLipiNormal', 'SolaimanLipi', 'Noto Sans Bengali', Arial, sans-serif`;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(currentValue, canvasX, canvasY);
      }
    }
  }, [scale]);

  // Redraw canvas edits once browser fonts are fully loaded
  useEffect(() => {
    if (typeof document !== 'undefined' && (document as any).fonts) {
      (document as any).fonts.ready.then(() => {
        drawEditsOnCanvas();
      });
    }
  }, [drawEditsOnCanvas]);

  // PDF.js Page Rendering: Strictly dependent on pdfDoc, pageIndex, and scale ONLY
  useEffect(() => {
    let cancelRender = false;
    let renderTask: any = null;

    async function renderPage() {
      if (!canvasRef.current) return;
      setIsRendering(true);

      try {
        const page: PDFPageProxy = await pdfDoc.getPage(pageIndex + 1);
        if (cancelRender) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const widthPx = Math.floor(viewport.width * dpr);
        const heightPx = Math.floor(viewport.height * dpr);

        // Size the visible canvas
        canvas.width = widthPx;
        canvas.height = heightPx;
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        // Render PDF page into base offscreen canvas
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = widthPx;
        baseCanvas.height = heightPx;

        const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
        if (!baseCtx) return;

        baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        renderTask = page.render({
          canvasContext: baseCtx,
          viewport: viewport,
        });

        await renderTask.promise;
        if (cancelRender) return;

        baseCanvasRef.current = baseCanvas;

        // Copy rendered page to visible canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(baseCanvas, 0, 0);
        }

        // Sample colors once if items are available
        const currentItems = itemsRef.current;
        if (currentItems.length > 0 && onColorsSampledRef.current) {
          const colors = sampleColorsForItems(baseCanvas, currentItems, pageInfoRef.current, scale);
          onColorsSampledRef.current(colors);
          colorsSampledPageIndexRef.current = pageIndex;
        }

        // Draw any active edits onto the canvas
        drawEditsOnCanvas();
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page canvas:', err);
        }
      } finally {
        if (!cancelRender) {
          setIsRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      cancelRender = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {}
      }
      if (baseCanvasRef.current) {
        baseCanvasRef.current.width = 0;
        baseCanvasRef.current.height = 0;
        baseCanvasRef.current = null;
      }
    };
  }, [pdfDoc, pageIndex, scale, drawEditsOnCanvas]);

  // Fast edit updates & color sampling whenever edits or items change (NO PDF.js re-render!)
  useEffect(() => {
    if (!isRendering && baseCanvasRef.current) {
      drawEditsOnCanvas();

      // Sample colors once when items finish loading
      if (items.length > 0 && colorsSampledPageIndexRef.current !== pageIndex && onColorsSampledRef.current) {
        const colors = sampleColorsForItems(baseCanvasRef.current, items, pageInfoRef.current, scale);
        onColorsSampledRef.current(colors);
        colorsSampledPageIndexRef.current = pageIndex;
      }
    }
  }, [configsMap, items, isRendering, pageIndex, scale, drawEditsOnCanvas]);

  // Mouse & Touch dragging to extend field width
  const handleMouseDownResize = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingItemId(itemId);
    const initialExtra = configsMap[itemId]?.extraWidth || 0;
    resizeStartRef.current = {
      startX: e.clientX,
      initialExtraWidth: initialExtra,
    };
  };

  const handleTouchStartResize = (e: React.TouchEvent, itemId: string) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      setResizingItemId(itemId);
      const initialExtra = configsMap[itemId]?.extraWidth || 0;
      resizeStartRef.current = {
        startX: e.touches[0].clientX,
        initialExtraWidth: initialExtra,
      };
    }
  };

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!resizingItemId || !resizeStartRef.current) return;
      const deltaPx = clientX - resizeStartRef.current.startX;
      const deltaPoints = deltaPx / scale;
      const newExtraWidth = Math.max(0, Math.round(resizeStartRef.current.initialExtraWidth + deltaPoints));
      onUpdateExtraWidth(resizingItemId, newExtraWidth);
    },
    [resizingItemId, scale, onUpdateExtraWidth]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handlePointerMove(e.clientX);
    },
    [handlePointerMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handlePointerMove(e.touches[0].clientX);
      }
    },
    [handlePointerMove]
  );

  const handlePointerEnd = useCallback(() => {
    setResizingItemId(null);
    resizeStartRef.current = null;
  }, []);

  useEffect(() => {
    if (resizingItemId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handlePointerEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handlePointerEnd);
      window.addEventListener('blur', handlePointerEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handlePointerEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handlePointerEnd);
        window.removeEventListener('blur', handlePointerEnd);
      };
    }
  }, [resizingItemId, handleMouseMove, handleTouchMove, handlePointerEnd]);

  const canvasWidthPx = Math.floor(pageInfo.pdfWidth * scale);
  const canvasHeightPx = Math.floor(pageInfo.pdfHeight * scale);

  return (
    <div className="relative flex justify-center p-1 sm:p-6 select-none overflow-x-auto">
      {/* Outer Paper Container */}
      <div
        className="relative bg-white shadow-xl shadow-slate-300 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 transition-all rounded-xs overflow-hidden shrink-0"
        style={{
          width: `${canvasWidthPx}px`,
          height: `${canvasHeightPx}px`,
        }}
      >
        {/* Rendered Canvas Layer */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block pointer-events-none"
        />

        {/* Loading Overlay */}
        {isRendering && (
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-50 transition-opacity">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-sm border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200">
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Rendering Page {pageIndex + 1}...</span>
            </div>
          </div>
        )}

        {/* 100% Transparent Clickable Overlay Layer: Zero background color, zero visible boxes */}
        <div className="absolute inset-0 pointer-events-auto">
          {items.map((item) => {
            const config = configsMap[item.id];
            const currentValue = config?.text !== undefined ? config.text : item.originalText;
            const currentFontSize = config?.fontSize || item.fontSize;
            const extraWidthPoints = config?.extraWidth || 0;

            const isEdited =
              currentValue !== item.originalText ||
              (config?.fontSize && config.fontSize !== item.fontSize) ||
              extraWidthPoints > 0;

            const isHovered = hoveredId === item.id || resizingItemId === item.id;

            // Coordinate conversion
            const canvasYBaseline = (pageInfo.pdfHeight - item.pdfY) * scale;
            const textTopPx = canvasYBaseline - currentFontSize * scale * 0.86;
            const leftPx = item.pdfX * scale;

            // Width calculation
            const baseWidthPx = item.pdfWidth * scale;
            const userExtraWidthPx = extraWidthPoints * scale;
            const widthPx = Math.max(baseWidthPx + 4, 22) + userExtraWidthPx;

            const heightPx = Math.max(currentFontSize * scale * 1.25, 14);

            // Minimum 24px touch height for mobile fingers
            const minTouchHeight = Math.max(heightPx, 24);
            const topPx = textTopPx - Math.max(0, (minTouchHeight - heightPx) / 2);

            let zIndex = 10;
            if (isEdited) zIndex = 25;
            if (isHovered) zIndex = 35;
            if (resizingItemId === item.id) zIndex = 50;

            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                title={
                  isEdited
                    ? `Tap to edit (Original: "${item.originalText}")`
                    : `Tap to edit "${item.originalText}"`
                }
                className={`absolute transition-colors rounded-xs cursor-pointer group flex items-center touch-manipulation select-none ${
                  isHovered
                    ? 'border border-emerald-500/60 bg-transparent'
                    : 'border border-transparent bg-transparent'
                }`}
                style={{
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  width: `${widthPx}px`,
                  height: `${minTouchHeight}px`,
                  zIndex,
                  backgroundColor: 'transparent',
                }}
              >
                {/* Subtle Edit hint icon on hover only */}
                {isHovered && (
                  <div className="absolute -top-3.5 -right-3.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs z-30 pointer-events-none">
                    <Edit2 className="w-2.5 h-2.5" />
                  </div>
                )}

                {/* Right-edge Draggable Extension Handle */}
                {isEdited && isHovered && (
                  <div
                    onMouseDown={(e) => handleMouseDownResize(e, item.id)}
                    onTouchStart={(e) => handleTouchStartResize(e, item.id)}
                    title="Drag to extend width"
                    className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/40 transition touch-none"
                  >
                    <GripVertical className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
                  </div>
                )}

                {/* Inline Revert Button for Modified Fields on hover */}
                {isEdited && isHovered && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onResetField(item.id);
                    }}
                    title={`Revert to: "${item.originalText}"`}
                    className="absolute -top-3.5 -right-3.5 w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition z-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
