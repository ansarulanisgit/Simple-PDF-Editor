import React from 'react';
import { AlertCircle, X, CheckCircle2, Layers, Type, Paintbrush } from 'lucide-react';

interface LimitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LimitationsModal({ isOpen, onClose }: LimitationsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Known Technical Notes & Features
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparent considerations regarding in-place PDF editing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg dark:hover:text-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex gap-3">
            <div className="mt-0.5 text-emerald-500 shrink-0">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                1. Font Metric Fidelity
              </h4>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                PDFs often contain proprietary, subsetted, or custom-hinted fonts. When exporting edits,
                PDF Editor dynamically embeds high-grade Unicode TrueType fonts (Roboto Regular for English
                and Noto Serif Bengali with complete Indic V2 conjunct shaping).
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 text-emerald-500 shrink-0">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                2. Adaptive Background Matching
              </h4>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                The editor dynamically samples background and text colors directly from the rendered
                document canvas. Whether your text sits on a dark event badge, a green table banner, or
                white paper, the erase layer and replacement text match seamlessly.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 text-teal-500 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                3. Dense Tables & Word Overlaps
              </h4>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Dense forms and data tables generate dozens of adjacent inputs. We provide smart line-run
                grouping and dynamic z-index focusing so editing feels smooth and intuitive without inputs
                blocking each other.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 text-amber-500 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                4. Exact Page Index Synchronization
              </h4>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                The visual canvas engine and the export engine share a unified zero-indexed page registry,
                guaranteeing that modifications are applied to the exact corresponding PDF page.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm cursor-pointer"
          >
            Got it, continue editing
          </button>
        </div>
      </div>
    </div>
  );
}
