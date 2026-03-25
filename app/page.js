"use client";

import { useMemo, useState } from "react";
import FileUploader from "@/components/FileUploader";
import LabelSheet from "@/components/LabelSheet";
import ParseReviewTable from "@/components/ParseReviewTable";
import ParsedItemsTable from "@/components/ParsedItemsTable";
import { buildBatchValidation } from "@/utils/parsePO";

export default function HomePage() {
  const [batch, setBatch] = useState({
    labels: [],
    items: [],
    files: [],
    validation: {
      filesProcessed: 0,
      itemsParsed: 0,
      labelsToPrint: 0,
      missingBarcodeCount: 0,
      templates: [],
      warnings: []
    }
  });

  const summary = useMemo(() => {
    const skuSet = new Set(batch.labels.map((label) => label.sku));

    return {
      totalLabels: batch.labels.length,
      uniqueSkus: skuSet.size,
      files: batch.files.length,
      items: batch.items.length
    };
  }, [batch]);

  return (
    <main className="page">
      <header className="hero">
        <h1>Warehouse Label Printer</h1>
        <p>
          Upload one or more PO PDFs, parse item rows, confirm the extracted data, then preview and print
          exact 32mm × 25mm labels.
        </p>
      </header>

      <section className="card">
        <FileUploader
          onBatchParsed={(nextBatch) => {
            setBatch({
              ...nextBatch,
              labels: []
            });
          }}
        />
      </section>

      <ParseReviewTable
        items={batch.items}
        onConfirm={({ items, labels }) => {
          setBatch((currentBatch) => ({
            ...currentBatch,
            items,
            labels,
            validation: buildBatchValidation(items, currentBatch.files)
          }));
        }}
      />

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
          <h2>{summary.items}</h2>
          <p>Parsed PO rows</p>
        </article>
        <article className="statCard">
          <h2>{summary.totalLabels}</h2>
          <p>Labels in print batch</p>
        </article>
      </section>

      <section className="card">
        <ParsedItemsTable items={batch.items} validation={batch.validation} />
      </section>

      <section className="card">
        <LabelSheet labels={batch.labels} />
      </section>
    </main>
  );
}
