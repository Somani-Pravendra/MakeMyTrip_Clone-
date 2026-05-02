import React, { useEffect, useMemo, useState } from 'react';
import {
    deleteUser,
    formatCurrency,
    formatDate,
    getAllBookings,
    getAllUsersResponse,
} from '../../../services/dashboardService';
import { useAuth } from '../../../contexts/AuthContext';
import AdminIcon from '../AdminIcons/AdminIcons';
import { useAdminUX } from '../AdminUXContext';
import {
    getNormalizedSearchTerm,
    includesNormalizedSearch,
    useClampedAdminPage,
} from '../adminPageUtils';
import './AdminUsers.css';

const getServiceIcon = (category = '') => {
    const text = category.toLowerCase();
    if (text.includes('flight')) return 'flight';
    if (text.includes('hotel')) return 'hotel';
    if (text.includes('train')) return 'train';
    if (text.includes('bus')) return 'bus';
    if (text.includes('cab')) return 'cab';
    if (text.includes('package')) return 'package';
    return 'booking';
};

const getRelativeRangeCounts = (users) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);
    const monthStart = new Date(todayStart);
    monthStart.setDate(todayStart.getDate() - 29);

    return users.reduce(
        (acc, user) => {
            const joinedAt = new Date(user.createdAt);
            if (joinedAt >= todayStart) acc.today += 1;
            if (joinedAt >= weekStart) acc.week += 1;
            if (joinedAt >= monthStart) acc.month += 1;
            return acc;
        },
        { today: 0, week: 0, month: 0 }
    );
};

