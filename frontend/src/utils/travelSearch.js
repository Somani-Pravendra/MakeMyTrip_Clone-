import { toDateInputValue } from "./dateTokens";

const normalizeSearchValue = (value = "") => String(value || "").trim().toLowerCase();

const toDateToken = (value = "") => {
  if (!value) return "";

  const stringValue = String(value).trim();
  if (!stringValue) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 10);
  }

  return toDateInputValue(value);
};

export const matchesPartialQuery = (query, candidates = []) => {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  return candidates
    .filter(Boolean)
    .some((candidate) => normalizeSearchValue(candidate).includes(normalizedQuery));
};

export const matchesDateQuery = (query, candidates = []) => {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) return true;

  return candidates
    .map((candidate) => toDateToken(candidate))
    .filter(Boolean)
    .some((candidate) => candidate.startsWith(normalizedQuery));
};
