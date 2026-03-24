"use client";

import { memo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

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
    <article className="label premiumLabel">
      <header className="labelHeader">
        <div className="labelSku" title={label.sku}>{label.sku}</div>
        <div className="labelQtyPill">{label.copyNumber}/{label.quantity}</div>
      </header>

      <div className="labelName" title={label.productName}>{label.productName}</div>

      <div className="barcodeWrap">
        <svg ref={barcodeRef} aria-label={`barcode-${label.barcode}`} />
      </div>

      <footer className="labelFooter">{label.sourceName}</footer>
    </article>
  );
});

export default function LabelSheet({ labels }) {
  return (
    <section>
      <h2>Label Preview</h2>
      <p className="small">Premium compact layout: bold SKU, high-contrast barcode, clear quantity badge.</p>

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
