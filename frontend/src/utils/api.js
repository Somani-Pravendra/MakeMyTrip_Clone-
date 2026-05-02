const FALLBACK_API_BASE_URL = 'http://localhost:5000/api';

const normalizeApiBaseUrl = (value) => {
  if (!value || typeof value !== 'string') return FALLBACK_API_BASE_URL;

  const trimmed = value.trim();
  if (!trimmed) return FALLBACK_API_BASE_URL;

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');

  if (withoutTrailingSlash.endsWith('/api')) {
    return withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);

export { API_BASE_URL, normalizeApiBaseUrl };
export default API_BASE_URL;
