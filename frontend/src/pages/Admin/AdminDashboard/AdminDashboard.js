import React, { useState } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import AdminIcon from '../AdminIcons/AdminIcons';
import { AdminUXProvider } from '../AdminUXContext';
import './AdminDashboard.css';
import '../AdminManagement.css';
import '../AdminLuxuryTheme.css';

const NAV_SECTIONS = [
    {
        key: 'dashboard',
        icon: 'dashboard',
        label: 'Dashboard',
        items: [
            { to: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard', end: true }
        ]
    },
    {
        key: 'user-management',
        icon: 'users',
        label: 'User Management',
        items: [
            { to: '/admin/users', icon: 'users', label: 'Users' },
            { to: '/admin/bookings', icon: 'bookings', label: 'Bookings' }
        ]
    },
    {
        key: 'services',
        icon: 'flight',
        label: 'Services',
        items: [
            { to: '/admin/flights', icon: 'flight', label: 'Flights' },
            { to: '/admin/trains', icon: 'train', label: 'Trains' },
            { to: '/admin/bus', icon: 'bus', label: 'Buses' },
            { to: '/admin/cabs', icon: 'cab', label: 'Cabs' },
            { to: '/admin/hotels', icon: 'hotel', label: 'Hotels' },
            { to: '/admin/packages', icon: 'package', label: 'Holiday Packages' }
        ]
    },
    {
        key: 'others',
        icon: 'tag',
        label: 'Others',
        items: [
            { to: '/admin/offers', icon: 'tag', label: 'Offers' },
            { to: '/admin/feedback', icon: 'feedback', label: 'Feedback' }
        ]
    }
];

const AdminDashboard = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <AdminUXProvider>
            <div className={`admin-container admin-luxury-theme ${collapsed ? 'sidebar-collapsed' : ''}`}>
                <aside className="admin-sidebar">
                    <button
                        className="sidebar-toggle"
                        onClick={() => setCollapsed(prev => !prev)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? '>' : '<'}
                    </button>

                    <div className="sidebar-header">
                        <span className="sidebar-logo">
                            <AdminIcon name="brand" />
                        </span>
                        {!collapsed && <h2>Elite Admin</h2>}
                    </div>

                    {!collapsed && (
                        <div className="sidebar-profile">
                            <div className="profile-avatar">
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="profile-info">
                                <p className="profile-name">{user?.name || 'Admin'}</p>
                                <span className="profile-badge">Administrator</span>
                            </div>
                        </div>
                    )}

                    <ul className="sidebar-menu">
                        {NAV_SECTIONS.map((section) => (
                            <React.Fragment key={section.key}>
                                {!collapsed && (
                                    <li className={`sidebar-section-label ${section.key === 'dashboard' ? 'sidebar-section-label--dashboard' : ''}`}>
                                        <span className="sidebar-section-label__icon">
                                            <AdminIcon name={section.icon} />
                                        </span>
                                        {section.label}
                                    </li>
                                )}
                                {section.items.map(({ to, icon, label, end }) => (
                                    <li key={to}>
                                        <NavLink
                                            to={to}
                                            end={end}
                                            className={({ isActive }) =>
                                                `sidebar-item sidebar-item--${icon} ${section.key === 'dashboard' ? 'sidebar-item--dashboard' : ''} ${isActive ? 'active' : ''}`
                                            }
                                            title={collapsed ? label : undefined}
                                        >
                                            <span className={`nav-icon nav-icon--${icon}`}>
                                                <AdminIcon name={icon} />
                                            </span>
                                            {!collapsed && <span className="nav-label">{label}</span>}
                                        </NavLink>
                                    </li>
                                ))}
                            </React.Fragment>
                        ))}
                    </ul>

                    <div className="sidebar-footer">
                        <button
                            className="home-btn-sidebar"
                            onClick={() => navigate('/')}
                            title={collapsed ? 'Home' : undefined}
                        >
                            <span><AdminIcon name="home" /></span>
                            {!collapsed && ' Home'}
                        </button>
                        <button
                            className="logout-btn-sidebar"
                            onClick={handleLogout}
                            title={collapsed ? 'Logout' : undefined}
                        >
                            <span><AdminIcon name="logout" /></span>
                            {!collapsed && ' Logout'}
                        </button>
                    </div>
                </aside>

                <main className="admin-main">
                    <Outlet />
                </main>
            </div>
        </AdminUXProvider>
    );
};

export default AdminDashboard;
