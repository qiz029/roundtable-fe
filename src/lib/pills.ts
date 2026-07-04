export function splitPillText(value: string) {
  return value
    .split(/[\s,，]+/)
    .map(cleanPillValue)
    .filter(Boolean);
}

export function mergePillValues(current: string[], nextValues: string[]) {
  const merged = [...current];
  const seen = new Set(current.map(normalizePillValue));

  for (const value of nextValues) {
    const cleaned = cleanPillValue(value);
    const key = normalizePillValue(cleaned);
    if (!cleaned || seen.has(key)) continue;

    merged.push(cleaned);
    seen.add(key);
  }

  return merged;
}

export function pillToneClass(value: string) {
  let hash = 0;
  for (const char of normalizePillValue(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return `pillTone${hash % 10}`;
}

function cleanPillValue(value: string) {
  return value.trim().replace(/^#+/, "");
}

function normalizePillValue(value: string) {
  return cleanPillValue(value).toLowerCase();
}
