import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    deleteBooking,
    deleteUser,
    formatDate,
    formatCurrency,
    getActivityIcon,
    getAllBookings,
    getAllUsers,
    getDashboardData,
} from '../../../services/dashboardService';
import AdminIcon from '../AdminIcons/AdminIcons';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminUX } from '../AdminUXContext';
import './AdminOverview.css';

const SERVICE_CODES = [
    ['flights', 'Flights', 'flight', 'Air routes and schedules'],
    ['hotels', 'Hotels', 'hotel', 'Stays and room inventory'],
    ['trains', 'Trains', 'train', 'Rail searches and seats'],
    ['buses', 'Buses', 'bus', 'Intercity and sleeper demand'],
    ['cabs', 'Cabs', 'cab', 'Airport and local rides'],
    ['packages', 'Holiday Packages', 'package', 'Tours and bundled trips'],
];
const ADMIN_ROUTE_BY_SERVICE = {
    flights: '/admin/flights',
    hotels: '/admin/hotels',
    trains: '/admin/trains',
    buses: '/admin/bus',
    cabs: '/admin/cabs',
    packages: '/admin/packages',
};

const getCategoryCode = (value = '') => {
    const text = value.toLowerCase();
    if (text.includes('flight')) return 'flight';
    if (text.includes('hotel')) return 'hotel';
    if (text.includes('train')) return 'train';
    if (text.includes('bus')) return 'bus';
    if (text.includes('cab')) return 'cab';
    if (text.includes('package')) return 'package';
    return 'revenue';
};

const getBookingDetails = (booking) => {
    if (!booking) return 'N/A';
    const category = (booking.category || '').toLowerCase();
    if (category.includes('flight')) return `${booking.flight?.from || booking.from || 'Anywhere'} -> ${booking.flight?.to || booking.to || 'Anywhere'}`;
    if (category === 'train') return `${booking.train?.from || booking.from || 'Anywhere'} -> ${booking.train?.to || booking.to || 'Anywhere'}`;
    if (category === 'bus') return `${booking.bus?.from || booking.from || 'Anywhere'} -> ${booking.bus?.to || booking.to || 'Anywhere'}`;
    if (category === 'cab' || category === 'cabs') return `${booking.cab?.pickupLocation || booking.from || 'Pickup'} -> ${booking.cab?.dropLocation || booking.to || 'Drop'}`;
    if (category === 'hotel') return `${booking.hotel?.name || booking.hotelName || 'Hotel Booking'}${booking.hotel?.location?.city ? ` (${booking.hotel.location.city})` : ''}`;
    if (category === 'package') return booking.package?.title || booking.packageTitle || 'Holiday Package';
    return `${booking.from || 'N/A'} -> ${booking.to || 'N/A'}`;
};

