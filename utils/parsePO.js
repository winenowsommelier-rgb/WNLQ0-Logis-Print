const ITEM_LINE_REGEX = /^(\d+)\s+([A-Z0-9_-]{3,})\s+(.+?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)(?:\s+Barcode\s*:\s*([A-Za-z0-9-]+))?$/i;
const BARCODE_REGEX = /Barcode\s*:\s*([A-Za-z0-9-]+)/i;

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractBarcode(lines, startIndex, fallbackKey) {
  for (let i = startIndex; i < Math.min(startIndex + 6, lines.length); i += 1) {
    const barcodeMatch = lines[i].match(BARCODE_REGEX);
    if (barcodeMatch) {
      return barcodeMatch[1];
    }
  }

  return fallbackKey;
}

export function parsePOTextToItems(text, sourceName = "unknown.pdf") {
  const lines = normalizeText(text);
  const items = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineMatch = line.match(ITEM_LINE_REGEX);

    if (!lineMatch) {
      continue;
    }

    const [, qtyRaw, sku, productName, , , inlineBarcode] = lineMatch;
    const quantity = Number.parseInt(qtyRaw, 10);
    if (!Number.isFinite(quantity) || quantity < 1) {
      continue;
    }

    items.push({
      sku,
      productName: productName.trim(),
      quantity,
      barcode: inlineBarcode || extractBarcode(lines, index, sku),
      sourceName
    });
  }

  return items;
}

export function expandItemsToLabels(items) {
  const labels = [];

  for (const item of items) {
    for (let copy = 0; copy < item.quantity; copy += 1) {
      labels.push({
        id: `${item.sourceName}-${item.sku}-${item.barcode}-${copy}`,
        sku: item.sku,
        productName: item.productName,
        barcode: item.barcode,
        quantity: item.quantity,
        copyNumber: copy + 1,
        sourceName: item.sourceName
      });
    }
  }

  return labels;
}
