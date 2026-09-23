import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  RotateCcw,
} from 'lucide-react';

interface ToolbarProps {
  currentPage: number;
  numPages: number;
  onPageChange: (newPage: number) => void;
  scale: number;
  onScaleChange: (newScale: number) => void;
  onFitWidth: () => void;
  canReset: boolean;
  onReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function Toolbar({
  currentPage,
  numPages,
  onPageChange,
  scale,
  onScaleChange,
  onFitWidth,
  canReset,
  onReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: ToolbarProps) {
  const zoomIn = () => {
    onScaleChange(Math.min(3.0, Number((scale + 0.2).toFixed(2))));
  };

  const zoomOut = () => {
    onScaleChange(Math.max(0.4, Number((scale - 0.2).toFixed(2))));
  };

  return (
    <div className="sticky top-14 sm:top-16 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs px-2 sm:px-4 py-1.5 sm:py-2 transition-colors overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3 text-xs min-w-max sm:min-w-0">
        {/* Page Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-xl shrink-0">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 0}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 select-none whitespace-nowrap">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{currentPage + 1}</span>
            <span className="text-slate-400 mx-0.5">/</span>
            <span>{numPages}</span>
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= numPages - 1}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-xl shrink-0">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.4}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onFitWidth}
            className="px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Fit to Screen Width"
          >
            <Maximize2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden xs:inline">Fit</span>
            <span>({Math.round(scale * 100)}%)</span>
          </button>

          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Separate Action Buttons: Reset, Undo, Redo */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Reset Button */}
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            className="h-7 sm:h-8 px-2 sm:px-2.5 flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer active:scale-95"
            title="Reset all edits"
            aria-label="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span className="text-[11px] sm:text-xs font-semibold">Reset</span>
          </button>

          {/* Undo Button */}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer active:scale-95"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 dark:text-slate-200" />
          </button>

          {/* Redo Button */}
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer active:scale-95"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 dark:text-slate-200" />
          </button>
        </div>
      </div>
    </div>
  );
}
