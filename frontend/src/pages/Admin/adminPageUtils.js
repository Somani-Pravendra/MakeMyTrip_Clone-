import { useEffect } from "react";

export const getAdminAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getNormalizedSearchTerm = (value = "") =>
  String(value || "").trim().toLowerCase();

export const includesNormalizedSearch = (value, normalizedSearchTerm) => {
  if (!normalizedSearchTerm) return true;
  return String(value || "").toLowerCase().includes(normalizedSearchTerm);
};

export const exportRowsAsCsv = (rows = [], filename = "export.csv") => {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const useClampedAdminPage = (totalPages, setCurrentPage) => {
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(totalPages, 1)));
  }, [totalPages, setCurrentPage]);
};
