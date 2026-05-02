import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/api';
import { useAdminUX } from '../AdminUXContext';
import { getAdminAuthConfig, useClampedAdminPage } from '../adminPageUtils';
import './AdminFeedback.css';

const itemsPerPage = 10;

const normalizeFeedbackCategory = (category = '') => {
    const value = String(category).trim().toLowerCase();
    if (value === 'flights' || value === 'flight') return 'flight';
    if (value === 'hotels' || value === 'hotel') return 'hotel';
    if (value === 'trains' || value === 'train') return 'train';
    if (value === 'buses' || value === 'bus') return 'bus';
    if (value === 'cabs' || value === 'cab') return 'cab';
    if (value === 'packages' || value === 'package' || value === 'holiday') return 'package';
    return 'other';
};

const formatFeedbackCategory = (category = '') => {
    const normalized = normalizeFeedbackCategory(category);
    if (normalized === 'bus') return 'Bus';
    if (normalized === 'cab') return 'Cab';
    if (normalized === 'hotel') return 'Hotel';
    if (normalized === 'train') return 'Train';
    if (normalized === 'flight') return 'Flight';
    if (normalized === 'package') return 'Package';
    return 'Other';
};

const resolveFeedbackCategory = (item) => item?.category || item?.bookingId?.category || 'other';

const getRatingStars = (rating = 0) => {
    const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
    return `${'\u2605'.repeat(safeRating)}${'\u2606'.repeat(5 - safeRating)}`;
};

const AdminFeedback = () => {
    const { notify } = useAdminUX();
    const [feedbackList, setFeedbackList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterRating, setFilterRating] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchFeedback = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${API_BASE_URL}/feedback/admin/all`, {
                params: { category: filterCategory, rating: filterRating },
                ...getAdminAuthConfig()
            });
            setFeedbackList(res.data.feedback || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch feedback');
        } finally {
            setLoading(false);
        }
    }, [filterCategory, filterRating]);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterCategory, filterRating]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = feedbackList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(feedbackList.length / itemsPerPage);

    useClampedAdminPage(totalPages, setCurrentPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleDeleteFeedback = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/feedback/admin/${id}`, getAdminAuthConfig());
            setFeedbackList((current) => current.filter((item) => item._id !== id));
            notify({
                type: 'success',
                title: 'Successfully deleted',
                message: 'Feedback deleted successfully.'
            });
        } catch (err) {
            notify({
                type: 'error',
                title: 'Delete failed',
                message: err.response?.data?.message || 'Failed to delete feedback.'
            });
        }
    };

    return (
        <div className="management-container admin-feedback-container admin-feedback-page">
            <div className="management-header feedback-header">
                <div className="header-main">
                    <h1>Guest Feedback and Reviews</h1>
                    <p>Monitor guest experiences, moderate reviews, and maintain elite service standards.</p>
                </div>
            </div>

            <div className="feedback-content-shell">
                <section className="admin-page-panel">
                    <div className="admin-page-panel__head">
                        <div>
                            <span className="admin-page-panel__kicker">Moderation Queue</span>
                            <h3>Filter service reviews and remove unwanted entries</h3>
                            <p>{feedbackList.length} reviews are currently loaded for moderation.</p>
                        </div>
                    </div>

                    <div className="management-filters">
                        <div className="filter-group">
                            <label className="feedback-filter-label">CATEGORY</label>
                            <select className="form-select" value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
                                <option value="all">All Categories</option>
                                <option value="flight">Flights</option>
                                <option value="hotel">Hotels</option>
                                <option value="train">Trains</option>
                                <option value="bus">Buses</option>
                                <option value="cab">Cabs</option>
                                <option value="package">Packages</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="feedback-filter-label">RATING</label>
                            <select className="form-select" value={filterRating} onChange={(event) => setFilterRating(event.target.value)}>
                                <option value="all">Any Rating</option>
                                <option value="5">5 Stars</option>
                                <option value="4">4 Stars</option>
                                <option value="3">3 Stars</option>
                                <option value="2">2 Stars</option>
                                <option value="1">1 Star</option>
                            </select>
                        </div>
                    </div>

                    {error && <div className="error-banner">{error}</div>}

                    <div className="management-card">
                        <div className="table-responsive">
                            <table className="management-table">
                                <colgroup>
                                    <col className="feedback-col feedback-col--sr" />
                                    <col className="feedback-col feedback-col--user" />
                                    <col className="feedback-col feedback-col--category" />
                                    <col className="feedback-col feedback-col--rating" />
                                    <col className="feedback-col feedback-col--title" />
                                    <col className="feedback-col feedback-col--message" />
                                    <col className="feedback-col feedback-col--actions" />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>Sr No.</th>
                                        <th>User</th>
                                        <th>Category</th>
                                        <th>Rating</th>
                                        <th>Title</th>
                                        <th>Feedback</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="empty-table">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : currentItems.length > 0 ? (
                                        currentItems.map((item, index) => {
                                            const resolvedCategory = resolveFeedbackCategory(item);

                                            return (
                                                <tr key={item._id} className="feedback-row">
                                                    <td className="feedback-sr-no">{indexOfFirstItem + index + 1}</td>
                                                    <td className="feedback-user-cell">
                                                        <div className="user-info">
                                                            <span className="user-name">{item.userId?.name || 'N/A'}</span>
                                                            <span className="user-email">{item.userId?.email || 'No email'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="feedback-category-cell">
                                                        <span className={`category-tag ${normalizeFeedbackCategory(resolvedCategory)}`}>
                                                            {formatFeedbackCategory(resolvedCategory)}
                                                        </span>
                                                    </td>
                                                    <td className="feedback-rating-cell">
                                                        <div className="feedback-rating-stars">{getRatingStars(item.rating)}</div>
                                                    </td>
                                                    <td className="feedback-title-cell">
                                                        <strong className="feedback-title feedback-title-standalone">{item.title || 'Untitled review'}</strong>
                                                    </td>
                                                    <td className="feedback-message-cell">
                                                        <div className="feedback-content">
                                                            <p className="feedback-message">{item.message || 'No message provided.'}</p>
                                                            <span className="feedback-meta-line">
                                                                {item.wouldRecommend ? 'Recommended' : 'Not Recommended'} |{' '}
                                                                {new Date(item.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="feedback-actions-cell">
                                                        <div className="action-btns">
                                                            <button
                                                                className="delete-feedback-btn"
                                                                onClick={() => handleDeleteFeedback(item._id)}
                                                                title="Delete Feedback"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="empty-table">
                                                No feedback found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination-container" style={{ marginTop: '24px' }}>
                                <div className="pagination-info">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, feedbackList.length)} of {feedbackList.length} entries
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
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminFeedback;
