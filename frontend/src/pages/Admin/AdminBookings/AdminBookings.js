import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/api';
import { useToast } from '../../../contexts/ToastContext';
import AdminIcon from '../AdminIcons/AdminIcons';
import { useAdminUX } from '../AdminUXContext';
import {
    getAdminAuthConfig,
    getNormalizedSearchTerm,
    includesNormalizedSearch,
    useClampedAdminPage,
} from '../adminPageUtils';
import './AdminBookings.css';

const API_URL = `${API_BASE_URL}`;
const itemsPerPage = 10;

const formatCurrency = (value = 0) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(Number(value) || 0);

const normalizeAdminBookingCategory = (value = '') => {
    const category = String(value || '').trim().toLowerCase();
    if (category === 'flight' || category === 'flights') return 'flight';
    if (category === 'hotel' || category === 'hotels') return 'hotel';
    if (category === 'train' || category === 'trains') return 'train';
    if (category === 'bus' || category === 'buses') return 'bus';
    if (category === 'cab' || category === 'cabs') return 'cabs';
    if (category === 'package' || category === 'packages') return 'package';
    return category;
};

const getCategoryLabel = (value = '') => {
    const normalized = normalizeAdminBookingCategory(value);
    if (normalized === 'cabs') return 'Cabs';
    if (normalized === 'package') return 'Packages';
    if (!normalized) return 'Unknown';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const isCancellationStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    return normalized === 'cancelled' || normalized === 'fully cancelled' || normalized === 'partially cancelled';
};

const getStatusColor = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'confirmed' || normalized === 'completed' || normalized === 'active') return 'status-active';
    if (normalized === 'pending' || normalized === 'waiting' || normalized === 'partially cancelled') return 'status-pending';
    if (normalized === 'cancelled' || normalized === 'fully cancelled' || normalized === 'rejected') return 'status-inactive';
    return '';
};

const getBookingDetails = (booking) => {
    if (!booking) return 'N/A';
    const category = normalizeAdminBookingCategory(booking.category);

    if (category.includes('flight')) {
        const flight = booking.flight || {};
        return `${flight.from || booking.from || 'Anywhere'} -> ${flight.to || booking.to || 'Anywhere'}`;
    }
    if (category === 'train') {
        const train = booking.train || {};
        return `${train.from || booking.from || 'Anywhere'} -> ${train.to || booking.to || 'Anywhere'}`;
    }
    if (category === 'bus') {
        const bus = booking.bus || {};
        return `${bus.from || booking.from || 'Anywhere'} -> ${bus.to || booking.to || 'Anywhere'}`;
    }
    if (category === 'cabs' || category === 'cab') {
        const cab = booking.cab || {};
        return `${cab.pickupLocation || booking.pickupLocation || booking.from || 'Pickup'} -> ${cab.dropLocation || booking.dropLocation || booking.to || 'Drop'}`;
    }
    if (category === 'hotel') {
        return `${booking.hotel?.name || booking.hotelName || 'Hotel Booking'}${booking.hotel?.location?.city ? ` (${booking.hotel.location.city})` : ''}`;
    }
    if (category === 'package') {
        return booking.package?.title || booking.packageTitle || 'Holiday Package';
    }

    return `${booking.from || 'N/A'} -> ${booking.to || 'N/A'}`;
};

