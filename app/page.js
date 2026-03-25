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
      <section className="heroShell">
        <header className="hero">
          <div className="eyebrow">WINE-NOW OPERATIONS</div>
          <div className="heroGrid">
            <div className="heroCopy">
              <h1>Premium label preparation for retail-ready bottle handling.</h1>
              <p>
                Ingest purchase orders, verify extracted rows, and release print-ready sticker sheets
                tuned for your 110mm thermal roll stock.
              </p>
              <div className="heroFootnote">
                Designed for calm operator review, consistent barcode output, and cleaner handoff to
                warehouse printing.
              </div>
            </div>

            <div className="heroPanel">
              <div className="heroPanelKicker">Current session</div>
              <div className="heroPanelMetric">{summary.totalLabels}</div>
              <div className="heroPanelText">labels queued for print</div>
              <div className="heroPanelMeta">
                <span>{summary.files} file(s)</span>
                <span>{summary.items} parsed row(s)</span>
                <span>{summary.uniqueSkus} unique SKU(s)</span>
              </div>
            </div>
          </div>
        </header>

        <section className="workflowStrip" aria-label="Workflow">
          <article className="workflowItem">
            <span className="workflowStep">01</span>
            <h2>Import</h2>
            <p>Load supplier PDFs and reconstruct each line with layout-aware extraction.</p>
          </article>
          <article className="workflowItem">
            <span className="workflowStep">02</span>
            <h2>Validate</h2>
            <p>Review detected rows, correct edge cases, and confirm only trusted items move forward.</p>
          </article>
          <article className="workflowItem">
            <span className="workflowStep">03</span>
            <h2>Release</h2>
            <p>Preview the final label composition, export HTML, or send a print-only document.</p>
          </article>
        </section>
      </section>

      <section className="workspace card cardPrimary">
        <div className="cardHeading">
          <div>
            <div className="sectionEyebrow">Intake</div>
            <h2>Purchase Order Intake</h2>
            <p className="small">
              Upload one or more purchase orders to prepare a clean, reviewable print batch.
            </p>
          </div>
        </div>
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
          <span className="statLabel">Files</span>
          <h2>{summary.files}</h2>
          <p>documents currently loaded</p>
        </article>
        <article className="statCard">
          <span className="statLabel">Unique SKUs</span>
          <h2>{summary.uniqueSkus}</h2>
          <p>distinct codes prepared for print</p>
        </article>
        <article className="statCard">
          <span className="statLabel">Parsed Rows</span>
          <h2>{summary.items}</h2>
          <p>validated line items in review</p>
        </article>
        <article className="statCard">
          <span className="statLabel">Print Batch</span>
          <h2>{summary.totalLabels}</h2>
          <p>labels ready for release</p>
        </article>
      </section>

      <section className="card">
        <ParsedItemsTable items={batch.items} validation={batch.validation} />
      </section>

      <section className="card cardPreview">
        <LabelSheet labels={batch.labels} />
      </section>
    </main>
  );
}
