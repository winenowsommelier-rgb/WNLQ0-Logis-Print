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

// Flexible line parser for non-standard PO formats
function parseFlexibleLine(line) {
  const tokens = line.split(/\s+/);
  if (tokens.length < 3) return null;

  // Try to find patterns: [qty] [sku] [product...] [price] [total]
  let qtyIdx = -1;
  let skuIdx = -1;
  let priceIdx = -1;

  // Scan for quantity (1-3 digits, 1-500)
  for (let i = 0; i < tokens.length; i++) {
    if (/^\d{1,3}$/.test(tokens[i]) && 1 <= Number.parseInt(tokens[i], 10) && Number.parseInt(tokens[i], 10) <= 500) {
      qtyIdx = i;
      break;
    }
  }

  // Scan for SKU (3-14 chars, mix of letters/numbers/dashes, NOT pure numbers)
  for (let i = 0; i < tokens.length; i++) {
    if (/^[A-Z0-9_-]{3,14}$/i.test(tokens[i]) && /[A-Z_-]/i.test(tokens[i])) {
      skuIdx = i;
      break;
    }
  }

  // Scan for price (money format: 1.99, 10.00, $1.99, etc.)
  for (let i = 0; i < tokens.length; i++) {
    if (/^\$?\d+(?:,\d{3})*(?:\.\d{2})?$/.test(tokens[i])) {
      priceIdx = i;
      break;
    }
  }

  if (qtyIdx < 0 || skuIdx < 0) {
    return null;
  }

  const qty = Number.parseInt(tokens[qtyIdx], 10);
  const sku = tokens[skuIdx];
  const productStart = Math.min(qtyIdx, skuIdx) + 1;
  const productEnd = priceIdx >= 0 ? priceIdx : tokens.length;
  const productName = tokens.slice(productStart, productEnd).join(" ") || sku;

  return {
    sku,
    productName,
    quantity: qty
  };
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
  const seen = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    let parsed = null;

    // Try rigid format first (strict regex)
    const lineMatch = line.match(ITEM_LINE_REGEX);
    if (lineMatch) {
      const [, qtyRaw, sku, productName, , , inlineBarcode] = lineMatch;
      const quantity = Number.parseInt(qtyRaw, 10);
      if (Number.isFinite(quantity) && quantity >= 1) {
        parsed = {
          sku,
          productName: productName.trim(),
          quantity,
          barcode: inlineBarcode || extractBarcode(lines, index, sku)
        };
      }
    }

    // Fall back to flexible parsing if rigid regex fails
    if (!parsed) {
      parsed = parseFlexibleLine(line);
      if (parsed) {
        parsed.barcode = extractBarcode(lines, index, parsed.sku);
      }
    }

    if (!parsed) {
      continue;
    }

    const dedupeKey = `${parsed.sku}|${parsed.quantity}|${parsed.productName}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);

    items.push({
      sku: parsed.sku,
      productName: parsed.productName,
      quantity: parsed.quantity,
      barcode: parsed.barcode,
      sourceName
    });
  }

  console.log(`[${sourceName}] Parsed ${items.length} items from ${lines.length} lines`);
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
