import stringSimilarity from "string-similarity";

export function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchHeader(candidate: string, target: string) {
  const candidateNormalized = normalizeHeader(candidate);
  const targetNormalized = normalizeHeader(target);
  const ratio = stringSimilarity.compareTwoStrings(candidateNormalized, targetNormalized);

  return {
    ratio,
    normalized: candidateNormalized,
    targetNormalized,
  };
}
