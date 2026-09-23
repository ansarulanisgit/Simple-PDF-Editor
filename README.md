# Simple PDF Editor

A fast, 100% client-side in-place PDF editor built with Next.js 16, React 19, Tailwind CSS, PDF.js, PDF-Lib, and Fontkit. 

## Key Features

- **100% Client-Side Privacy**: All processing runs in the browser via Web Workers and HTML5 Canvas. Your documents are never uploaded to any server.
- **In-Place Text Editing**: Every text snippet in the PDF is recognized, grouped by line, and made editable in place with a tap or click.
- **Flawless Bengali Typography**: Uses **Noto Serif Bengali** with full OpenType Indic V2 (`bng2`) complex conjunct support (`রুপসা`, `এক্সপ্রেস`, `দ্রুতযান`, `শো.চেয়ার`, `যাত্রার তথ্য`). Zero broken glyphs or misplaced vowel markers.
- **Dynamic Font & Color Matching**: Automatically matches original fonts (such as `Roboto Regular` for Bangladesh Railway e-tickets and standard Latin fonts) and samples exact text/background colors.
- **Adaptive Background Matching**: Seamlessly blends eraser boxes over colored table banners, dark headers, and light paper backgrounds.
- **Full Offline Support**: Includes all 169 PDF.js CMap character maps bundled locally in `public/cmaps/`.
- **Undo / Redo & History**: Full keyboard shortcut support (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`) and reset controls.
- **Responsive & Dark Mode**: Optimized for desktop and mobile touchscreens with automatic fit-to-width scaling and instant theme toggling.

---

## Getting Started

### Prerequisites

- Node.js 18.18+ or 20+

### Installation

```bash
# Clone the repository
git clone https://github.com/ansarulanisgit/Simple-PDF-Editor.git
cd Simple-PDF-Editor

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploy to Vercel

This application is ready for 1-click deployment on [Vercel](https://vercel.com).

### Option 1: Import via Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new).
2. Connect your GitHub account and select `ansarulanisgit/Simple-PDF-Editor`.
3. Framework Preset: **Next.js** (auto-detected).
4. Click **Deploy**.

### Option 2: Deploy using Vercel CLI
```bash
npm install -g vercel
vercel
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4
- **PDF Rendering**: `pdfjs-dist` (v4.10.38)
- **PDF Modification & Export**: `pdf-lib` + `@pdf-lib/fontkit`
- **Compression**: `pako`
- **Icons**: `lucide-react`
