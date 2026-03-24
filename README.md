# Warehouse Label Printer (Next.js)

Production-ready Next.js App Router application for warehouse label printing from Purchase Order PDFs.

## Features

- Multi-file PDF upload (merge into one batch).
- Clear current batch with one click.
- PDF parsing with `pdfjs-dist`.
- Extracts line item pattern: `Qty SKU ProductName Price Total`.
- Extracts barcode from `Barcode: XXXXX` nearby lines.
- Expands labels to one-per-quantity.
- Barcode generation with JsBarcode CODE128 (`width: 1.6`, `height: 30`, no text).
- Label sheet preview using flexbox, 3 labels per row.
- Print CSS optimized for exact 32mm x 25mm labels and zero page margins.
- Handles large batches (100-500 labels) via memoized label components.

## Components / Structure

- `app/page.js`: dashboard orchestration.
- `components/FileUploader.js`: upload + parse flow.
- `components/LabelSheet.js`: preview + barcode rendering.
- `utils/parsePO.js`: parsing and label expansion logic.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build for production

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import repo in Vercel dashboard and deploy.
3. Or use CLI:

```bash
npm i -g vercel
vercel --prod
```

