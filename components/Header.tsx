'use client';

import React from 'react';
import {
  FileDown,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  FileSpreadsheet,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface HeaderProps {
  fileName: string | null;
  totalEditedCount: number;
  onNewFile: () => void;
  onExport: () => void;
  isExporting: boolean;
  isParsing: boolean;
}

export function Header({
  fileName,
  totalEditedCount,
  onNewFile,
  onExport,
  isExporting,
  isParsing,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Branding with Green Palette */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                PDF Editor
              </h1>
              <span className="hidden xs:inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                v1.0
              </span>
            </div>
            {fileName ? (
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[130px] sm:max-w-xs flex items-center gap-1">
                <FileCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500 shrink-0" />
                <span className="truncate">{fileName}</span>
              </p>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate tracking-tight">
                Simple, Fast and 100% Free
              </p>
            )}
          </div>
        </div>

        {/* Status indicator: Modified count */}
        {fileName && totalEditedCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>
              {totalEditedCount} <span className="hidden xs:inline">modified</span>
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {fileName && (
            <>
              <button
                onClick={onNewFile}
                className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Upload another PDF document"
              >
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">New PDF</span>
              </button>

              <button
                onClick={onExport}
                disabled={isExporting || isParsing}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                title="Generate updated PDF with all edits applied"
              >
                {isExporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden xs:inline">Exporting...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>Export</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0 active:scale-95"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle light/dark theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-200" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
