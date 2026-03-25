# Warehouse Label Printer (Next.js)

Production-ready Next.js App Router application for warehouse label printing from Purchase Order PDFs.

## Features

- Multi-file PDF upload (merge into one batch).
- Review/confirm parsed SKU and qty rows before generating labels.
- Clear current batch with one click.
- PDF parsing with `pdfjs-dist`.
- Extracts line item pattern: `Qty SKU ProductName Price Total`.
- Parses only SKU + quantity (SKU token length 8-12 characters, alphanumeric) and uses SKU as barcode value for scanning.
- Expands labels to one-per-quantity.
- Barcode generation with JsBarcode CODE128 (`width: 1.6`, `height: 30`, no text).
- Label sheet preview using flexbox, 3 labels per row.
- Print CSS optimized for exact 32mm x 25mm labels and zero page margins.
- Handles large batches (100-500 labels) via memoized label components.
- Debug mode: When no SKUs are found, extracted text is shown for troubleshooting.

## Components / Structure

- `app/page.js`: dashboard orchestration.
- `components/FileUploader.js`: upload + parse flow.
- `components/LabelSheet.js`: preview + barcode rendering.
- `utils/parsePO.js`: parsing and label expansion logic.
- `scripts/check-merge-markers.mjs`: guard against unresolved Git conflict markers.

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

## Tests

```bash
npm test
npm run check:merge-markers
```

## Troubleshooting

If PDFs are not parsing correctly and no SKU data is found:

1. **Check PDF format**: Ensure PDFs contain selectable text (not scanned images). Use "Select All" in a PDF viewer to test.
2. **Review extracted text**: When parsing fails, the app shows the raw extracted text. Look for lines containing SKUs (8-12 characters) and quantities.
3. **SKU format**: SKUs must be 8-12 characters long and contain only letters, numbers, underscores, or hyphens.
4. **Line format**: Expected format is `Qty SKU ProductName Price Total` with tokens separated by spaces.
5. **Debug logs**: Open browser DevTools Console to see detailed parsing logs.
6. **Template parsing**: For non-standard formats, use the ExtractionDebugger component (currently not integrated in UI).

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import repo in Vercel dashboard and deploy.
3. Or use CLI:

```bash
npm i -g vercel
vercel --prod
```


## Vercel build settings (important)

If Vercel reports `No Output Directory named "public" found`, set the project to **Next.js** and clear any custom Output Directory in Project Settings.

This repo includes `vercel.json` to enforce Next.js framework detection and standard build/install commands.


## Security

- Next.js is kept on patched `16.0.10` to address known issues in earlier `16.0.x` releases.
