"use client";

import { useMemo, useState } from "react";
import FileUploader from "@/components/FileUploader";
import LabelSheet from "@/components/LabelSheet";

export default function HomePage() {
  const [labels, setLabels] = useState([]);
  const [sourceFiles, setSourceFiles] = useState([]);

  const summary = useMemo(() => {
    const skuSet = new Set(labels.map((label) => label.sku));
    return {
      totalLabels: labels.length,
      uniqueSkus: skuSet.size,
      files: sourceFiles.length
    };
  }, [labels, sourceFiles]);

  return (
    <main className="page">
      <header className="hero">
        <h1>Warehouse Label Printer</h1>
        <p>
          Upload one or more PO PDFs, parse SKU/product/quantity/barcode, merge into one print batch,
          preview, and print exact 32mm × 25mm labels.
        </p>
      </header>

      <section className="card">
        <FileUploader onLabelsParsed={setLabels} onFilesProcessed={setSourceFiles} />
      </section>

      <section className="stats">
        <article className="statCard">
          <h2>{summary.files}</h2>
          <p>PDF files loaded</p>
        </article>
        <article className="statCard">
          <h2>{summary.uniqueSkus}</h2>
          <p>Unique SKUs</p>
        </article>
        <article className="statCard">
          <h2>{summary.totalLabels}</h2>
          <p>Labels in print batch</p>
        </article>
      </section>

      <section className="card">
        <LabelSheet labels={labels} />
      </section>
    </main>
  );
}
