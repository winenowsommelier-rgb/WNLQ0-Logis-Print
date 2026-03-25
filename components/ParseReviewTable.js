"use client";

import { useMemo, useState, useEffect } from "react";
import { expandItemsToLabels } from "@/utils/parsePO";

export default function ParseReviewTable({ items, onConfirm }) {
  const [rows, setRows] = useState(items);

  // Sync rows when items prop changes (new PDF parse)
  useEffect(() => {
    setRows(items);
  }, [items]);

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
      (row) => row.sku && row.sku.length >= 3 && row.sku.length <= 14 && row.quantity > 0
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
      <div className="sectionEyebrow">Confirmation</div>
      <h2>Release Candidate Review</h2>
      <p className="small">
        Refine the extracted rows before labels are generated. Only rows with a valid SKU and quantity
        greater than zero are released into the print batch.
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
          Release To Label Preview
        </button>
      </div>
    </section>
  );
}
