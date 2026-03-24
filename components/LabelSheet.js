"use client";

import { memo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const LabelCard = memo(function LabelCard({ label }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (!barcodeRef.current || !label.sku) {
      return;
    }

    JsBarcode(barcodeRef.current, label.sku, {
      format: "CODE128",
      width: 1.6,
      height: 30,
      displayValue: false,
      margin: 0
    });
  }, [label.sku]);

  return (
    <article className="label premiumLabel">
      <header className="labelTopName" title={label.sku}>{label.sku}</header>

      <div className="barcodeWrap barcodeMain">
        <svg ref={barcodeRef} aria-label={`barcode-${label.sku}`} />
      </div>

      <footer className="labelItemName" title={label.productName}>{label.productName}</footer>
    </article>
  );
});

export default function LabelSheet({ labels }) {
  return (
    <section>
      <h2>Label Preview</h2>
      <p className="small">Sticker order: SKU (top), barcode of SKU (middle), full item name (bottom).</p>

      <div className="previewWrap">
        {labels.length ? (
          <div className="labelsGrid">
            {labels.map((label) => (
              <LabelCard key={label.id} label={label} />
            ))}
          </div>
        ) : (
          <p className="small">Upload purchase order PDFs to generate labels.</p>
        )}
      </div>
    </section>
  );
}
