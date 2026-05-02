import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import './AdminUXContext.css';

const AdminUXContext = createContext(null);

const DEFAULT_CONFIRM_STATE = {
    title: 'Confirm action',
    message: 'Please confirm to continue.',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    tone: 'default'
};

export function AdminUXProvider({ children }) {
    const { showToast } = useToast();
    const [confirmState, setConfirmState] = useState(null);

    const closeConfirm = useCallback((confirmed) => {
        setConfirmState((current) => {
            if (current?.resolve) {
                current.resolve(Boolean(confirmed));
            }
            return null;
        });
    }, []);

    const confirm = useCallback((options = {}) => new Promise((resolve) => {
        setConfirmState({
            ...DEFAULT_CONFIRM_STATE,
            ...options,
            resolve
        });
    }), []);

    const notify = useCallback(({ type = 'info', title = '', message = '', duration } = {}) => {
        showToast({ type, title, message, duration });
    }, [showToast]);

    const value = useMemo(() => ({
        confirm,
        notify
    }), [confirm, notify]);

    return (
        <AdminUXContext.Provider value={value}>
            {children}
            {confirmState && (
                <div className="admin-confirm-overlay" role="presentation" onClick={() => closeConfirm(false)}>
                    <div
                        className={`admin-confirm-dialog admin-confirm-dialog--${confirmState.tone}`}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="admin-confirm-title"
                        aria-describedby="admin-confirm-message"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="admin-confirm-dialog__icon" aria-hidden="true">
                            {confirmState.tone === 'danger' ? '!' : '?'}
                        </div>
                        <div className="admin-confirm-dialog__copy">
                            <p id="admin-confirm-title" className="admin-confirm-dialog__title">{confirmState.title}</p>
                            <p id="admin-confirm-message" className="admin-confirm-dialog__message">{confirmState.message}</p>
                        </div>
                        <div className="admin-confirm-dialog__actions">
                            <button
                                type="button"
                                className="cancel-btn admin-confirm-dialog__btn"
                                onClick={() => closeConfirm(false)}
                            >
                                {confirmState.cancelLabel}
                            </button>
                            <button
                                type="button"
                                className={`admin-confirm-dialog__btn ${confirmState.tone === 'danger' ? 'delete-btn' : 'upload-btn'}`}
                                onClick={() => closeConfirm(true)}
                            >
                                {confirmState.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminUXContext.Provider>
    );
}

export function useAdminUX() {
    const context = useContext(AdminUXContext);
    if (!context) {
        throw new Error('useAdminUX must be used within an AdminUXProvider');
    }
    return context;
}
