import { API_BASE_URL } from "./api";

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const MEDIA_FALLBACKS = {
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&h=600&fit=crop",
  package: "https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?w=900&h=600&fit=crop&q=80",
};

const toSeedSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "travel";

const normalizeDeprecatedUnsplashUrl = (source = "") => {
  const normalizedSource = String(source || "").trim();
  if (!/^(https?:)?\/\/source\.unsplash\.com\//i.test(normalizedSource)) {
    return normalizedSource;
  }

  const queryPart = normalizedSource.split("?")[1] || "";
  const seed = toSeedSlug(decodeURIComponent(queryPart || normalizedSource));
  return `https://picsum.photos/seed/${seed}/900/600`;
};

export const resolveMediaUrl = (value, fallback = "") => {
  const source = String(value || "").trim();
  if (!source) return fallback;

  if (/^(https?:)?\/\//i.test(source) || source.startsWith("data:") || source.startsWith("blob:")) {
    return normalizeDeprecatedUnsplashUrl(source);
  }

  const normalizedSource = source.replace(/\\/g, "/");

  if (normalizedSource.startsWith("/")) {
    return `${ASSET_BASE_URL}${normalizedSource}`;
  }

  return `${ASSET_BASE_URL}/${normalizedSource.replace(/^\.?\//, "")}`;
};

export const applyImageFallback = (event, fallback) => {
  if (!fallback || event.currentTarget.dataset.fallbackApplied === "true") return;

  event.currentTarget.dataset.fallbackApplied = "true";
  event.currentTarget.src = fallback;
};
