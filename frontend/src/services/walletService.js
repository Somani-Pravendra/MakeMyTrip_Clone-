import apiClient from "./apiClient";

export const getWalletSummary = async () => {
  const { data } = await apiClient.get("/wallet");

  if (!data?.success) {
    throw new Error(data?.message || "Failed to fetch wallet details");
  }

  return data;
};
