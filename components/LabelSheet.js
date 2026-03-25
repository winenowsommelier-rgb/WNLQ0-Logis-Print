"use client";

import { memo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const LABELS_PER_ROW = 3;
const ROWS_PER_PAGE = 8;
const LABELS_PER_PAGE = LABELS_PER_ROW * ROWS_PER_PAGE;
const LABEL_WIDTH_MM = 32;
const LABEL_HEIGHT_MM = 25;
const COLUMN_GAP_MM = 2;
const ROW_GAP_MM = 3;
const ROLL_WIDTH_MM = 110;
const GRID_WIDTH_MM = LABELS_PER_ROW * LABEL_WIDTH_MM + (LABELS_PER_ROW - 1) * COLUMN_GAP_MM;
const PAGE_HEIGHT_MM = ROWS_PER_PAGE * LABEL_HEIGHT_MM + (ROWS_PER_PAGE - 1) * ROW_GAP_MM;
const BRAND_TEXT = "WINE-NOW & LIQ9";

function chunkLabels(labels, size) {
  const pages = [];

  for (let index = 0; index < labels.length; index += size) {
    pages.push(labels.slice(index, index + size));
  }

  return pages;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPageMarkup(labels) {
  const pages = chunkLabels(labels, LABELS_PER_PAGE);

  return pages
    .map(
      (page, pageIndex) => `
        <section class="sheetPage">
          <div class="sheetMeta">Page ${pageIndex + 1} of ${pages.length}</div>
          <div class="labelsGrid">
            ${page
              .map(
                (label) => `
                  <article class="label premiumLabel">
                    <div class="labelItemName" title="${escapeHtml(label.productName)}">${escapeHtml(label.productName)}</div>
                    <div class="barcodeWrap">
                      <svg aria-label="barcode-${escapeHtml(label.sku)}"></svg>
                    </div>
                    <div class="labelSkuCode" title="${escapeHtml(label.sku)}">${escapeHtml(label.sku)}</div>
                    <div class="labelBrand">${BRAND_TEXT}</div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function buildExportHtml(labels, { autoPrint = false } = {}) {
  const pageMarkup = buildPageMarkup(labels);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Warehouse Labels</title>
    <style>
      :root {
        --page-width: ${ROLL_WIDTH_MM}mm;
        --grid-width: ${GRID_WIDTH_MM}mm;
        --page-height: ${PAGE_HEIGHT_MM}mm;
        --column-gap: ${COLUMN_GAP_MM}mm;
        --row-gap: ${ROW_GAP_MM}mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 16px;
        font-family: Arial, sans-serif;
        background: #f4f6f8;
        color: #111827;
      }

      .sheetPage {
        width: calc(var(--page-width) + 16mm);
        min-height: calc(var(--page-height) + 16mm);
        margin: 0 auto 16px;
        padding: 8mm 0;
        background: #ffffff;
        border: 1px solid #dbe1ea;
        page-break-after: always;
      }

      .sheetPage:last-child {
        page-break-after: auto;
      }

      .sheetMeta {
        width: var(--grid-width);
        margin: 0 auto 4mm;
        font-size: 12px;
        color: #6b7280;
      }

      .labelsGrid {
        width: var(--grid-width);
        display: grid;
        grid-template-columns: repeat(3, 32mm);
        grid-auto-rows: 25mm;
        gap: var(--row-gap) var(--column-gap);
        margin: 0 auto;
      }

      .label {
        width: 32mm;
        height: 25mm;
        border: 0.2mm solid #000;
        padding: 0.95mm 1mm 0.85mm;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 0.3mm;
        overflow: hidden;
        background: #fff;
      }

      .labelItemName {
        font-size: 2.2mm;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.01em;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 4.4mm;
        flex: 0 0 auto;
      }

      .barcodeWrap {
        height: 8.4mm;
        display: flex;
        align-items: center;
        flex: 0 0 auto;
      }

      .barcodeWrap svg {
        width: 100%;
        height: 100%;
      }

      .labelSkuCode {
        font-size: 1.9mm;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 0 0 auto;
      }

      .labelBrand {
        font-size: 1.4mm;
        font-weight: 700;
        letter-spacing: 0.03em;
        line-height: 1;
        color: #374151;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 0 0 auto;
      }

      @media print {
        @page {
          size: var(--page-width) var(--page-height);
          margin: 0;
        }

        body {
          padding: 0;
          background: #fff;
        }

        .sheetPage {
          width: var(--page-width);
          min-height: auto;
          margin: 0;
          padding: 0;
          border: 0;
        }

        .sheetMeta {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    ${pageMarkup}
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.1/dist/JsBarcode.all.min.js"></script>
    <script>
      document.querySelectorAll('.barcodeWrap svg').forEach((node) => {
        const barcode = node.getAttribute('aria-label')?.replace('barcode-', '');
        if (!barcode || !window.JsBarcode) return;

        window.JsBarcode(node, barcode, {
          format: 'CODE128',
          width: 1.18,
          height: 22,
          displayValue: false,
          margin: 0
        });
      });
    </script>
    ${
      autoPrint
        ? `<script>
      const closeWindow = () => {
        window.close();
      };

      window.addEventListener('afterprint', closeWindow);
      window.addEventListener('load', () => {
        setTimeout(() => window.print(), 150);
        setTimeout(closeWindow, 800);
      });
    </script>`
        : ""
    }
  </body>
</html>`;
}

const LabelCard = memo(function LabelCard({ label }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (!barcodeRef.current || !label.sku) {
      return;
    }

    JsBarcode(barcodeRef.current, label.sku, {
      format: "CODE128",
      width: 1.18,
      height: 22,
      displayValue: false,
      margin: 0
    });
  }, [label.sku]);

  return (
    <article className="label premiumLabel">
      <div className="labelItemName" title={label.productName}>
        {label.productName}
      </div>
      <div className="barcodeWrap">
        <svg ref={barcodeRef} aria-label={`barcode-${label.sku}`} />
      </div>
      <div className="labelSkuCode" title={label.sku}>
        {label.sku}
      </div>
      <div className="labelBrand">{BRAND_TEXT}</div>
    </article>
  );
});

export default function LabelSheet({ labels }) {
  const pages = chunkLabels(labels, LABELS_PER_PAGE);

  const exportHtml = () => {
    if (!labels.length) {
      return;
    }

    const html = buildExportHtml(labels);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "warehouse-label-preview.html";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printPreview = () => {
    if (!labels.length) {
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildExportHtml(labels, { autoPrint: true }));
    printWindow.document.close();
  };

  return (
    <section>
      <div className="previewHeader">
        <div>
          <h2>Label Preview</h2>
          <p className="small">
            110mm label roll preview with 3 labels per row. Each label is 32mm × 25mm with 2mm
            horizontal gaps and 3mm vertical gaps.
          </p>
        </div>
        <div className="controls screenOnly">
          <button className="btn btnSecondary" type="button" onClick={exportHtml} disabled={!labels.length}>
            Export HTML
          </button>
          <button className="btn" type="button" onClick={printPreview} disabled={!labels.length}>
            Print From Preview
          </button>
        </div>
      </div>

      <div className="previewWrap">
        {labels.length ? (
          <div className="sheetPages">
            {pages.map((page, pageIndex) => (
              <section key={`page-${pageIndex + 1}`} className="sheetPage">
                <div className="sheetMeta screenOnly">
                  Page {pageIndex + 1} of {pages.length}
                </div>
                <div className="labelsGrid">
                  {page.map((label) => (
                    <LabelCard key={label.id} label={label} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="small">Upload purchase order PDFs to generate labels.</p>
        )}
      </div>
    </section>
  );
}
