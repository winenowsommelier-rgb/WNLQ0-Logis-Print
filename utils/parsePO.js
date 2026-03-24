const BARCODE_REGEX = /Barcode\s*:\s*([A-Za-z0-9-]+)/i;

const STRICT_PATTERNS = [
  /^(\d+)\s+([A-Za-z0-9][A-Za-z0-9._-]{2,})\s+(.+?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)(?:\s+Barcode\s*:\s*([A-Za-z0-9-]+))?$/i,
  /^([A-Za-z0-9][A-Za-z0-9._-]{2,})\s+(.+?)\s+(\d+)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)(?:\s+Barcode\s*:\s*([A-Za-z0-9-]+))?$/i
];

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function looksLikeSku(token) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9._-]{3,}$/.test(token);
}

function extractBarcode(lines, startIndex, fallbackKey) {
  for (let i = startIndex; i < Math.min(startIndex + 8, lines.length); i += 1) {
    const barcodeMatch = lines[i].match(BARCODE_REGEX);
    if (barcodeMatch) {
      return barcodeMatch[1];
    }
  }

  return fallbackKey;
}

function parseByStrictPatterns(line) {
  for (const pattern of STRICT_PATTERNS) {
    const match = line.match(pattern);
    if (!match) {
      continue;
    }

    if (pattern === STRICT_PATTERNS[0]) {
      const [, qtyRaw, sku, productName, , , inlineBarcode] = match;
      return { qtyRaw, sku, productName, inlineBarcode };
    }

    const [, sku, productName, qtyRaw, , , inlineBarcode] = match;
    return { qtyRaw, sku, productName, inlineBarcode };
  }

  return null;
}

function parseByHeuristic(line) {
  const tokens = line.split(" ");

  const skuIndex = tokens.findIndex((token) => looksLikeSku(token));
  if (skuIndex < 0) {
    return null;
  }

  const qtyBefore = skuIndex > 0 && /^\d+$/.test(tokens[skuIndex - 1]) ? tokens[skuIndex - 1] : null;
  const qtyAfter = skuIndex + 1 < tokens.length && /^\d+$/.test(tokens[skuIndex + 1]) ? tokens[skuIndex + 1] : null;
  const qtyRaw = qtyBefore || qtyAfter;

  if (!qtyRaw) {
    return null;
  }

  const qtyIndex = qtyBefore ? skuIndex - 1 : skuIndex + 1;
  const tail = tokens.slice(Math.max(skuIndex, qtyIndex) + 1);

  // Keep product text before obvious price/amount segments.
  const priceStart = tail.findIndex((token) => /^\d+(?:\.\d{1,2})?$/.test(token));
  const productTokens = priceStart >= 0 ? tail.slice(0, priceStart) : tail;

  const productName = productTokens.join(" ").trim();
  if (!productName) {
    return null;
  }

  return {
    qtyRaw,
    sku: tokens[skuIndex],
    productName,
    inlineBarcode: null
  };
}

export function parsePOTextToItems(text, sourceName = "unknown.pdf") {
  const lines = normalizeText(text);
  const items = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    const strictMatch = parseByStrictPatterns(line);
    const heuristicMatch = strictMatch || parseByHeuristic(line);

    if (!heuristicMatch) {
      continue;
    }

    const { qtyRaw, sku, productName, inlineBarcode } = heuristicMatch;
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
