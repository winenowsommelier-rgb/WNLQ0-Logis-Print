"use client";

import { useState } from "react";
import { expandItemsToLabels, parsePOTextToItems } from "@/utils/parsePO";

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

  // `disableWorker` avoids worker URL issues in constrained runtime environments.
  const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

  const pageTexts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = content.items
      .map((item) => `${item.str}${item.hasEOL ? "\n" : " "}`)
      .join("");
    pageTexts.push(lines);
  }

  return pageTexts.join("\n");
}

export default function FileUploader({ onLabelsParsed, onFilesProcessed }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("No files selected");

  const resetBatch = () => {
    onLabelsParsed([]);
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
        const text = await extractTextFromPdf(file);
        const fileItems = parsePOTextToItems(text, file.name);
        allItems.push(...fileItems);
      }

      const labels = expandItemsToLabels(allItems);
      onFilesProcessed(selectedFiles.map((file) => file.name));
      onLabelsParsed(labels);

      if (!labels.length) {
        setStatus(
          `Parsed ${selectedFiles.length} file(s), but no SKU rows were found. Expected SKU token length: 8-12 characters.`
        );
      } else {
        setStatus(
          `Done. Parsed ${allItems.length} line items from ${selectedFiles.length} PO(s) into ${labels.length} labels.`
        );
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Unknown PDF parse error";
      setStatus(`Failed to parse PDF(s): ${message}`);
      onLabelsParsed([]);
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
