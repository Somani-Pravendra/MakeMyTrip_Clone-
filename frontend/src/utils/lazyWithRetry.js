import React from "react";

const DEFAULT_RETRY_KEY = "mmt:lazy-retry";

const canUseSessionStorage = () => typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

const isChunkLoadFailure = (error) => {
  const message = String(error?.message || "");
  const name = String(error?.name || "");

  return name === "ChunkLoadError" ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message);
};

const markRetry = (retryKey) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(retryKey, "1");
};

const clearRetry = (retryKey) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(retryKey);
};

const hasRetried = (retryKey) => canUseSessionStorage() && window.sessionStorage.getItem(retryKey) === "1";

export const lazyWithRetry = (importer, retryKey = DEFAULT_RETRY_KEY) =>
  React.lazy(async () => {
    try {
      const module = await importer();
      clearRetry(retryKey);
      return module;
    } catch (error) {
      if (isChunkLoadFailure(error) && typeof window !== "undefined" && !hasRetried(retryKey)) {
        markRetry(retryKey);
        window.location.reload();
        return new Promise(() => {});
      }

      clearRetry(retryKey);
      throw error;
    }
  });

export default lazyWithRetry;
