import React from 'react';
import { Train, Clock, Check, X, ArrowRight } from 'lucide-react';
import { TrainOption, getDynamicJourneyDate } from '@/lib/date-utils';

interface TrainSelectionModalProps {
  isOpen: boolean;
  selectedTrain?: TrainOption;
  onSelectTrain: (train: TrainOption) => void;
  onClose: () => void;
}

export function TrainSelectionModal({
  isOpen,
  selectedTrain = 'drutojan',
  onSelectTrain,
  onClose,
}: TrainSelectionModalProps) {
  if (!isOpen) return null;

  const drutojanInfo = getDynamicJourneyDate('drutojan');
  const rupshaInfo = getDynamicJourneyDate('rupsha');

  const handleSelect = (train: TrainOption) => {
    onSelectTrain(train);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-all space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden flex justify-center -mt-2 mb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <Train className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Which train?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a train to update schedule & details for today
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Train Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Drutojan Card */}
          <button
            type="button"
            onClick={() => handleSelect('drutojan')}
            className={`group relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-150 flex flex-col justify-between ${
              selectedTrain === 'drutojan'
                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-600 text-white">
                  Train 758
                </span>
                {selectedTrain === 'drutojan' && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Drutojan
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                দ্রুতযান এক্সপ্রেস [৭৫৮]
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Today at <strong>12:40</strong> (১২:৪০)</span>
            </div>
          </button>

          {/* 2. Rupsha Card */}
          <button
            type="button"
            onClick={() => handleSelect('rupsha')}
            className={`group relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-150 flex flex-col justify-between ${
              selectedTrain === 'rupsha'
                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-600 text-white">
                  Train 728
                </span>
                {selectedTrain === 'rupsha' && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Rupsha
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                রূপসা এক্সপ্রেস [৭২৮]
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Today at <strong>12:05</strong> (১২:০৫)</span>
            </div>
          </button>
        </div>

        {/* Buttons / Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Keep Current
          </button>
          <button
            type="button"
            onClick={() => handleSelect(selectedTrain)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95"
          >
            <span>Apply Selected</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
