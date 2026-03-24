"use client";

import { useState } from "react";
import { parsePOTextToItems } from "@/utils/parsePO";

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
    // Use CDN worker path to avoid bundler/runtime worker resolution failures.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;
  }

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (workerError) {
    // Fallback mode for environments where worker boot fails.
    pdf = await pdfjsLib.getDocument({ data, disableWorker: true, workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc }).promise;
  }

  const pageTexts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const rows = [];
    const tolerance = 2;

    for (const item of content.items) {
      const text = item.str?.trim();
      if (!text) {
        continue;
      }

      const x = item.transform?.[4] ?? 0;
      const y = item.transform?.[5] ?? 0;

      let row = rows.find((candidate) => Math.abs(candidate.y - y) <= tolerance);
      if (!row) {
        row = { y, words: [] };
        rows.push(row);
      }

      row.words.push({ x, text });
    }

    rows.sort((a, b) => b.y - a.y);

    const pageLines = rows.map((row) =>
      row.words
        .sort((a, b) => a.x - b.x)
        .map((word) => word.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    );

    pageTexts.push(pageLines.join("\n"));
  }

  return { text: pageTexts.join("\n"), rows: pageTexts.flatMap((page) => page.split("\n")).filter(Boolean).map((line) => ({ line })) };
}

export default function FileUploader({ onItemsParsed, onFilesProcessed, onExtractionReady }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("No files selected");

  const resetBatch = () => {
    onItemsParsed([]);
    onFilesProcessed([]);
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

      for (const file of selectedFiles) {
        const extracted = await extractTextFromPdf(file);
        const fileItems = parsePOTextToItems(extracted.text, file.name);
        if (onExtractionReady) {
          onExtractionReady((prev) => [...prev, { sourceName: file.name, rows: extracted.rows }]);
        }
        allItems.push(...fileItems);
      }

      onFilesProcessed(selectedFiles.map((file) => file.name));
      onItemsParsed(allItems);

      if (!allItems.length) {
        setStatus(
          `Parsed ${selectedFiles.length} file(s), but no SKU rows were found. Expected SKU token length: 8-12 characters.`
        );
      } else {
        setStatus(
          `Done. Parsed ${allItems.length} line item(s). Please confirm rows before generating labels.`
        );
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Unknown PDF parse error";
      setStatus(`Failed to parse PDF(s): ${message}`);
      onItemsParsed([]);
      onFilesProcessed([]);
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
        <button className="btn" type="button" onClick={() => window.print()} disabled={isProcessing}>
          Print Labels
        </button>
        <button className="btn btnSecondary" type="button" onClick={resetBatch} disabled={isProcessing}>
          Clear Batch
        </button>
      </div>
      <p className="small">{status}</p>
    </div>
  );
}
