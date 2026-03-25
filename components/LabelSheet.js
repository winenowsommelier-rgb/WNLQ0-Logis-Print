"use client";

import { memo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const LABELS_PER_ROW = 3;
const ROWS_PER_PAGE = 8;
const LABELS_PER_PAGE = LABELS_PER_ROW * ROWS_PER_PAGE;

function chunkLabels(labels, size) {
  const pages = [];

  for (let index = 0; index < labels.length; index += size) {
    pages.push(labels.slice(index, index + size));
  }

  return pages;
}

function buildExportHtml(pageMarkup) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Warehouse Labels</title>
    <style>
      :root {
        --page-width: 96mm;
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
        min-height: 245mm;
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
        padding: 1.5mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
      }

      .labelSku {
        font-size: 3mm;
        font-weight: 700;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .labelName {
        font-size: 2.4mm;
        line-height: 1.1;
        min-height: 5mm;
        overflow: hidden;
      }

      .labelQty {
        font-size: 2.8mm;
        font-weight: 700;
      }

      .barcodeWrap {
        height: 9mm;
        display: flex;
        align-items: flex-end;
      }

      .barcodeWrap svg {
        width: 100%;
        height: 100%;
      }

      @media print {
        @page {
          size: auto;
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
  </body>
</html>`;
}

const LabelCard = memo(function LabelCard({ label }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (!barcodeRef.current || !label.barcode) {
      return;
    }

    JsBarcode(barcodeRef.current, label.barcode, {
      format: "CODE128",
      width: 1.6,
      height: 30,
      displayValue: false,
      margin: 0
    });
  }, [label.barcode]);

  return (
    <article className="label">
      <div className="labelSku">{label.sku}</div>
      <div className="labelName">{label.productName}</div>
      <div className="labelQty">
        Qty {label.copyNumber}/{label.quantity}
      </div>
      <div className="barcodeWrap">
        <svg ref={barcodeRef} aria-label={`barcode-${label.barcode}`} />
      </div>
    </article>
  );
});

export default function LabelSheet({ labels }) {
  const pages = chunkLabels(labels, LABELS_PER_PAGE);
  const previewPagesRef = useRef(null);

  const exportHtml = () => {
    if (!labels.length || !previewPagesRef.current) {
      return;
    }

    const html = buildExportHtml(previewPagesRef.current.innerHTML);
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
          <button className="btn" type="button" onClick={() => window.print()} disabled={!labels.length}>
            Print From Preview
          </button>
        </div>
      </div>

      <div className="previewWrap">
        {labels.length ? (
          <div ref={previewPagesRef} className="sheetPages">
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
