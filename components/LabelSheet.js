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
  return (
    <section>
      <h2>Label Preview</h2>
      <p className="small">3 labels per row. Physical label size: 32mm × 25mm. Print at 100% scale.</p>

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
