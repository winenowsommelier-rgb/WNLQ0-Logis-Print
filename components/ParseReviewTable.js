"use client";

import { useMemo, useState } from "react";
import { expandItemsToLabels } from "@/utils/parsePO";

export default function ParseReviewTable({ items, onConfirm }) {
  const [rows, setRows] = useState(items);

  const totalQty = useMemo(
    () => rows.reduce((acc, row) => acc + (Number.isFinite(row.quantity) ? row.quantity : 0), 0),
    [rows]
  );

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) {
          return row;
        }

        if (field === "quantity") {
          return { ...row, quantity: Number.parseInt(value || "0", 10) || 0 };
        }

        return { ...row, [field]: value };
      })
    );
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const confirm = () => {
    const validRows = rows.filter(
      (row) => row.sku && row.sku.length >= 8 && row.sku.length <= 12 && row.quantity > 0
    );
    onConfirm({
      items: validRows,
      labels: expandItemsToLabels(validRows)
    });
  };

  if (!items.length) {
    return null;
  }

  return (
    <section className="card">
      <h2>Confirm parsed SKU + quantity</h2>
      <p className="small">
        Review and fix rows before generating labels. Only rows with SKU (8-12 chars) and qty &gt; 0 are used.
      </p>

      <div className="tableWrap">
        <table className="reviewTable">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Qty</th>
              <th>Item name</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.sku}-${index}`}>
                <td>
                  <input
                    className="tableInput"
                    value={row.sku}
                    onChange={(e) => updateRow(index, "sku", e.target.value.trim())}
                  />
                </td>
                <td>
                  <input
                    className="tableInput"
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => updateRow(index, "quantity", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="tableInput"
                    value={row.productName}
                    onChange={(e) => updateRow(index, "productName", e.target.value)}
                  />
                </td>
                <td>
                  <button className="btn btnDanger" type="button" onClick={() => removeRow(index)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="controls screenOnly">
        <span className="small">Rows: {rows.length} · Total Qty: {totalQty}</span>
        <button className="btn" type="button" onClick={confirm}>
          Confirm and Generate Labels
        </button>
      </div>
    </section>
  );
}
