import React from 'react';
import './AdminIcons.css';

const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};

const IconFrame = ({ children, className = '' }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
    >
        {children}
    </svg>
);

const AdminIcon = ({ name, className = '' }) => {
    switch (name) {
        case 'brand':
        case 'flight':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M3 15.5 21 8.5l-7.2 12-2.2-5.1L6.5 13Z" />
                    <path {...strokeProps} d="m11.6 15.4 2.2 5.1" />
                    <path {...strokeProps} d="M6.5 13 3 15.5" />
                </IconFrame>
            );
        case 'dashboard':
            return (
                <IconFrame className={className}>
                    <rect {...strokeProps} x="4" y="4" width="7" height="7" rx="2" />
                    <rect {...strokeProps} x="13" y="4" width="7" height="5" rx="2" />
                    <rect {...strokeProps} x="13" y="11" width="7" height="9" rx="2" />
                    <rect {...strokeProps} x="4" y="13" width="7" height="7" rx="2" />
                </IconFrame>
            );
        case 'hotel':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M5 20V6l4-2 4 2 6-2v16" />
                    <path {...strokeProps} d="M9 20v-4h4v4" />
                    <path {...strokeProps} d="M8 9h.01M12 9h.01M8 12h.01M12 12h.01M16 10h.01M16 13h.01" />
                </IconFrame>
            );
        case 'train':
            return (
                <IconFrame className={className}>
                    <rect {...strokeProps} x="6" y="4" width="12" height="12" rx="3" />
                    <path {...strokeProps} d="M9 8h6M8 20l2-3m4 0 2 3M7 16h10" />
                    <circle cx="10" cy="12" r="1" fill="currentColor" />
                    <circle cx="14" cy="12" r="1" fill="currentColor" />
                </IconFrame>
            );
        case 'bus':
            return (
                <IconFrame className={className}>
                    <rect {...strokeProps} x="4" y="5" width="16" height="11" rx="3" />
                    <path {...strokeProps} d="M7 9h10M7 20l1.5-3M15.5 17 17 20M6 16h12" />
                    <circle cx="8.5" cy="14" r="1" fill="currentColor" />
                    <circle cx="15.5" cy="14" r="1" fill="currentColor" />
                </IconFrame>
            );
        case 'cab':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M5 15 7.5 9h9L19 15" />
                    <path {...strokeProps} d="M4 15h16v3a2 2 0 0 1-2 2h-1v-2H7v2H6a2 2 0 0 1-2-2Z" />
                    <circle cx="8" cy="15" r="1" fill="currentColor" />
                    <circle cx="16" cy="15" r="1" fill="currentColor" />
                </IconFrame>
            );
        case 'package':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M16 8h-4l-4 8h4l4-8Z" />
                    <path {...strokeProps} d="M12 11V5l-5 5" />
                </IconFrame>
            );
        case 'bookings':
        case 'booking':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M7 4v3M17 4v3M5 9h14M6 6h12a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1Z" />
                    <path {...strokeProps} d="m9.5 14 1.8 1.8L15.5 12" />
                </IconFrame>
            );
        case 'feedback':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M12 4 14.2 8.6 19 9.2l-3.5 3.2.9 4.8-4.4-2.3-4.4 2.3.9-4.8L5 9.2l4.8-.6Z" />
                </IconFrame>
            );
        case 'home':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="m4 10 8-6 8 6" />
                    <path {...strokeProps} d="M6.5 9.5V20h11V9.5" />
                    <path {...strokeProps} d="M10 20v-5h4v5" />
                </IconFrame>
            );
        case 'logout':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M10 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
                    <path {...strokeProps} d="m14 8 5 4-5 4" />
                    <path {...strokeProps} d="M19 12H9" />
                </IconFrame>
            );
        case 'users':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path {...strokeProps} d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path {...strokeProps} d="M17 21v-2a4 4 0 0 0-4-4h-1" />
                </IconFrame>
            );
        case 'edit':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M4 20h4l10-10-4-4L4 16v4Z" />
                    <path {...strokeProps} d="m12 6 4 4" />
                </IconFrame>
            );
        case 'error':
            return (
                <IconFrame className={className}>
                    <circle {...strokeProps} cx="12" cy="12" r="8" />
                    <path {...strokeProps} d="M12 8v5" />
                    <circle cx="12" cy="16.5" r="1" fill="currentColor" />
                </IconFrame>
            );
        case 'loading':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M20 12a8 8 0 1 1-2.34-5.66" />
                    <path {...strokeProps} d="M20 5v4h-4" />
                </IconFrame>
            );
        case 'revenue':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M5 9h14v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" />
                    <path {...strokeProps} d="M8 9a4 4 0 0 1 8 0" />
                    <path {...strokeProps} d="M12 11v5" />
                    <path {...strokeProps} d="M10 13.5h4" />
                </IconFrame>
            );
        case 'payment':
            return (
                <IconFrame className={className}>
                    <rect {...strokeProps} x="4" y="6" width="16" height="12" rx="3" />
                    <path {...strokeProps} d="M4 10h16M8 14h3" />
                </IconFrame>
            );
        case 'activity':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="M4 13h4l2-4 4 8 2-4h4" />
                </IconFrame>
            );
        case 'offer':
        case 'offers':
        case 'tag':
            return (
                <IconFrame className={className}>
                    <path {...strokeProps} d="m15 5 6 6-6 6-6-6V5Z" />
                    <circle cx="12" cy="9" r="1.5" fill="currentColor" />
                    <path {...strokeProps} d="M12 11V5l-5 5" />
                </IconFrame>
            );
        default:
            return (
                <IconFrame className={className}>
                    <circle {...strokeProps} cx="12" cy="12" r="8" />
                </IconFrame>
            );
    }
};

export default AdminIcon;
