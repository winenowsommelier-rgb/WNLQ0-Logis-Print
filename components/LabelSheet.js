"use client";

import { memo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const LABELS_PER_ROW = 3;
const ROWS_PER_PAGE = 8;
const LABELS_PER_PAGE = LABELS_PER_ROW * ROWS_PER_PAGE;
const LABEL_WIDTH_MM = 32;
const LABEL_HEIGHT_MM = 25;
const PAGE_WIDTH_MM = LABELS_PER_ROW * LABEL_WIDTH_MM;
const PAGE_HEIGHT_MM = ROWS_PER_PAGE * LABEL_HEIGHT_MM;

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
                    <div class="labelTopName" title="${escapeHtml(label.sku)}">${escapeHtml(label.sku)}</div>
                    <div class="barcodeWrap">
                      <svg aria-label="barcode-${escapeHtml(label.sku)}"></svg>
                    </div>
                    <div class="labelItemName" title="${escapeHtml(label.productName)}">${escapeHtml(label.productName)}</div>
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
        --page-width: ${PAGE_WIDTH_MM}mm;
        --page-height: ${PAGE_HEIGHT_MM}mm;
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
        padding: 8mm;
        background: #ffffff;
        border: 1px solid #dbe1ea;
        page-break-after: always;
      }

      .sheetPage:last-child {
        page-break-after: auto;
      }

      .sheetMeta {
        margin-bottom: 4mm;
        font-size: 12px;
        color: #6b7280;
      }

      .labelsGrid {
        width: var(--page-width);
        display: grid;
        grid-template-columns: repeat(3, 32mm);
        gap: 2mm 0;
      }

      .label {
        width: 32mm;
        height: 25mm;
        border: 0.2mm solid #000;
        padding: 1mm 1.1mm 0.9mm;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 0.45mm;
        overflow: hidden;
      }

      .labelTopName {
        font-size: 2.45mm;
        font-weight: 800;
        line-height: 1.05;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 0 0 auto;
      }

      .barcodeWrap {
        height: 9.6mm;
        display: flex;
        align-items: center;
        flex: 0 0 auto;
      }

      .barcodeWrap svg {
        width: 100%;
        height: 100%;
      }

      .labelItemName {
        font-size: 1.6mm;
        line-height: 1;
        overflow-wrap: anywhere;
        word-break: break-word;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 3.4mm;
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
    ${
      autoPrint
        ? `<script>
      document.querySelectorAll('.barcodeWrap svg').forEach((node) => {
        const barcode = node.getAttribute('aria-label')?.replace('barcode-', '');
        if (!barcode || !window.JsBarcode) return;

        window.JsBarcode(node, barcode, {
          format: 'CODE128',
          width: 1.45,
          height: 28,
          displayValue: false,
          margin: 0
        });
      });

      const closeWindow = () => {
        window.close();
      };

      window.addEventListener('afterprint', closeWindow);
      window.addEventListener('load', () => {
        setTimeout(() => window.print(), 150);
        setTimeout(closeWindow, 800);
      });
    </script>`
        : `<script>
      document.querySelectorAll('.barcodeWrap svg').forEach((node) => {
        const barcode = node.getAttribute('aria-label')?.replace('barcode-', '');
        if (!barcode || !window.JsBarcode) return;

        window.JsBarcode(node, barcode, {
          format: 'CODE128',
          width: 1.45,
          height: 28,
          displayValue: false,
          margin: 0
        });
      });
    </script>`
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
      width: 1.45,
      height: 28,
      displayValue: false,
      margin: 0
    });
  }, [label.sku]);

  return (
    <article className="label premiumLabel">
      <div className="labelTopName" title={label.sku}>{label.sku}</div>
      <div className="barcodeWrap">
        <svg ref={barcodeRef} aria-label={`barcode-${label.sku}`} />
      </div>
      <div className="labelItemName" title={label.productName}>{label.productName}</div>
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
            3 labels per row, grouped into pages for easier review and export. Physical label size:
            32mm × 25mm. Print at 100% scale.
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