const AdminUsers = () => {
    const { user: currentUser } = useAuth();
    const { confirm, notify } = useAdminUX();
    const [users, setUsers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [expandedUserIds, setExpandedUserIds] = useState([]);
    const [deletingUserId, setDeletingUserId] = useState('');
    const [userSummary, setUserSummary] = useState({
        totalUsers: 0,
        customerCount: 0,
        adminCount: 0,
        activeUsers: 0,
        newToday: 0,
        newWeek: 0,
        newMonth: 0,
    });

    const fetchUsersData = async () => {
        try {
            setLoading(true);
            const [usersResponse, bookingsData] = await Promise.all([getAllUsersResponse(), getAllBookings()]);
            const loadedUsers = Array.isArray(usersResponse?.users) ? usersResponse.users : [];
            const nonAdminUsers = Array.isArray(loadedUsers)
                ? loadedUsers.filter((user) => !user?.isAdmin)
                : [];

            setUsers(loadedUsers);
            setBookings(bookingsData || []);
            setUserSummary(usersResponse?.summary || {
                totalUsers: loadedUsers.length,
                customerCount: nonAdminUsers.length,
                adminCount: loadedUsers.filter((user) => user?.isAdmin).length,
                activeUsers: nonAdminUsers.filter((user) => Number(user?.totalBookings || 0) > 0).length,
                newToday: 0,
                newWeek: 0,
                newMonth: 0,
            });
            setError('');
        } catch (err) {
            setError(`Unable to load user insights: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsersData();
    }, []);

    const enrichedUsers = useMemo(() => {
        if (users.length === 0) {
            return [];
        }
        
        return users.map((user) => {
            const userBookings = bookings
                .filter((booking) => booking.userId?._id === user._id || booking.userId === user._id)
                .sort((a, b) => new Date(b.createdAt || b.bookingDate) - new Date(a.createdAt || a.bookingDate));

            const timeline = [
                {
                    type: 'users',
                    title: 'User account created',
                    subtitle: user.loginType === 'google' ? 'Signed up using Google' : 'Signed up using email',
                    date: user.createdAt,
                    amount: null,
                },
                ...userBookings.map((booking) => ({
                    type: getServiceIcon(booking.category),
                    title: `${booking.category?.toUpperCase() || 'BOOKING'} booking ${booking.status?.toLowerCase() === 'cancelled' ? 'cancelled' : 'placed'}`,
                    subtitle: booking.category === 'hotel'
                        ? booking.hotel?.name || 'Hotel booking'
                        : booking.category?.includes('cab')
                            ? `${booking.cab?.pickupLocation || booking.from || 'Pickup'} to ${booking.cab?.dropLocation || booking.to || 'Drop'}`
                            : `${booking.from || booking.flight?.from || booking.train?.from || 'Origin'} to ${booking.to || booking.flight?.to || booking.train?.to || 'Destination'}`,
                    date: booking.createdAt || booking.bookingDate,
                    amount: booking.totalFare || booking.totalPrice || 0,
                    status: booking.status || 'Confirmed',
                })),
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            const latestBooking = userBookings[0];
            const totalSpent = userBookings.reduce((sum, booking) => sum + (booking.totalFare || booking.totalPrice || 0), 0);

            const enrichedUser = {
                ...user,
                userBookings,
                timeline,
                latestActivity: timeline[0],
                walletBalance: user.walletBalance || 0,
                latestBookingDate: latestBooking?.createdAt || latestBooking?.bookingDate || null,
                totalBookings: userBookings.length,
                totalSpent,
            };

            return enrichedUser;
        });
    }, [bookings, users]);

    const filteredUsers = useMemo(() => {
        const normalizedSearchTerm = getNormalizedSearchTerm(searchTerm);
        if (!normalizedSearchTerm) {
            return enrichedUsers;
        }

        return enrichedUsers.filter((user) =>
            [user.name, user.email, user.mobile]
                .some((value) => includesNormalizedSearch(value, normalizedSearchTerm))
        );
    }, [enrichedUsers, searchTerm]);

    const metrics = useMemo(() => {
        const rangeCounts = getRelativeRangeCounts(enrichedUsers);
        const totalRevenue = enrichedUsers.reduce((sum, user) => sum + (user.totalSpent || 0), 0);

        return {
            total: userSummary.totalUsers || enrichedUsers.length,
            customerCount: userSummary.customerCount || enrichedUsers.length,
            adminCount: userSummary.adminCount || 0,
            activeUsers: userSummary.activeUsers || enrichedUsers.filter((user) => user.totalBookings > 0).length,
            newToday: userSummary.newToday || rangeCounts.today,
            newWeek: userSummary.newWeek || rangeCounts.week,
            newMonth: userSummary.newMonth || rangeCounts.month,
            revenue: totalRevenue,
        };
    }, [enrichedUsers, userSummary]);

    useEffect(() => {
        setExpandedUserIds((current) => current.filter((id) => filteredUsers.some((user) => user._id === id)));
    }, [filteredUsers]);

    // Email validation function
    const isValidEmail = (email) => {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const isCurrentAdminAccount = (userId) => String(currentUser?._id || '') === String(userId || '');

    // Enhanced delete handler with confirmation
    const handleDeleteUser = async (userId, userName) => {
        if (isCurrentAdminAccount(userId)) {
            notify({
                type: 'warning',
                title: 'Delete unavailable',
                message: 'You cannot delete the admin account you are currently signed in with.'
            });
            return;
        }

        const confirmMessage = `Delete user "${userName}" and remove all associated bookings and account data. This action cannot be undone.`;
        const confirmed = await confirm({
            title: 'Delete user account',
            message: confirmMessage,
            confirmLabel: 'Delete user',
            tone: 'danger'
        });
        if (!confirmed) return;

        try {
            setDeletingUserId(userId);
            await deleteUser(userId);
            setUsers((current) => current.filter((user) => user._id !== userId));
            setBookings((current) =>
                current.filter((booking) => String(booking.userId?._id || booking.userId || '') !== String(userId))
            );
            setExpandedUserIds((current) => current.filter((id) => id !== userId));
            notify({
                type: 'success',
                title: 'Successfully deleted',
                message: 'User deleted successfully.'
            });
            await fetchUsersData();
        } catch (err) {
            notify({
                type: 'error',
                title: 'Delete failed',
                message: `Failed to delete user: ${err.response?.data?.message || err.message}`
            });
        } finally {
            setDeletingUserId('');
        }
    };

    const toggleUserDetails = (userId) => {
        setExpandedUserIds((current) =>
            current.includes(userId)
                ? current.filter((id) => id !== userId)
                : [...current, userId]
        );
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    useClampedAdminPage(totalPages, setCurrentPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="management-container admin-users-page">
            <div className="management-header admin-users-header">
                <div className="header-main">
                    <h1>👥 User Directory & Insights</h1>
                    <p>Monitor user activity, account statistics, and growth across the elite ecosystem.</p>
                </div>
                <div className="management-actions">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input 
                            type="text" 
                            placeholder="Search by name, email, or phone..." 
                            value={searchTerm}
                            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                        />
                    </div>
                    <div className="header-buttons">
                        <button className="refresh-btn" onClick={fetchUsersData}>
                            🔄 Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            <div className="admin-users-metrics">
                <div className="admin-users-metric-card stat-card">
                    <div className="admin-users-metric-card__icon">
                        <AdminIcon name="users" />
                    </div>
                    <div>
                        <span>Total Users In Database</span>
                        <strong>{metrics.total}</strong>
                    </div>
                </div>
                <div className="admin-users-metric-card">
                    <div className="admin-users-metric-card__icon admin-users-metric-card__icon--success">
                        <AdminIcon name="users" />
                    </div>
                    <div>
                        <span>Customer Accounts</span>
                        <strong>{metrics.customerCount}</strong>
                    </div>
                </div>
                <div className="admin-users-metric-card">
                    <div className="admin-users-metric-card__icon admin-users-metric-card__icon--accent">
                        <AdminIcon name="activity" />
                    </div>
                    <div>
                        <span>Active Users</span>
                        <strong>{metrics.activeUsers}</strong>
                    </div>
                </div>
                <div className="admin-users-metric-card">
                    <div className="admin-users-metric-card__icon admin-users-metric-card__icon--revenue">
                        <AdminIcon name="users" />
                    </div>
                    <div>
                        <span>Admin Accounts</span>
                        <strong>{metrics.adminCount}</strong>
                    </div>
                </div>
            </div>

            <div className="admin-users-summary-bar">
                <div className="admin-users-summary-pill">
                    <span>New Today</span>
                    <strong>{metrics.newToday}</strong>
                </div>
                <div className="admin-users-summary-pill">
                    <span>New This Week</span>
                    <strong>{metrics.newWeek}</strong>
                </div>
                <div className="admin-users-summary-pill">
                    <span>New This Month</span>
                    <strong>{metrics.newMonth}</strong>
                </div>
                <div className="admin-users-summary-pill">
                    <span>User Revenue</span>
                    <strong>{formatCurrency(metrics.revenue)}</strong>
                </div>
            </div>

            <div className="admin-users-layout">
                <section className="admin-users-table-card admin-users-table-card--full">
                    <div className="admin-users-table-card__header">
                        <div>
                            <h2>All Users</h2>
                            <p>{filteredUsers.length} records on screen. {metrics.customerCount} customer accounts and {metrics.total} total users are available in the database.</p>
                        </div>
                        <label className="admin-users-search" aria-label="Search users">
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search by name, email or mobile"
                            />
                        </label>
                    </div>

                    {loading ? (
                        <div className="admin-users-empty-state">
                            <div className="admin-users-empty-state__icon">
                                <AdminIcon name="loading" />
                            </div>
                            <h3>Loading users...</h3>
                            <p>Please wait while we fetch user data.</p>
                        </div>
                    ) : error ? (
                        <div className="admin-users-empty-state">
                            <div className="admin-users-empty-state__icon">
                                <AdminIcon name="error" />
                            </div>
                            <h3>Error loading users</h3>
                            <p>{error}</p>
                            <button onClick={fetchUsersData} className="admin-users-toggle-btn">Retry</button>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="admin-users-empty-state">
                            <div className="admin-users-empty-state__icon">
                                <AdminIcon name="users" />
                            </div>
                            <h3>No users found</h3>
                            <p>{searchTerm ? `No users match "${searchTerm}". Try a different search term.` : 'No users available in the system.'}</p>
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="admin-users-toggle-btn">Clear Search</button>
                            )}
                        </div>
                    ) : (
                        <div className="admin-users-table">
                            {currentUsers.map((user) => (
                                <article
                                    key={user._id}
                                    className={`admin-users-card ${expandedUserIds.includes(user._id) ? 'expanded' : ''}`}
                                >
                                    <div className="admin-users-row">
                                        <div className="admin-users-row__main">
                                            <div className="admin-users-row__identity">
                                                <div className="admin-users-avatar">
                                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <strong>{user.name || 'Unnamed User'}</strong>
                                                        {user.isAdmin && (
                                                            <span style={{ 
                                                                fontSize: '10px', 
                                                                background: 'rgba(124, 108, 255, 0.2)', 
                                                                color: '#7c6cff', 
                                                                padding: '2px 6px', 
                                                                borderRadius: '4px',
                                                                fontWeight: '700',
                                                                textTransform: 'uppercase'
                                                            }}>Admin</span>
                                                        )}
                                                    </div>
                                                    <span className={isValidEmail(user.email) ? '' : 'invalid-email'}>
                                                        {user.email || 'No email address'}
                                                        {user.email && !isValidEmail(user.email) && ' ⚠️'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="admin-users-row__meta">
                                                <span>{user.mobile || 'Not provided'}</span>
                                                <span>Joined {formatDate(user.createdAt)}</span>
                                            </div>
                                            <div className="admin-users-row__stats">
                                                <span>{user.totalBookings || 0} {user.totalBookings === 0 ? 'No bookings yet' : 'bookings'}</span>
                                                <span>{user.totalBookings > 0 ? formatCurrency(user.totalSpent || 0) : 'No spending yet'}</span>
                                            </div>
                                            <div className="admin-users-row__activity">
                                                <span>{user.latestActivity?.title || 'No recent activity'}</span>
                                                <small>Last activity: {formatDate(user.latestActivity?.date)}</small>
                                            </div>
                                        </div>
                                        <div className="admin-users-row__actions">
                                            <button
                                                type="button"
                                                className="admin-users-toggle-btn manage-btn"
                                                onClick={() => toggleUserDetails(user._id)}
                                            >
                                                {expandedUserIds.includes(user._id) ? '▲ Hide Details' : '▼ Show Details'}
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-users-delete-btn delete-btn"
                                                disabled={deletingUserId === user._id || isCurrentAdminAccount(user._id)}
                                                title={isCurrentAdminAccount(user._id) ? 'Current signed-in admin cannot be deleted' : ''}
                                                onClick={() => handleDeleteUser(user._id, user.name || 'Unnamed User')}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>

                                    {expandedUserIds.includes(user._id) && (
                                        <div className="admin-users-row__expanded">
                                            <div className="admin-users-detail-grid">
                                                <div className="admin-users-detail-tile">
                                                    <span>Mobile</span>
                                                    <strong>{user.mobile || 'Not available'}</strong>
                                                </div>
                                                <div className="admin-users-detail-tile">
                                                    <span>Joined</span>
                                                    <strong>{formatDate(user.createdAt)}</strong>
                                                </div>
                                                <div className="admin-users-detail-tile">
                                                    <span>Login Type</span>
                                                    <strong>{user.loginType || 'email'}</strong>
                                                </div>
                                                <div className="admin-users-detail-tile">
                                                    <span>Total Bookings</span>
                                                    <strong>{user.totalBookings || 0}</strong>
                                                </div>
                                                <div className="admin-users-detail-tile">
                                                    <span>Total Spent</span>
                                                    <strong>{formatCurrency(user.totalSpent || 0)}</strong>
                                                </div>
                                                <div className="admin-users-detail-tile">
                                                    <span>Wallet Balance</span>
                                                    <strong>{formatCurrency(user.walletBalance || 0)}</strong>
                                                </div>
                                                <div className="admin-users-detail-tile">
                                                    <span>Last Booking</span>
                                                    <strong>{user.latestBookingDate ? formatDate(user.latestBookingDate) : 'No bookings yet'}</strong>
                                                </div>
                                            </div>

                                            <div className="admin-users-timeline-section">
                                                <div className="admin-users-section-heading">
                                                    <h3>User Activity Timeline</h3>
                                                    <p>See what this user did and when</p>
                                                </div>
                                                <div className="admin-users-timeline admin-users-timeline--inline">
                                                    {user.timeline.map((entry, index) => (
                                                        <div key={`${entry.title}-${entry.date}-${index}`} className="admin-users-timeline-item">
                                                            <div className={`admin-users-timeline-item__icon admin-users-timeline-item__icon--${entry.type}`}>
                                                                <AdminIcon name={entry.type} />
                                                            </div>
                                                            <div className="admin-users-timeline-item__content">
                                                                <div className="admin-users-timeline-item__topline">
                                                                    <strong>{entry.title}</strong>
                                                                    <span>{formatDate(entry.date)}</span>
                                                                </div>
                                                                <p>{entry.subtitle}</p>
                                                                {entry.amount ? (
                                                                    <small>
                                                                        {formatCurrency(entry.amount)}
                                                                        {entry.status ? ` • ${entry.status}` : ''}
                                                                    </small>
                                                                ) : (
                                                                    <small>{entry.status || 'Profile activity'}</small>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="pagination-container" style={{ marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '24px' }}>
                            <div className="pagination-info">
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} entries
                            </div>
                            <div className="pagination-controls">
                                <button
                                    className="page-nav"
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Prev
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(page => {
                                    if (page === 1 || page === totalPages) return true;
                                    if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                                    return false;
                                }).map((page, index, array) => {
                                    const elements = [];
                                    if (index > 0 && page !== array[index - 1] + 1) {
                                        elements.push(<span key={`ell-${page}`} className="pagination-ellipsis">...</span>);
                                    }
                                    elements.push(
                                        <button
                                            key={page}
                                            className={`page-btn ${currentPage === page ? 'active' : ''}`}
                                            onClick={() => paginate(page)}
                                        >
                                            {page}
                                        </button>
                                    );
                                    return elements;
                                })}

                                <button
                                    className="page-nav"
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AdminUsers;

