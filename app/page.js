"use client";

import { useMemo, useState } from "react";
import FileUploader from "@/components/FileUploader";
import LabelSheet from "@/components/LabelSheet";
import ParseReviewTable from "@/components/ParseReviewTable";
import ExtractionDebugger from "@/components/ExtractionDebugger";
import { expandItemsToLabels } from "@/utils/parsePO";

export default function HomePage() {
  const [labels, setLabels] = useState([]);
  const [parsedItems, setParsedItems] = useState([]);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [extractionBatches, setExtractionBatches] = useState([]);

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
          Upload one or more PO PDFs, parse SKU/quantity rows, confirm parsed rows, then generate and print
          exact 32mm × 25mm labels.
        </p>
      </header>

      <section className="card">
        <FileUploader
          onItemsParsed={(items) => {
            setParsedItems(items);
            setLabels([]);
            setExtractionBatches([]);
          }}
          onFilesProcessed={setSourceFiles}
          onExtractionReady={setExtractionBatches}
        />
      </section>

      <ExtractionDebugger
        batches={extractionBatches}
        onApplyTemplate={(items) => {
          setParsedItems(items);
          setLabels(expandItemsToLabels(items));
        }}
      />

      <ParseReviewTable
        items={parsedItems}
        onConfirm={({ items, labels: generatedLabels }) => {
          setParsedItems(items);
          setLabels(generatedLabels);
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
