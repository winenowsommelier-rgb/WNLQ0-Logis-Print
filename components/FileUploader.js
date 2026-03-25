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
    const lines = content.items
      .map((item) => `${item.str}${item.hasEOL ? "\n" : " "}`)
      .join("");
    pageTexts.push(lines);
  }

  return pageTexts.join("\n");
}

export default function FileUploader({ onItemsParsed, onFilesProcessed }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("No files selected");
  const [debugText, setDebugText] = useState(""); // Add debug text state

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
      let allText = "";

      for (const file of selectedFiles) {
        const text = await extractTextFromPdf(file);
        console.log(`Extracted text from ${file.name}:`, text); // Debug log
        allText += `=== ${file.name} ===\n${text}\n\n`;
        const fileItems = parsePOTextToItems(text, file.name);
        console.log(`Parsed items from ${file.name}:`, fileItems); // Debug log
        allItems.push(...fileItems);
      }

      onFilesProcessed(selectedFiles.map((file) => file.name));
      onItemsParsed(allItems);

      if (!allItems.length) {
        setDebugText(allText); // Show extracted text for debugging
        setStatus(
          `Parsed ${selectedFiles.length} file(s), but no SKU rows were found. Expected SKU token length: 8-12 characters. Check the extracted text below.`
        );
      } else {
        setDebugText(""); // Clear debug text on success
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
      {debugText && (
        <details className="debugSection">
          <summary>Extracted Text (for debugging)</summary>
          <pre className="debugText">{debugText}</pre>
        </details>
      )}
    </div>
  );
}
