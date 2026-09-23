export interface ColorRgb {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface TextItemModel {
  id: string;
  pageIndex: number; // 0-indexed (page 0 is first page in pdf-lib and pdf.js page 1)
  originalText: string;
  currentText: string;
  pdfX: number; // PDF points (bottom-left origin)
  pdfY: number; // PDF points (baseline)
  pdfWidth: number; // PDF points
  pdfHeight: number; // PDF points
  fontSize: number; // PDF points
  fontName?: string;
  isGrouped?: boolean;
  subItemCount?: number;
  sampledBgColor?: ColorRgb;
  sampledTextColor?: ColorRgb;
}

export interface ItemEditConfig {
  text: string;
  fontSize?: number;
  extraWidth?: number; // in PDF points
  bgColor?: ColorRgb;
  textColor?: ColorRgb;
}

export interface PageInfo {
  pageIndex: number;
  pdfWidth: number;
  pdfHeight: number;
  aspectRatio: number;
}

export interface DocumentState {
  file: File | null;
  fileName: string;
  fileBuffer: ArrayBuffer | null;
  numPages: number;
  pages: PageInfo[];
}