const AdminOverview = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { confirm } = useAdminUX();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [modalData, setModalData] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [allBookings, setAllBookings] = useState([]);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [visibleActivityCount, setVisibleActivityCount] = useState(5);
    const [modalPage, setModalPage] = useState(1);
    const perPage = 10;

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setDashboardData(await getDashboardData());
            setError(null);
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const openModal = async (type) => {
        setActiveModal(type);
        setModalLoading(true);
        setModalData([]);
        setModalPage(1);
        try {
            if (type === 'users') {
                const [users, bookings] = await Promise.all([getAllUsers(), getAllBookings()]);
                setModalData(users);
                setAllBookings(bookings);
            } else if (type === 'bookings') {
                setModalData(await getAllBookings());
            } else {
                const revenueMap = {};
                (await getAllBookings()).forEach((booking) => {
                    const key = (booking.category || 'other').toLowerCase();
                    revenueMap[key] = (revenueMap[key] || 0) + (booking.totalFare || booking.totalPrice || 0);
                });
                setModalData(Object.entries(revenueMap).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total));
            }
        } catch (err) {
            console.error(`Failed to fetch ${type} data:`, err);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalData([]);
        setModalPage(1);
        setExpandedUserId(null);
    };

    const exportCSV = () => {
        if (!modalData.length) return;
        const rows = activeModal === 'users'
            ? modalData.map((user) => ({ Name: user.name, Email: user.email, Mobile: user.mobile || 'N/A', 'Joined Date': formatDate(user.createdAt), 'Total Bookings': user.totalBookings, 'Total Spent (INR)': user.totalSpent || 0 }))
            : activeModal === 'bookings'
                ? modalData.map((booking) => ({ 'Booking ID': booking._id, 'User Name': booking.userId?.name || 'Guest', 'User Email': booking.userId?.email || 'N/A', Category: booking.category, Details: getBookingDetails(booking), Amount: booking.totalFare || booking.totalPrice || 0, Status: booking.status || 'Confirmed', Date: formatDate(booking.bookingDate || booking.createdAt) }))
                : modalData.map((item) => ({ Category: item.category.toUpperCase(), 'Revenue Amount (INR)': item.total }));
        const headers = Object.keys(rows[0]);
        const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeModal}_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const confirmDeleteUser = async (userId, event) => {
        event.stopPropagation();
        const confirmed = await confirm({
            title: 'Delete user',
            message: 'This will permanently remove the user and all linked bookings. This action cannot be undone.',
            confirmLabel: 'Delete user',
            tone: 'danger'
        });
        if (!confirmed) return;
        try {
            await deleteUser(userId);
            setModalData(await getAllUsers());
            fetchDashboardData();
            showToast({
                type: 'success',
                title: 'Successfully deleted',
                message: 'User deleted successfully.'
            });
        } catch (err) {
            showToast({
                type: 'error',
                title: 'Delete failed',
                message: `Failed to delete user: ${err.response?.data?.message || err.message}`
            });
        }
    };

    const confirmDeleteBooking = async (bookingId, event) => {
        event.stopPropagation();
        const confirmed = await confirm({
            title: 'Delete booking',
            message: 'This booking will be permanently removed from the history panel.',
            confirmLabel: 'Delete booking',
            tone: 'danger'
        });
        if (!confirmed) return;
        try {
            setModalData(await (deleteBooking(bookingId).then(() => getAllBookings())));
            fetchDashboardData();
            showToast({
                type: 'success',
                title: 'Successfully deleted',
                message: 'Booking deleted successfully.'
            });
        } catch (err) {
            showToast({
                type: 'error',
                title: 'Delete failed',
                message: `Failed to delete booking: ${err.response?.data?.message || err.message}`
            });
        }
    };

    const start = (modalPage - 1) * perPage;
    const visibleModalItems = modalData.slice(start, start + perPage);
    const totalPages = Math.ceil(modalData.length / perPage);
    const revenueTotal = modalData.reduce((sum, item) => sum + (item.total || 0), 0);
    const bookingEntries = SERVICE_CODES.map(([key, label, icon, detail]) => ({
        key,
        label,
        icon,
        detail,
        count: Number(dashboardData?.bookings?.[key] || 0)
    }));
    const totalServiceBookings = bookingEntries.reduce((sum, item) => sum + item.count, 0);
    const quickActions = [
        {
            key: 'users',
            title: 'Review users',
            description: 'Open profiles, activity and account health.',
            icon: 'users',
            action: () => navigate('/admin/users')
        },
        {
            key: 'bookings',
            title: 'Manage bookings',
            description: 'Track reservations, statuses and cancellations.',
            icon: 'bookings',
            action: () => navigate('/admin/bookings')
        },
        {
            key: 'offers',
            title: 'Update offers',
            description: 'Launch promotions and campaign pricing.',
            icon: 'tag',
            action: () => navigate('/admin/offers')
        },
        {
            key: 'feedback',
            title: 'Read feedback',
            description: 'Check guest sentiment and moderation queue.',
            icon: 'feedback',
            action: () => navigate('/admin/feedback')
        }
    ];

    const renderPager = () => totalPages > 1 && (
        <div className="pagination-wrapper modal-pagination">
            <div className="pagination-info">Showing {start + 1}-{Math.min(start + perPage, modalData.length)} of {modalData.length}</div>
            <div className="pagination-controls">
                <button className="page-nav" onClick={() => setModalPage((p) => p - 1)} disabled={modalPage === 1}>Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter((page) => page === 1 || page === totalPages || (page >= modalPage - 1 && page <= modalPage + 1)).map((page, index, arr) => (
                    <React.Fragment key={page}>
                        {index > 0 && page !== arr[index - 1] + 1 && <span className="pagination-ellipsis">...</span>}
                        <button className={`page-num ${modalPage === page ? 'active' : ''}`} onClick={() => setModalPage(page)}>{page}</button>
                    </React.Fragment>
                ))}
                <button className="page-nav" onClick={() => setModalPage((p) => p + 1)} disabled={modalPage === totalPages}>Next</button>
            </div>
        </div>
    );

    if (loading) return <div className="dashboard-loading"><div className="loading-spinner"></div><p>Loading dashboard data...</p></div>;
    if (error) return <div className="dashboard-error"><div className="error-icon">!</div><h3>Error Loading Dashboard</h3><p>{error}</p><button onClick={fetchDashboardData} className="retry-btn">Try Again</button></div>;

    return (
        <div className="admin-overview-page">
            <div className="admin-header">
                <div>
                    <h1>Dashboard Overview</h1>
                    <p className="subtitle">A sharper command center for bookings, revenue, users and operations.</p>
                </div>
            </div>

            <section className="overview-quick-actions">
                {quickActions.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        className={`overview-quick-card overview-quick-card--${item.key}`}
                        onClick={item.action}
                    >
                        <span className="overview-quick-card__icon">
                            <AdminIcon name={item.icon} />
                        </span>
                        <span className="overview-quick-card__content">
                            <strong>{item.title}</strong>
                            <small>{item.description}</small>
                        </span>
                    </button>
                ))}
            </section>

            <div className="stat-cards-grid">
                {[
                    ['users', 'Total Users', dashboardData?.totalUsers?.toLocaleString() || '0', 'users'],
                    ['bookings', 'Total Bookings', dashboardData?.totalBookings?.toLocaleString() || '0', 'bookings'],
                    ['revenue', 'Total Revenue', formatCurrency(dashboardData?.totalRevenue || 0), 'revenue'],
                ].map(([key, title, value, icon]) => (
                    <div key={key} className={`stat-card stat-card--${key} clickable`} onClick={() => {
                        if (key === 'users') {
                            navigate('/admin/users');
                        } else if (key === 'bookings') {
                            navigate('/admin/bookings');
                        } else {
                            openModal(key);
                        }
                    }}>
                        <div>
                            <h3>{title}</h3>
                            <div className="value">{value}</div>
                            <div className="view-details">View details</div>
                        </div>
                        <div className="icon">
                            <AdminIcon name={icon} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-section">
                <div className="overview-section-head">
                    <div>
                        <span className="overview-section-kicker">Service Command</span>
                        <h3>Service performance overview</h3>
                    </div>
                    <button className="export-btn" onClick={() => openModal('revenue')}>
                        Revenue Breakdown
                    </button>
                </div>
                <div className="booking-stats-grid">
                    {bookingEntries.map(({ key, label, icon, detail, count }) => (
                        <div 
                            key={key} 
                            className={`booking-stat-card booking-stat-card--${key} clickable`}
                            onClick={() => navigate(ADMIN_ROUTE_BY_SERVICE[key] || '/admin/dashboard')}
                        >
                            <div className={`booking-icon booking-icon--${key}`}>
                                <AdminIcon name={icon} />
                            </div>
                            <div className="booking-info">
                                <h4>{label}</h4>
                                <div className="booking-count">{count}</div>
                                <p className="booking-caption">{detail}</p>
                                <div className="overview-service-meta">
                                    <span>{totalServiceBookings ? `${Math.round((count / totalServiceBookings) * 100)}% of service bookings` : 'No booking share yet'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="dashboard-section">
                <div className="dashboard-section-layout">
                    <div className="dashboard-section-intro">
                        <span className="dashboard-section-kicker">Live Feed</span>
                        <h2>
                            <AdminIcon name="activity" />
                            Recent Activity
                        </h2>
                        <div className="dashboard-summary-chip dashboard-summary-chip--activity">
                            <strong>{dashboardData?.recentActivity?.length || 0}</strong>
                            <span>Recent events available</span>
                        </div>
                    </div>
                    <div className="activity-list activity-list--panel">
                        {dashboardData?.recentActivity?.length ? (
                            <>
                                {dashboardData.recentActivity.slice(0, visibleActivityCount).map((activity, index) => (
                                <div key={index} className={`activity-item type--${activity.type}`}>
                                    <div className={`activity-icon activity-icon--${activity.type || 'activity'}`}>
                                        <AdminIcon name={getActivityIcon(activity.type)} />
                                    </div>
                                    <div className="activity-content">
                                        <div className="activity-info">
                                            <p className="activity-message">{activity.message}</p>
                                            <div className="activity-meta">
                                                <span className="activity-date">{formatDate(activity.date)}</span>
                                            </div>
                                        </div>
                                        {activity.amount && <span className="activity-amount">{formatCurrency(activity.amount)}</span>}
                                    </div>
                                </div>
                                ))}
                            </>
                        ) : (
                            <div className="no-activity">
                                <div className="no-activity-icon">
                                    <AdminIcon name="activity" />
                                </div>
                                <p>No recent activity to show.</p>
                            </div>
                        )}
                        {!!dashboardData?.recentActivity?.length && dashboardData.recentActivity.length > 5 && (
                            <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                                {visibleActivityCount < dashboardData.recentActivity.length && <button className="edit-btn" onClick={() => setVisibleActivityCount((count) => count + 5)} style={{ padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none' }}>Show More</button>}
                                {visibleActivityCount > 5 && <button className="delete-btn" onClick={() => setVisibleActivityCount(5)} style={{ padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none' }}>Show Less</button>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {activeModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content-glass" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2>{activeModal === 'users' ? 'All Registered Users' : activeModal === 'bookings' ? 'All Bookings History' : 'Revenue Breakdown (Section-wise)'}</h2>
                                {!modalLoading && !!modalData.length && <button className="export-btn" onClick={exportCSV} title="Download as CSV">Export CSV</button>}
                            </div>
                            <button className="modal-close" onClick={closeModal}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {modalLoading && <div className="dashboard-loading" style={{ minHeight: '200px' }}><div className="loading-spinner"></div><p>Loading data...</p></div>}
                            {!modalLoading && activeModal === 'users' && <div className="modal-list">
                                <div className="modal-list-header user-header"><span>Identity</span><span>Contact Information</span><span>Activity</span><span>Revenue Contribution</span><span>Action</span></div>
                                {visibleModalItems.map((user) => {
                                    const userBookings = allBookings.filter((booking) => booking.userId?._id === user._id || booking.userId === user._id);
                                    return <div key={user._id} className={`modal-list-row user-row-container ${expandedUserId === user._id ? 'expanded' : ''}`}>
                                        <div className="modal-list-row user-row" onClick={() => setExpandedUserId(expandedUserId === user._id ? null : user._id)}>
                                            <div className="user-identity"><div className="user-avatar">{user.name?.charAt(0).toUpperCase() || '?'}</div><div className="user-primary"><strong className="user-name">{user.name}</strong><span className="join-date">Joined {formatDate(user.createdAt)}</span></div></div>
                                            <div className="user-contact"><span>{user.email}</span><span className="user-mobile">{user.mobile || 'No Phone'}</span></div>
                                            <div className="user-stats"><span className="booking-badge">{user.totalBookings} Total Bookings</span></div>
                                            <div className="user-payment"><strong className="revenue-amt">{formatCurrency(user.totalSpent || 0)}</strong></div>
                                            <div className="user-actions"><button className="delete-btn flex-center" onClick={(event) => confirmDeleteUser(user._id, event)} title="Delete User">X</button></div>
                                        </div>
                                        {expandedUserId === user._id && <div className="user-details-expanded"><h4>Full Transaction History</h4><div className="mini-table-wrapper"><table className="mini-data-table"><thead><tr><th>Transaction ID</th><th>Service</th><th>Booking Details</th><th>Amount Paid</th><th>Final Status</th></tr></thead><tbody>{userBookings.length ? userBookings.map((booking) => <tr key={booking._id}><td style={{ opacity: 0.6 }}>#{booking._id.slice(-8).toUpperCase()}</td><td><span className={`service-tag-mini ${booking.category?.toLowerCase()}`}>{booking.category}</span></td><td>{getBookingDetails(booking)}</td><td><strong className="revenue-amt">{formatCurrency(booking.totalFare || booking.totalPrice || 0)}</strong></td><td><span className={`booking-status-pill ${(booking.status || 'Confirmed').toLowerCase()}`}>{booking.status || 'Confirmed'}</span></td></tr>) : <tr><td colSpan="5" className="empty-mini">No transaction history found for this user.</td></tr>}</tbody></table></div></div>}
                                    </div>;
                                })}
                                {!modalData.length && <p className="modal-empty">No registered users found.</p>}
                                {renderPager()}
                            </div>}
                            {!modalLoading && activeModal === 'bookings' && <div className="modal-list">
                                <div className="modal-list-header booking-header"><span>Customer Identity</span><span>Service Category</span><span>Reservation Details</span><span>Total Fare</span><span>Action</span></div>
                                {visibleModalItems.map((booking) => <div key={booking._id} className="modal-list-row booking-row">
                                    <div className="user-identity"><div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>{booking.userId?.name?.charAt(0).toUpperCase() || 'G'}</div><div className="booking-user"><strong className="user-name" style={{ fontSize: '13px' }}>{booking.userId?.name || 'Guest'}</strong><span className="user-email" style={{ fontSize: '10px' }}>{booking.userId?.email || 'No Email'}</span></div></div>
                                    <div className="booking-service"><span className={`service-tag-mini ${booking.category?.toLowerCase()}`}>{booking.category}</span><span className="booking-date">{formatDate(booking.bookingDate || booking.createdAt)}</span></div>
                                    <div className="booking-details"><span className="route-info">{getBookingDetails(booking)}</span><span className={`booking-status-pill ${(booking.status || 'Confirmed').toLowerCase()}`}>{booking.status || 'Confirmed'}</span></div>
                                    <div className="booking-amount"><strong className="revenue-amt">{formatCurrency(booking.totalFare || booking.totalPrice || 0)}</strong></div>
                                    <div className="user-actions"><button className="delete-btn flex-center" onClick={(event) => confirmDeleteBooking(booking._id, event)} title="Delete Booking">X</button></div>
                                </div>)}
                                {!modalData.length && <p className="modal-empty">No reservations found in history.</p>}
                                {renderPager()}
                            </div>}
                            {!modalLoading && activeModal === 'revenue' && <div className="modal-list">
                                <div className="modal-list-header revenue-header"><span>Service Category</span><span style={{ textAlign: 'right' }}>Revenue Performance</span></div>
                                {[...modalData].sort((a, b) => b.total - a.total).map((item, index) => {
                                    const percent = revenueTotal ? (item.total / revenueTotal) * 100 : 0;
                                    const categoryIcon = getCategoryCode(item.category);
                                    return (
                                        <div key={index} className="modal-list-row revenue-row" style={{ padding: '25px 32px' }}>
                                            <div className="revenue-cat-info">
                                                <div className={`cat-icon cat-icon--${categoryIcon}`}>
                                                    <AdminIcon name={categoryIcon} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                                    <strong style={{ textTransform: 'capitalize', fontSize: '15px' }}>{item.category}</strong>
                                                    <div className="revenue-progress-container">
                                                        <div className="revenue-progress-bar" style={{ width: `${percent}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="revenue-value" style={{ textAlign: 'right' }}>
                                                <strong className="revenue-amt" style={{ fontSize: '18px' }}>{formatCurrency(item.total)}</strong>
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '600' }}>{percent.toFixed(1)}% of total revenue</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!modalData.length && <p className="modal-empty">No financial data available for this period.</p>}
                            </div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOverview;