const AdminBookings = () => {
    const { showToast } = useToast();
    const { confirm } = useAdminUX();
    const [activeTab, setActiveTab] = useState('all');
    const [allBookingsData, setAllBookingsData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await axios.get(`${API_URL}/admin/bookings`, getAdminAuthConfig());
            const fetchedBookings = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.bookings)
                    ? response.data.bookings
                    : [];

            fetchedBookings.sort((a, b) => new Date(b.bookingDate || b.createdAt) - new Date(a.bookingDate || a.createdAt));
            setAllBookingsData(fetchedBookings);
        } catch (err) {
            console.error('Error fetching bookings:', err);
            setAllBookingsData([]);
            setError(err.response?.data?.message || 'Failed to fetch bookings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (bookingId, newStatus) => {
        try {
            await axios.put(`${API_URL}/admin/bookings/${bookingId}`, { status: newStatus }, getAdminAuthConfig());
            fetchBookings();
            showToast({
                type: 'success',
                title: 'Booking updated',
                message: `Booking status changed to ${newStatus}.`
            });
        } catch (err) {
            console.error('Error updating booking status:', err);
            setError('Failed to update booking status.');
            showToast({
                type: 'error',
                title: 'Status update failed',
                message: err.response?.data?.message || 'Failed to update booking status.'
            });
        }
    };

    const handleDelete = async (bookingId) => {
        const confirmed = await confirm({
            title: 'Delete booking',
            message: 'This booking will be permanently removed from the admin ledger.',
            confirmLabel: 'Delete booking',
            tone: 'danger'
        });
        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/admin/bookings/${bookingId}`, getAdminAuthConfig());
            fetchBookings();
            showToast({
                type: 'success',
                title: 'Successfully deleted',
                message: 'Booking deleted successfully.'
            });
        } catch (err) {
            console.error('Error deleting booking:', err);
            setError('Failed to delete booking.');
            showToast({
                type: 'error',
                title: 'Delete failed',
                message: err.response?.data?.message || 'Failed to delete booking.'
            });
        }
    };

    const normalizedSearchTerm = getNormalizedSearchTerm(searchTerm);
    const filteredBookings = useMemo(() => allBookingsData.filter((booking) => {
        const normalizedCategory = normalizeAdminBookingCategory(booking.category);
        const matchesTab = activeTab === 'all' ||
            (activeTab === 'flights' && normalizedCategory === 'flight') ||
            (activeTab === 'hotels' && normalizedCategory === 'hotel') ||
            (activeTab === 'trains' && normalizedCategory === 'train') ||
            (activeTab === 'buses' && normalizedCategory === 'bus') ||
            (activeTab === 'cabs' && normalizedCategory === 'cabs') ||
            (activeTab === 'packages' && normalizedCategory === 'package');

        if (!matchesTab) return false;
        if (!normalizedSearchTerm) return true;

        return (
            includesNormalizedSearch(booking.userId?.name, normalizedSearchTerm) ||
            includesNormalizedSearch(booking.userId?.email, normalizedSearchTerm) ||
            includesNormalizedSearch(booking.category, normalizedSearchTerm) ||
            includesNormalizedSearch(booking.status, normalizedSearchTerm) ||
            includesNormalizedSearch(booking._id, normalizedSearchTerm)
        );
    }), [activeTab, allBookingsData, normalizedSearchTerm]);

    const bookingMetrics = useMemo(() => {
        const summary = filteredBookings.reduce((acc, booking) => {
            const amount = Number(booking.totalFare || booking.totalPrice || 0);
            const status = String(booking.status || '').toLowerCase();
            const category = normalizeAdminBookingCategory(booking.category);

            acc.revenue += amount;
            if (status === 'confirmed' || status === 'completed' || status === 'active') acc.confirmed += 1;
            else if (status === 'pending' || status === 'waiting') acc.pending += 1;
            else if (isCancellationStatus(status)) acc.cancelled += 1;

            acc.categories[category] = (acc.categories[category] || 0) + 1;
            return acc;
        }, {
            revenue: 0,
            confirmed: 0,
            pending: 0,
            cancelled: 0,
            categories: {}
        });

        const topCategoryEntry = Object.entries(summary.categories).sort((a, b) => b[1] - a[1])[0];

        return {
            total: filteredBookings.length,
            revenue: summary.revenue,
            confirmed: summary.confirmed,
            pending: summary.pending,
            cancelled: summary.cancelled,
            topCategory: topCategoryEntry ? getCategoryLabel(topCategoryEntry[0]) : 'No category'
        };
    }, [filteredBookings]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

    useClampedAdminPage(totalPages, setCurrentPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="management-container admin-bookings-page">
            <div className="management-header">
                <div className="header-main">
                    <h1>Bookings Management</h1>
                    <p>Track and manage all user travel reservations across categories.</p>
                </div>

                <div className="management-actions">
                    <div className="search-box">
                        <span className="search-icon">Search</span>
                        <input
                            type="text"
                            placeholder="Search by user, email, ID or status..."
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <button className="upload-btn" onClick={fetchBookings}>
                        Refresh Data
                    </button>
                </div>
            </div>

            <section className="admin-page-hero admin-bookings-hero">
                <div className="admin-page-hero__copy">
                    <span className="admin-page-hero__kicker">Reservation Control</span>
                    <h2>Keep every booking visible, actionable, and easy to moderate.</h2>
                    <p>
                        Review reservation flow, monitor status movement, and step in quickly when
                        pending or cancelled bookings start to build up.
                    </p>
                    <div className="admin-page-hero__chips">
                        <div className="admin-page-hero__chip">
                            <span>Showing</span>
                            <strong>{bookingMetrics.total} bookings</strong>
                        </div>
                        <div className="admin-page-hero__chip">
                            <span>Revenue in view</span>
                            <strong>{formatCurrency(bookingMetrics.revenue)}</strong>
                        </div>
                        <div className="admin-page-hero__chip">
                            <span>Top service</span>
                            <strong>{bookingMetrics.topCategory}</strong>
                        </div>
                    </div>
                </div>

                <div className="admin-page-spotlight admin-bookings-spotlight">
                    <div className="admin-page-spotlight__head">
                        <span className="admin-page-spotlight__icon">
                            <AdminIcon name="bookings" />
                        </span>
                        <div>
                            <span className="admin-page-spotlight__label">Status Snapshot</span>
                            <h3>Booking pulse</h3>
                        </div>
                    </div>
                    <p>Focus on pending reservations first, then resolve cancellations to keep the ledger healthy.</p>
                    <div className="admin-page-spotlight__grid">
                        <div>
                            <span>Confirmed</span>
                            <strong>{bookingMetrics.confirmed}</strong>
                        </div>
                        <div>
                            <span>Pending</span>
                            <strong>{bookingMetrics.pending}</strong>
                        </div>
                        <div>
                            <span>Cancelled</span>
                            <strong>{bookingMetrics.cancelled}</strong>
                        </div>
                        <div>
                            <span>Active view</span>
                            <strong>{activeTab === 'all' ? 'All services' : getCategoryLabel(activeTab)}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="admin-page-metrics admin-bookings-metrics">
                <div className="admin-page-metric-card">
                    <span className="admin-page-metric-card__icon"><AdminIcon name="bookings" /></span>
                    <div>
                        <span>Total reservations</span>
                        <strong>{bookingMetrics.total}</strong>
                    </div>
                </div>
                <div className="admin-page-metric-card">
                    <span className="admin-page-metric-card__icon"><AdminIcon name="revenue" /></span>
                    <div>
                        <span>Revenue on screen</span>
                        <strong>{formatCurrency(bookingMetrics.revenue)}</strong>
                    </div>
                </div>
                <div className="admin-page-metric-card">
                    <span className="admin-page-metric-card__icon"><AdminIcon name="activity" /></span>
                    <div>
                        <span>Pending actions</span>
                        <strong>{bookingMetrics.pending}</strong>
                    </div>
                </div>
                <div className="admin-page-metric-card">
                    <span className="admin-page-metric-card__icon"><AdminIcon name="tag" /></span>
                    <div>
                        <span>Top service</span>
                        <strong>{bookingMetrics.topCategory}</strong>
                    </div>
                </div>
            </section>

            <section className="admin-page-panel">
                <div className="admin-page-panel__head">
                    <div>
                        <span className="admin-page-panel__kicker">Reservation Ledger</span>
                        <h3>Filter bookings by service and status</h3>
                        <p>{filteredBookings.length} records match the current search and active tab.</p>
                    </div>
                </div>

                <div className="bookings-tabs-container">
                    <div className="management-tabs">
                        <button className={`tab-link ${activeTab === 'all' ? 'active' : ''}`} onClick={() => { setActiveTab('all'); setCurrentPage(1); }}>All</button>
                        <button className={`tab-link ${activeTab === 'flights' ? 'active' : ''}`} onClick={() => { setActiveTab('flights'); setCurrentPage(1); }}>Flights</button>
                        <button className={`tab-link ${activeTab === 'hotels' ? 'active' : ''}`} onClick={() => { setActiveTab('hotels'); setCurrentPage(1); }}>Hotels</button>
                        <button className={`tab-link ${activeTab === 'trains' ? 'active' : ''}`} onClick={() => { setActiveTab('trains'); setCurrentPage(1); }}>Trains</button>
                        <button className={`tab-link ${activeTab === 'buses' ? 'active' : ''}`} onClick={() => { setActiveTab('buses'); setCurrentPage(1); }}>Buses</button>
                        <button className={`tab-link ${activeTab === 'cabs' ? 'active' : ''}`} onClick={() => { setActiveTab('cabs'); setCurrentPage(1); }}>Cabs</button>
                        <button className={`tab-link ${activeTab === 'packages' ? 'active' : ''}`} onClick={() => { setActiveTab('packages'); setCurrentPage(1); }}>Packages</button>
                    </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Sr No.</th>
                                <th>User Identity</th>
                                <th>Category</th>
                                <th>Reservation Details</th>
                                <th>Amount</th>
                                <th>Current Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="table-loader">Loading bookings...</div>
                                    </td>
                                </tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((booking, index) => (
                                    <tr key={booking._id}>
                                        <td><strong>{indexOfFirstItem + index + 1}</strong></td>
                                        <td>
                                            <div className="user-info">
                                                <strong className="user-name">{booking.userId?.name || 'Guest'}</strong>
                                                <span className="user-email">{booking.userId?.email || booking.contactDetails?.email || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`service-tag-mini ${String(booking.category || '').toLowerCase()}`}>
                                                {booking.category || 'Unknown'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="booking-summary">
                                                <span className="booking-date">{new Date(booking.bookingDate || booking.createdAt).toLocaleDateString()}</span>
                                                <span className="booking-route">{getBookingDetails(booking)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <strong className="amount-cell">{formatCurrency(booking.totalFare || booking.totalPrice || 0)}</strong>
                                        </td>
                                        <td>
                                            <div className="status-select-wrapper">
                                                <select
                                                    className={`status-select-inline ${getStatusColor(booking.status)}`}
                                                    value={booking.status}
                                                    disabled={isCancellationStatus(booking.status)}
                                                    onChange={(event) => handleStatusUpdate(booking._id, event.target.value)}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Confirmed">Confirmed</option>
                                                    <option value="Completed">Completed</option>
                                                    {isCancellationStatus(booking.status) && (
                                                        <option value={booking.status}>{booking.status}</option>
                                                    )}
                                                </select>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                <button className="delete-btn" onClick={() => handleDelete(booking._id)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="empty-table">No bookings found matching your criteria.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div className="pagination-container">
                            <div className="pagination-info">
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBookings.length)} of {filteredBookings.length} entries
                            </div>
                            <div className="pagination-controls">
                                <button
                                    className="page-nav"
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Prev
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                                    .map((page, index, array) => {
                                        const elements = [];
                                        if (index > 0 && page !== array[index - 1] + 1) {
                                            elements.push(<span key={`ell-${page}`} className="pagination-ellipsis">...</span>);
                                        }
                                        elements.push(
                                            <button
                                                key={page}
                                                className={`page-num ${currentPage === page ? 'selected' : ''}`}
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
                </div>
            </section>
        </div>
    );
};

export default AdminBookings;
