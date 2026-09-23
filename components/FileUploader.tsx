import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File | { name: string; buffer: ArrayBuffer }) => void;
  isLoading?: boolean;
}

export function FileUploader({ onFileSelect, isLoading }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('Please select a valid PDF document (.pdf).');
      return;
    }
    onFileSelect(file);
  };

  const handleLoadSample = async () => {
    try {
      setErrorMsg(null);
      // Bust cache to ensure the clean, uncorrupted demo PDF is loaded every time
      const res = await fetch(`/demo.pdf?t=${Date.now()}`);
      if (!res.ok) {
        // Fallback to sample-ticket.pdf
        const fallback = await fetch(`/sample-ticket.pdf?t=${Date.now()}`);
        if (!fallback.ok) {
          throw new Error('Failed to load demo PDF');
        }
        const buffer = await fallback.arrayBuffer();
        onFileSelect({
          name: 'bangladesh-railway-ticket.pdf',
          buffer,
        });
        return;
      }
      const buffer = await res.arrayBuffer();
      onFileSelect({
        name: 'bangladesh-railway-ticket.pdf',
        buffer,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load demo PDF. Please upload your own PDF.');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto my-6 sm:my-12 px-3 sm:px-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-white dark:bg-slate-900/80 shadow-lg shadow-slate-100 dark:shadow-none'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
            <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
              Upload PDF to Edit
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Tap below to pick any PDF. Every piece of text becomes an in-place editable field.
            </p>
          </div>

          {/* Action buttons full-width on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-2 w-full sm:w-auto">
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isLoading}
            >
              <FileText className="w-4 h-4" />
              <span>Choose PDF File</span>
            </button>

            <button
              type="button"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSample();
              }}
              disabled={isLoading}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Try Demo PDF</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Client-Side • Never uploaded to any server</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
