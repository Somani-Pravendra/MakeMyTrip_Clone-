const TOKEN_KEY = "token";
const USER_KEY = "user";

const safeGetItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage errors so auth flow stays usable.
  }
};

const safeRemoveItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // Ignore storage cleanup failures.
  }
};

export const getStoredToken = () => safeGetItem(TOKEN_KEY);

export const setStoredToken = (token) => {
  if (token) {
    safeSetItem(TOKEN_KEY, token);
  }
};

export const clearStoredToken = () => {
  safeRemoveItem(TOKEN_KEY);
};

export const getStoredUser = () => {
  const raw = safeGetItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    safeRemoveItem(USER_KEY);
    return null;
  }
};

export const setStoredUser = (user) => {
  if (user) {
    safeSetItem(USER_KEY, JSON.stringify(user));
  }
};

export const clearStoredUser = () => {
  safeRemoveItem(USER_KEY);
};

export const clearStoredAuth = () => {
  clearStoredToken();
  clearStoredUser();
};
