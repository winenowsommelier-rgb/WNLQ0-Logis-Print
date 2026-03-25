"use client";

import { useState } from "react";
import { buildBatchValidation, parsePOTextToItems } from "@/utils/parsePO";

let pdfjsLibPromise;

async function getPdfLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }

  return pdfjsLibPromise;
}

async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const pdfjsLib = await getPdfLib();

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Fall back to the hosted worker because some runtime builds fail to resolve the bundled path.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;
  }

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch {
    pdf = await pdfjsLib.getDocument({
      data,
      disableWorker: true,
      workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc
    }).promise;
  }

  const pageTexts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const rows = [];

    for (const item of content.items) {
      const value = item.str?.trim();
      if (!value) {
        continue;
      }

      const x = item.transform?.[4] ?? 0;
      const y = item.transform?.[5] ?? 0;
      const matchingRow = rows.find((row) => Math.abs(row.y - y) <= 2);

      if (matchingRow) {
        matchingRow.items.push({ value, x });
      } else {
        rows.push({ y, items: [{ value, x }] });
      }
    }

    const pageLines = rows
      .sort((left, right) => right.y - left.y)
      .map((row) =>
        row.items
          .sort((left, right) => left.x - right.x)
          .map((item) => item.value)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter(Boolean);

    pageTexts.push(pageLines.join("\n"));
  }

  return pageTexts.join("\n");
}

export default function FileUploader({ onBatchParsed }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("No files selected");
  const [debugText, setDebugText] = useState("");

  const resetBatch = () => {
    onBatchParsed({
      labels: [],
      items: [],
      files: [],
      validation: buildBatchValidation([], [])
    });
    setDebugText("");
    setStatus("Cleared current print batch.");
  };

  const onFileChange = async (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    setIsProcessing(true);
    setStatus(`Processing ${selectedFiles.length} file(s)...`);

    try {
      const allItems = [];
      let allText = "";

      for (const file of selectedFiles) {
        const text = await extractTextFromPdf(file);
        allText += `=== ${file.name} ===\n${text}\n\n`;
        const fileItems = parsePOTextToItems(text, file.name);
        allItems.push(...fileItems);
      }

      const files = selectedFiles.map((file) => file.name);
      const validation = buildBatchValidation(allItems, files);

      onBatchParsed({
        labels: [],
        items: allItems,
        files,
        validation
      });

      if (!allItems.length) {
        setDebugText(allText);
        setStatus(
          `Parsed ${selectedFiles.length} file(s), but no valid item rows were found. Check the extracted text below.`
        );
      } else {
        setDebugText("");
        setStatus(
          validation.warnings.length
            ? `Parsed ${allItems.length} line item(s) with ${validation.warnings.length} warning(s). Review and confirm before generating labels.`
            : `Done. Parsed ${allItems.length} line item(s). Review and confirm before generating labels.`
        );
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Unknown PDF parse error";
      setStatus(`Failed to parse PDF(s): ${message}`);
      onBatchParsed({
        labels: [],
        items: [],
        files: [],
        validation: {
          ...buildBatchValidation([], []),
          warnings: ["The PDF upload failed during extraction. Check the browser console for details."]
        }
      });
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  return (
    <div>
      <div className="controls screenOnly">
        <label className="fileInput btn" htmlFor="po-upload">
          Upload PO PDFs
        </label>
        <input
          id="po-upload"
          type="file"
          accept="application/pdf"
          multiple
          onChange={onFileChange}
          hidden
        />
        <button className="btn btnSecondary" type="button" onClick={resetBatch} disabled={isProcessing}>
          Clear Batch
        </button>
      </div>
      <p className="small">{status}</p>
      {debugText ? (
        <details className="debugSection">
          <summary>Extracted Text (for debugging)</summary>
          <pre className="debugText">{debugText}</pre>
        </details>
      ) : null}
    </div>
  );
}
