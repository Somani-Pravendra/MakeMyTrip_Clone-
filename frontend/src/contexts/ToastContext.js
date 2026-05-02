import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import "./ToastContext.css";

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type = "info",
      title = "",
      message = "",
      duration = DEFAULT_DURATION
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toast = { id, type, title, message };

      setToasts((current) => [...current, toast]);

      const timeout = window.setTimeout(() => {
        dismissToast(id);
      }, duration);

      timersRef.current.set(id, timeout);
      return id;
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast
    }),
    [showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-card--${toast.type}`}>
            <div className="toast-card__copy">
              {toast.title && <p className="toast-card__title">{toast.title}</p>}
              {toast.message && <p className="toast-card__message">{toast.message}</p>}
            </div>
            <button
              type="button"
              className="toast-card__close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
