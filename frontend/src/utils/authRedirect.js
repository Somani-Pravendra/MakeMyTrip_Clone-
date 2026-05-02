const AUTH_REDIRECT_STORAGE_KEY = "mmt_auth_redirect";
const DISALLOWED_REDIRECT_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
  "/google-callback"
];

const isValidRedirectTarget = (value) => {
  if (typeof value !== "string") return false;

  const normalized = value.trim();
  if (!normalized.startsWith("/")) return false;

  return !DISALLOWED_REDIRECT_PREFIXES.some((prefix) =>
    normalized === prefix || normalized.startsWith(`${prefix}?`) || normalized.startsWith(`${prefix}#`)
  );
};

export const buildAuthRedirect = (to, state = null) => {
  if (!isValidRedirectTarget(to)) {
    return null;
  }

  return {
    to: to.trim(),
    state: state ?? null
  };
};

export const saveAuthRedirect = (redirect) => {
  if (!redirect || !isValidRedirectTarget(redirect.to)) {
    return;
  }

  try {
    localStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, JSON.stringify(redirect));
  } catch (error) {
    // Keep auth flow working even if storage is unavailable.
  }
};

export const getSavedAuthRedirect = () => {
  try {
    const raw = localStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return isValidRedirectTarget(parsed?.to)
      ? { to: parsed.to, state: parsed?.state ?? null }
      : null;
  } catch (error) {
    return null;
  }
};

export const clearSavedAuthRedirect = () => {
  try {
    localStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  } catch (error) {
    // Ignore storage cleanup failures.
  }
};

export const consumeSavedAuthRedirect = () => {
  const redirect = getSavedAuthRedirect();
  clearSavedAuthRedirect();
  return redirect;
};

export const getAuthRedirectFromLocationState = (locationState) => {
  const redirect = locationState?.authRedirect;

  if (isValidRedirectTarget(redirect?.to)) {
    return {
      to: redirect.to,
      state: redirect?.state ?? null
    };
  }

  return null;
};
