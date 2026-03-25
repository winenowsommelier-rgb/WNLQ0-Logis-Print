"use client";

export default function ParsedItemsTable({ items, validation }) {
  return (
    <section>
      <div className="sectionHeader">
        <div>
          <h2>Extraction Validation</h2>
          <p className="small">
            Review the parsed PO rows before printing. The sample template detected here is
            `qty sku product price total`.
          </p>
        </div>
      </div>

      {validation.warnings.length ? (
        <div className="warningBox">
          {validation.warnings.map((warning) => (
            <p key={warning} className="warningText">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      <div className="templateList small">
        {validation.templates.length
          ? validation.templates.map((template) => (
              <span key={template.name} className="templateChip">
                {template.name}: {template.count}
              </span>
            ))
          : "No template detected yet."}
      </div>

      <div className="tableWrap">
        {items.length ? (
          <table className="itemsTable">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Barcode</th>
                <th>Template</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.sourceName}-${item.sku}-${item.productName}`}>
                  <td>{item.sku}</td>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.barcode}</td>
                  <td>{item.template}</td>
                  <td>{item.sourceName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="small">Upload a purchase order PDF to see parsed rows and validation warnings.</p>
        )}
      </div>
    </section>
  );
}
