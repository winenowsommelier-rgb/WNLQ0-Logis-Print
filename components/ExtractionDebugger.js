"use client";

import { useMemo, useState } from "react";
import { parseRowsByTemplate } from "@/utils/parsePO";

const STORAGE_KEY = "po-parser-templates-v1";

function readTemplates() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeTemplates(templates) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }
}

export default function ExtractionDebugger({ batches, onApplyTemplate, onLockTemplate, lockedTemplateName }) {
  const [templates, setTemplates] = useState(readTemplates);
  const [selected, setSelected] = useState(templates[0]?.name || "");
  const [name, setName] = useState("");
  const [qtyIndex, setQtyIndex] = useState(0);
  const [skuIndex, setSkuIndex] = useState(1);

  const allRows = useMemo(() => batches.flatMap((batch) => batch.rows.map((row) => ({ ...row, sourceName: batch.sourceName }))), [batches]);

  const selectedTemplate = templates.find((tpl) => tpl.name === selected) || null;

  const saveTemplate = () => {
    if (!name) {
      return;
    }

    const template = { name, qtyIndex: Number(qtyIndex), skuIndex: Number(skuIndex) };
    const next = [...templates.filter((tpl) => tpl.name !== name), template];
    setTemplates(next);
    setSelected(name);
    writeTemplates(next);
  };

  const applyTemplate = () => {
    if (!selectedTemplate) {
      return;
    }

    const grouped = new Map();
    for (const batch of batches) {
      grouped.set(batch.sourceName, parseRowsByTemplate(batch.rows.map((r) => r.line), batch.sourceName, selectedTemplate));
    }

    const items = Array.from(grouped.values()).flat();
    onApplyTemplate(items);
  };

  const downloadRaw = () => {
    const blob = new Blob([JSON.stringify(batches, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "po-extracted-rows.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!batches.length) {
    return null;
  }

  return (
    <section className="card">
      <h2>Debug extraction + template mapping</h2>
      <p className="small">Download extracted rows, save qty/sku token index mapping by supplier, and re-parse.</p>

      <div className="controls screenOnly">
        <button className="btn" type="button" onClick={downloadRaw}>Download extracted rows JSON</button>
      </div>

      <div className="controls screenOnly">
        <input className="tableInput" placeholder="Template name (e.g. SK Liquor)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="tableInput" type="number" value={qtyIndex} onChange={(e) => setQtyIndex(e.target.value)} />
        <input className="tableInput" type="number" value={skuIndex} onChange={(e) => setSkuIndex(e.target.value)} />
        <button className="btn" type="button" onClick={saveTemplate}>Save Template</button>
      </div>

      <div className="controls screenOnly">
        <select className="tableInput" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select template</option>
          {templates.map((template) => (
            <option key={template.name} value={template.name}>{template.name}</option>
          ))}
        </select>
        <button className="btn" type="button" onClick={applyTemplate} disabled={!selectedTemplate}>Apply template parsing</button>
        <button className="btn" type="button" onClick={() => selectedTemplate && onLockTemplate?.(selectedTemplate)} disabled={!selectedTemplate}>Lock template for uploads</button>
      </div>

      <div className="previewWrap">
        <p className="small">First 60 extracted rows. Active lock: {lockedTemplateName || "none"}</p>
        <pre className="rawRows">{allRows.slice(0, 60).map((row) => `[${row.sourceName}] ${row.line}`).join("\n")}</pre>
      </div>
    </section>
  );
}
