import React, { useState, useEffect, useRef } from 'react';
import { X, Check, RotateCcw, Edit3, MoveHorizontal, Minus, Plus, Type } from 'lucide-react';
import { TextItemModel, ItemEditConfig } from '@/lib/types';

interface TextEditModalProps {
  isOpen: boolean;
  item: TextItemModel | null;
  currentConfig?: ItemEditConfig;
  onClose: () => void;
  onSave: (config: ItemEditConfig) => void;
  onRevert?: () => void;
}

export function TextEditModal({
  isOpen,
  item,
  currentConfig,
  onClose,
  onSave,
  onRevert,
}: TextEditModalProps) {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState<number>(10);
  const [extraWidth, setExtraWidth] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && item) {
      setText(currentConfig?.text ?? item.originalText);
      setFontSize(currentConfig?.fontSize ?? Math.round(item.fontSize * 10) / 10);
      setExtraWidth(currentConfig?.extraWidth ?? 0);

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, item, currentConfig]);

  if (!isOpen || !item) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSave = () => {
    const origRounded = Math.round(item.fontSize * 10) / 10;
    const clampedFontSize = Math.min(72, Math.max(4, Number(fontSize) || origRounded));
    const clampedExtraWidth = Math.min(500, Math.max(0, Number(extraWidth) || 0));
    const isCustomSize = Math.abs(clampedFontSize - origRounded) > 0.05;
    onSave({
      text,
      fontSize: isCustomSize ? clampedFontSize : undefined,
      extraWidth: clampedExtraWidth,
    });
    onClose();
  };

  const isOriginalChanged =
    (currentConfig?.text && currentConfig.text !== item.originalText) ||
    (currentConfig?.fontSize && currentConfig.fontSize !== item.fontSize) ||
    (currentConfig?.extraWidth && currentConfig.extraWidth > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-all max-h-[92vh] overflow-y-auto space-y-4 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden flex justify-center -mt-2 mb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header: Close button ONLY icon */}
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold truncate">Edit Text & Dimensions</h3>
              <p className="text-[11px] text-slate-400 truncate">Tap Update when finished</p>
            </div>
          </div>

          {/* Close button: Icon ONLY with large touch target (44x44px) */}
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-3.5">
          {/* Original Text Reference: Clean neutral styling without any background color */}
          <div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Original Document Text
            </span>
            <div
              className="mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 select-text break-words"
              style={{
                fontFamily: "'Roboto', 'Noto Serif Bengali', 'SolaimanLipiNormal', 'Noto Sans Bengali', 'Noto Sans', system-ui, sans-serif",
              }}
            >
              {item.originalText}
            </div>
          </div>

          {/* Editable Input: text-base (16px) prevents iOS Safari auto-zoom */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                New Replacement Text
              </label>
              <span className="text-[11px] text-slate-400">
                {text.length} char{text.length !== 1 ? 's' : ''}
              </span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-base font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition shadow-xs"
              style={{
                fontFamily: "'Roboto', 'Noto Serif Bengali', 'SolaimanLipiNormal', 'Noto Sans Bengali', 'Noto Sans', system-ui, sans-serif",
              }}
              placeholder="Type your replacement text here..."
              spellCheck={false}
            />
          </div>

          {/* Field Width Extension Option */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                <MoveHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Extend Field Width</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
                +{Math.round(extraWidth)} pt
              </span>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="range"
                min="0"
                max="250"
                step="5"
                value={extraWidth}
                onChange={(e) => setExtraWidth(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
              {[0, 25, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setExtraWidth(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    extraWidth === val
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {val === 0 ? 'Default' : `+${val}pt`}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Fine-Tuning */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex flex-col text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-1.5">
                <Type className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Font Size</span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal pl-5.5">
                Original: {Math.round(item.fontSize * 10) / 10} pt
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFontSize(Math.max(6, Number((fontSize - 0.5).toFixed(1))))}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Decrease font size"
              >
                <Minus className="w-4 h-4" />
              </button>

              <span className="px-2 py-1 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 min-w-[55px] text-center">
                {fontSize} pt
              </span>

              <button
                type="button"
                onClick={() => setFontSize(Math.min(48, Number((fontSize + 0.5).toFixed(1))))}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Increase font size"
              >
                <Plus className="w-4 h-4" />
              </button>

              {fontSize !== Math.round(item.fontSize * 10) / 10 && (
                <button
                  type="button"
                  onClick={() => setFontSize(Math.round(item.fontSize * 10) / 10)}
                  className="ml-1 text-[11px] text-emerald-600 hover:underline cursor-pointer"
                  title="Reset to original font size"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer: Action buttons (Close button is strictly icon in header) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            {isOriginalChanged && onRevert && (
              <button
                type="button"
                onClick={() => {
                  onRevert();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-md shadow-emerald-500/20 cursor-pointer min-w-[120px]"
            >
              <Check className="w-4 h-4" />
              <span>Update Text</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
