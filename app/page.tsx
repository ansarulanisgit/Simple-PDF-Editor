'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import confetti from 'canvas-confetti';
import {
  loadPdfDocument,
  extractDocumentPagesInfo,
  extractPageTextRuns,
} from '@/lib/pdf-parser';
import { exportModifiedPdf, triggerDownload } from '@/lib/pdf-exporter';
import { TextItemModel, PageInfo, ItemEditConfig, ColorRgb } from '@/lib/types';
import { Header } from '@/components/Header';
import { Toolbar } from '@/components/Toolbar';
import { FileUploader } from '@/components/FileUploader';
import { PdfPageViewer } from '@/components/PdfPageViewer';
import { TextEditModal } from '@/components/TextEditModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function PdfEditorPage() {
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pagesInfo, setPagesInfo] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.5);
  const [groupLines] = useState<boolean>(true);

  // Cached text items mapped per page index: { [pageIndex: number]: TextItemModel[] }
  const [pageItemsCache, setPageItemsCache] = useState<Record<number, TextItemModel[]>>({});

  // Configurations map keyed by text item ID: text, fontSize, extraWidth
  const [configsMap, setConfigsMap] = useState<Record<string, ItemEditConfig>>({});
  const [selectedItem, setSelectedItem] = useState<TextItemModel | null>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Record<string, ItemEditConfig>[]>([{}]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Calculate optimal fit scale for mobile / desktop screens
  const calculateFitWidthScale = useCallback((pdfWidth: number) => {
    if (typeof window === 'undefined') return 1.25;
    const padding = window.innerWidth < 640 ? 16 : 48;
    const availableWidth = window.innerWidth - padding;
    const computed = availableWidth / pdfWidth;
    return Math.min(2.0, Math.max(0.4, Number(computed.toFixed(2))));
  }, []);

  const handleFitWidth = useCallback(() => {
    const activePage = pagesInfo[currentPage];
    if (activePage) {
      setScale(calculateFitWidthScale(activePage.pdfWidth));
    }
  }, [currentPage, pagesInfo, calculateFitWidthScale]);

  // Push new state into the undo/redo history stack
  const pushHistory = useCallback(
    (newConfigs: Record<string, ItemEditConfig>) => {
      setConfigsMap(newConfigs);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newConfigs];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setConfigsMap(history[newIndex]);
    }
  }, [historyIndex, history]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setConfigsMap(history[newIndex]);
    }
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Global Keyboard Shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedItem) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, handleUndo, handleRedo]);

  // Handle uploaded file or sample ticket
  const handleFileSelect = async (fileInput: File | { name: string; buffer: ArrayBuffer }) => {
    setIsParsing(true);
    setNotification(null);

    try {
      let rawBuffer: ArrayBuffer;
      let name: string;

      if ('buffer' in fileInput) {
        rawBuffer = fileInput.buffer;
        name = fileInput.name;
      } else {
        rawBuffer = await fileInput.arrayBuffer();
        name = fileInput.name;
      }

      // Clean up previous PDF.js worker document to prevent memory leaks
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch (e) {}
      }

      // Preserve a clean master copy in memory
      const safeBuffer = rawBuffer.slice(0);
      setFileName(name);
      setFileBuffer(safeBuffer);
      setConfigsMap({});
      setHistory([{}]);
      setHistoryIndex(0);
      setPageItemsCache({});
      setSelectedItem(null);
      setCurrentPage(0);

      // Load document into pdfjs-dist using a cloned buffer slice
      const doc = await loadPdfDocument(safeBuffer.slice(0));
      setPdfDoc(doc);

      // Extract metadata for each page
      const info = await extractDocumentPagesInfo(doc);
      setPagesInfo(info);

      // Default opening zoom: 150% (1.5). On small mobile phones (<640px), auto-fit to screen width.
      if (typeof window !== 'undefined' && info.length > 0) {
        if (window.innerWidth < 640) {
          setScale(calculateFitWidthScale(info[0].pdfWidth));
        } else {
          setScale(1.5);
        }
      }
    } catch (err: any) {
      console.error('Failed to load PDF document:', err);
      setNotification({
        type: 'error',
        message: 'Could not load PDF document. Please ensure the file is not corrupted.',
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Load and map text runs for the active page
  useEffect(() => {
    if (!pdfDoc || pagesInfo.length === 0) return;

    let isCancelled = false;

    async function loadPageText() {
      const cacheKey = currentPage;
      if (pageItemsCache[cacheKey]) {
        return;
      }

      try {
        const items = await extractPageTextRuns(pdfDoc!, currentPage, groupLines);
        if (!isCancelled) {
          setPageItemsCache((prev) => ({
            ...prev,
            [cacheKey]: items,
          }));
        }
      } catch (err) {
        console.error(`Error extracting text for page ${currentPage + 1}:`, err);
      }
    }

    loadPageText();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pagesInfo, currentPage, groupLines, pageItemsCache]);

  // Save updated config from modal
  const handleSaveConfig = useCallback(
    (id: string, config: ItemEditConfig) => {
      const next = { ...configsMap, [id]: config };
      pushHistory(next);
    },
    [configsMap, pushHistory]
  );

  // Update extra width from draggable handle on canvas
  const handleUpdateExtraWidth = useCallback(
    (id: string, extraWidth: number) => {
      const existing = configsMap[id] || { text: '' };
      const next = {
        ...configsMap,
        [id]: {
          ...existing,
          extraWidth,
        },
      };
      setConfigsMap(next);
    },
    [configsMap]
  );

  // Revert a single field to its original text and dimensions
  const handleResetField = useCallback(
    (id: string) => {
      const next = { ...configsMap };
      delete next[id];
      pushHistory(next);
    },
    [configsMap, pushHistory]
  );

  // Cache sampled colors from canvas rendering for exact match on export and overlay
  const handleColorsSampled = useCallback(
    (colorsMap: Record<string, { sampledBgColor: ColorRgb; sampledTextColor: ColorRgb }>) => {
      setPageItemsCache((prev) => {
        const currentList = prev[currentPage];
        if (!currentList) return prev;
        let changed = false;
        const updated = currentList.map((item) => {
          const sampled = colorsMap[item.id];
          if (sampled) {
            changed = true;
            return {
              ...item,
              sampledBgColor: sampled.sampledBgColor,
              sampledTextColor: sampled.sampledTextColor,
            };
          }
          return item;
        });
        if (!changed) return prev;
        return {
          ...prev,
          [currentPage]: updated,
        };
      });
    },
    [currentPage]
  );

  // Revert all edits across the document
  const handleResetAll = useCallback(() => {
    pushHistory({});
    setNotification({
      type: 'success',
      message: 'All edits have been reset to original values.',
    });
  }, [pushHistory]);

  // Start fresh with a new document
  const handleNewFile = () => {
    if (pdfDoc) {
      try {
        pdfDoc.destroy();
      } catch (e) {}
    }
    setFileBuffer(null);
    setFileName(null);
    setPdfDoc(null);
    setPagesInfo([]);
    setPageItemsCache({});
    setConfigsMap({});
    setHistory([{}]);
    setHistoryIndex(0);
    setSelectedItem(null);
    setCurrentPage(0);
    setScale(1.5);
  };

  // Clean up PDF.js worker on component unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch (e) {}
      }
    };
  }, [pdfDoc]);

  // Calculate stats
  const currentItems = pageItemsCache[currentPage] || [];

  const totalEditedCount = useMemo(() => {
    return Object.keys(configsMap).length;
  }, [configsMap]);

  // Export modified PDF
  const handleExport = async () => {
    if (!fileBuffer || !pdfDoc) return;
    setIsExporting(true);

    try {
      const allItems: TextItemModel[] = [];
      for (const itemsForPage of Object.values(pageItemsCache)) {
        if (itemsForPage) {
          allItems.push(...itemsForPage);
        }
      }

      // Generate modified PDF bytes with pdf-lib & fontkit using fresh buffer clone
      const exportedBlob = await exportModifiedPdf(
        fileBuffer.slice(0),
        allItems,
        configsMap,
        fileName || 'edited-document.pdf'
      );

      let downloadName = fileName || 'document.pdf';
      const cleanName = downloadName.replace(/\.pdf$/i, '');
      if (/^BDRAILWAY_TICKET\d{4,}$/i.test(cleanName)) {
        // Change the last 4 digits randomly for the demo ticket
        const oldLast4 = cleanName.slice(-4);
        let random4 = oldLast4;
        while (random4 === oldLast4) {
          random4 = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        }
        downloadName = `${cleanName.slice(0, -4)}${random4}.pdf`;
      } else {
        downloadName = `${cleanName}-edited.pdf`;
      }
      triggerDownload(exportedBlob, downloadName);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      setNotification({
        type: 'success',
        message: `Successfully exported "${downloadName}" with ${totalEditedCount} modification(s)!`,
      });
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      setNotification({
        type: 'error',
        message: `Export failed: ${err.message || 'Unknown error during PDF generation.'}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header: Clean branding, modified count, New PDF, Export */}
      <Header
        fileName={fileName}
        totalEditedCount={totalEditedCount}
        onNewFile={handleNewFile}
        onExport={handleExport}
        isExporting={isExporting}
        isParsing={isParsing}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center">
        {!pdfDoc ? (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-4">
            <FileUploader onFileSelect={handleFileSelect} isLoading={isParsing} />
          </div>
        ) : (
          <div className="w-full flex flex-col flex-1">
            <Toolbar
              currentPage={currentPage}
              numPages={pagesInfo.length}
              onPageChange={(p) => setCurrentPage(p)}
              scale={scale}
              onScaleChange={(s) => setScale(s)}
              onFitWidth={handleFitWidth}
              canReset={totalEditedCount > 0}
              onReset={handleResetAll}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />

            {/* Document Canvas and Overlay Canvas */}
            <div className="flex-1 overflow-auto bg-slate-200/80 dark:bg-slate-950/90 flex justify-center py-4 px-2 sm:py-6 sm:px-4">
              {pagesInfo[currentPage] && (
                <PdfPageViewer
                  pdfDoc={pdfDoc}
                  pageIndex={currentPage}
                  pageInfo={pagesInfo[currentPage]}
                  items={currentItems}
                  configsMap={configsMap}
                  onItemClick={(item) => setSelectedItem(item)}
                  onResetField={handleResetField}
                  onUpdateExtraWidth={handleUpdateExtraWidth}
                  onColorsSampled={handleColorsSampled}
                  scale={scale}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Edit Text Modal */}
      <TextEditModal
        isOpen={!!selectedItem}
        item={selectedItem}
        currentConfig={selectedItem ? configsMap[selectedItem.id] : undefined}
        onClose={() => setSelectedItem(null)}
        onSave={(config) => {
          if (selectedItem) {
            handleSaveConfig(selectedItem.id, config);
          }
        }}
        onRevert={() => {
          if (selectedItem) {
            handleResetField(selectedItem.id);
          }
        }}
      />
    </div>
  );
}
