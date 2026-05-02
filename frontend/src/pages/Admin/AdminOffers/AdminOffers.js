import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/api';
import AdminIcon from '../AdminIcons/AdminIcons';
import { useAdminUX } from '../AdminUXContext';
import {
    getAdminAuthConfig,
    getNormalizedSearchTerm,
    includesNormalizedSearch,
    useClampedAdminPage,
} from '../adminPageUtils';
import './AdminOffers.css';

const AdminOffers = () => {
    const { confirm, notify } = useAdminUX();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [uploadModal, setUploadModal] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);
    
    // Pagination & Search State
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        promoCode: '',
        discountType: 'percentage',
        discountValue: '',
        minBookingAmount: '',
        maxDiscount: '',
        validTill: '',
        category: 'all',
        imageUrl: '',
        isActive: true
    });

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/offers`, {
                ...getAdminAuthConfig()
            });
            setOffers(response.data);
        } catch (error) {
            console.error('Error fetching offers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (id) => {
        try {
            await axios.patch(`${API_BASE_URL}/admin/offers/${id}/toggle`, {}, {
                ...getAdminAuthConfig()
            });
            fetchOffers();
        } catch (error) {
            notify({
                type: 'error',
                title: 'Status update failed',
                message: 'Error toggling offer status.'
            });
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: 'Delete offer',
            message: 'This offer will be permanently removed from campaigns.',
            confirmLabel: 'Delete offer',
            tone: 'danger'
        });
        if (!confirmed) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/offers/${id}`, {
                ...getAdminAuthConfig()
            });
            setOffers((currentOffers) => currentOffers.filter((offer) => offer._id !== id));
            notify({
                type: 'success',
                title: 'Successfully deleted',
                message: 'Offer deleted successfully.'
            });
            fetchOffers();
        } catch (error) {
            notify({
                type: 'error',
                title: 'Delete failed',
                message: 'Error deleting offer.'
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingOffer) {
                await axios.put(`${API_BASE_URL}/admin/offers/${editingOffer._id}`, formData, {
                    ...getAdminAuthConfig()
                });
            } else {
                await axios.post(`${API_BASE_URL}/admin/offers`, formData, {
                    ...getAdminAuthConfig()
                });
            }
            setShowModal(false);
            setEditingOffer(null);
            fetchOffers();
        } catch (error) {
            notify({
                type: 'error',
                title: 'Save failed',
                message: error.response?.data?.message || 'Error saving offer.'
            });
        }
    };

    const openEdit = (offer) => {
        setEditingOffer(offer);
        setFormData({
            title: offer.title,
            description: offer.description,
            promoCode: offer.promoCode,
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            minBookingAmount: offer.minBookingAmount || 0,
            maxDiscount: offer.maxDiscount || 0,
            validTill: offer.validTill ? new Date(offer.validTill).toISOString().split('T')[0] : '',
            category: offer.category,
            imageUrl: offer.imageUrl || '',
            isActive: offer.isActive
        });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditingOffer(null);
        setFormData({
            title: '',
            description: '',
            promoCode: '',
            discountType: 'percentage',
            discountValue: '',
            minBookingAmount: '',
            maxDiscount: '',
            validTill: '',
            category: 'all',
            imageUrl: '',
            isActive: true
        });
        setShowModal(true);
    };

    const handleUploadClick = () => {
        setUploadModal(true);
    };

    const closeUploadModal = () => {
        setUploadModal(false);
        setUploadLoading(false);
        setUploadResult(null);
        setPreviewData(null);
        setConfirmStep(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (fileExtension !== 'csv' && fileExtension !== 'json') {
            notify({
                type: 'error',
                title: 'Invalid file type',
                message: 'Only CSV and JSON files are allowed.'
            });
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            notify({
                type: 'error',
                title: 'File too large',
                message: 'File size must be less than 5MB.'
            });
            e.target.value = '';
            return;
        }

        setUploadLoading(true);
        setUploadResult(null);
        setPreviewData(null);
        setConfirmStep(false);

        try {
            const fd = new FormData();
            fd.append('file', file);

            const response = await axios.post(`${API_BASE_URL}/admin/offers/preview`, fd, {
                headers: {
                    ...getAdminAuthConfig().headers,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setPreviewData(response.data);
            e.target.value = '';
        } catch (error) {
            console.error('Error previewing offers upload:', error);
            setUploadResult({
                message: error.response?.data?.message || 'Preview failed',
                errors: [error.response?.data?.error || 'Unknown error']
            });
        } finally {
            setUploadLoading(false);
        }
    };

    const handleConfirmUpload = async () => {
        if (!previewData?.valid?.length) return;

        setUploadLoading(true);
        setConfirmStep(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/admin/offers/upload`, {
                offersToUpload: previewData.valid
            }, {
                ...getAdminAuthConfig()
            });

            setUploadResult(response.data);
            setPreviewData(null);
            fetchOffers();
        } catch (error) {
            console.error('Error uploading offers:', error);
            setUploadResult({
                message: error.response?.data?.message || 'Upload failed',
                errors: [error.response?.data?.error || 'Unknown error']
            });
        } finally {
            setUploadLoading(false);
            setConfirmStep(false);
        }
    };

    const filterOptions = [
        { key: 'all', label: 'All' },
        { key: 'bus', label: 'Bus' },
        { key: 'cabs', label: 'Cab' },
        { key: 'hotels', label: 'Hotels' },
        { key: 'packages', label: 'Holidays' },
        { key: 'flights', label: 'Flight' },
        { key: 'trains', label: 'Train' }
    ];

    const filteredOffers = offers.filter((offer) => {
        if (activeFilter === 'all') return true;
        return String(offer.category || '').toLowerCase() === activeFilter;
    });

    const normalizedSearchTerm = getNormalizedSearchTerm(searchTerm);
    const finalOffers = filteredOffers.filter(offer => 
        includesNormalizedSearch(offer.title, normalizedSearchTerm) || 
        includesNormalizedSearch(offer.promoCode, normalizedSearchTerm)
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = finalOffers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(finalOffers.length / itemsPerPage);

    useClampedAdminPage(totalPages, setCurrentPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="management-container admin-offers-container">
            <div className="management-header offers-header">
                <div className="header-main">
                    <h1>Dynamic Offers and Deals</h1>
                    <p>Curate premium promotional discounts and elite member rewards.</p>
                </div>
                <div className="management-actions">
                    <div className="search-box">
                        <span className="search-icon">Search</span>
                        <input 
                            type="text" 
                            placeholder="Search offers..." 
                            value={searchTerm}
                            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                        />
                    </div>
                    <div className="header-buttons">
                        <button className="upload-btn" type="button" onClick={handleUploadClick}>
                            <span>↑</span> UPLOAD OFFERS
                        </button>
                        <button className="add-btn" onClick={openCreate}>
                            <span>+</span> CREATE NEW OFFER
                        </button>
                    </div>
                </div>
            </div>

            <div className="offers-filter-bar elite-glass">
                {filterOptions.map((option) => (
                    <button
                        key={option.key}
                        type="button"
                        className={`offers-filter-chip ${activeFilter === option.key ? 'active' : ''}`}
                        onClick={() => { setActiveFilter(option.key); setCurrentPage(1); }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="admin-loading">Loading offers...</div>
            ) : (
                <>
                <div className="admin-offers-grid">
                    {currentItems.map((offer) => (
                        <div key={offer._id} className={`offer-card-v4 ${!offer.isActive ? 'is-disabled' : ''}`}>
                            <div className="offer-image-box">
                                <img src={offer.imageUrl || 'https://via.placeholder.com/400x200'} alt={offer.title} />
                                <div className={`category-tag ${offer.category}`}>{String(offer.category || 'all').toUpperCase()}</div>
                                <button className="toggle-btn-v4" onClick={() => handleToggle(offer._id)}>
                                    {offer.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </button>
                            </div>
                            <div className="offer-body-v4">
                                <div className="offer-header">
                                    <h3>{offer.title}</h3>
                                    <div className="promo-pill">{offer.promoCode}</div>
                                </div>
                                <p className="offer-desc">{offer.description}</p>
                                <div className="offer-meta">
                                    <div className="meta-item">
                                        <span className="label">DISCOUNT</span>
                                        <span className="value">
                                            {offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                                        </span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="label">EXPIRY</span>
                                        <span className="value">{new Date(offer.validTill).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="offer-actions">
                                    <button className="btn-icon" onClick={() => openEdit(offer)}>
                                        <AdminIcon name="edit" />
                                    </button>
                                    <button className="btn-icon delete" onClick={() => handleDelete(offer._id)}>
                                        <AdminIcon name="logout" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="pagination-container">
                        <div className="pagination-info">
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, finalOffers.length)} of {finalOffers.length} entries
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
                </>
            )}

            {showModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-v4 elite-glass">
                        <h2>{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h2>
                        <form onSubmit={handleSubmit} className="admin-form-v4">
                            <div className="form-grid-v4">
                                <div className="form-group v4">
                                    <label>Offer Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                        placeholder="e.g. Summer Super Saver"
                                    />
                                </div>
                                <div className="form-group v4">
                                    <label>Promo Code</label>
                                    <input
                                        type="text"
                                        value={formData.promoCode}
                                        onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                                        required
                                        placeholder="e.g. SUMMER50"
                                    />
                                </div>
                                <div className="form-group v4 full-width">
                                    <label>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                        placeholder="Details about the offer..."
                                    />
                                </div>
                                <div className="form-group v4">
                                    <label>Discount Type</label>
                                    <select
                                        value={formData.discountType}
                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <div className="form-group v4">
                                    <label>Discount Value</label>
                                    <input
                                        type="number"
                                        value={formData.discountValue}
                                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group v4">
                                    <label>Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="all">Global (All)</option>
                                        <option value="flights">Flights</option>
                                        <option value="hotels">Hotels</option>
                                        <option value="trains">Trains</option>
                                        <option value="bus">Buses</option>
                                        <option value="cabs">Cabs</option>
                                        <option value="packages">Holiday Packages</option>
                                    </select>
                                </div>
                                <div className="form-group v4">
                                    <label>Expiry Date</label>
                                    <input
                                        type="date"
                                        value={formData.validTill}
                                        onChange={(e) => setFormData({ ...formData, validTill: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group v4">
                                    <label>Min Booking Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={formData.minBookingAmount}
                                        onChange={(e) => setFormData({ ...formData, minBookingAmount: e.target.value })}
                                    />
                                </div>
                                <div className="form-group v4">
                                    <label>Image URL</label>
                                    <input
                                        type="text"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        placeholder="https://images.unsplash.com/..."
                                    />
                                </div>
                            </div>
                            <div className="modal-actions-v4">
                                <button type="button" className="btn-elite-outline" onClick={() => setShowModal(false)}>CANCEL</button>
                                <button type="submit" className="btn-elite-primary">
                                    {editingOffer ? 'UPDATE OFFER' : 'CREATE OFFER'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {uploadModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-v4 elite-glass upload-modal offers-upload-modal">
                        <div className="modal-header">
                            <h2>Upload Offers</h2>
                            <button type="button" className="modal-close" onClick={closeUploadModal}>&times;</button>
                        </div>

                        {!uploadResult && !previewData ? (
                            <div className="upload-section">
                                <div className="upload-info">
                                    <p><strong>Supported formats:</strong> CSV, JSON</p>
                                    <p><strong>Max file size:</strong> 5MB</p>
                                </div>

                                <div className="file-upload-area">
                                    <input
                                        type="file"
                                        id="offers-file-upload"
                                        accept=".csv,.json"
                                        onChange={handleFileUpload}
                                        disabled={uploadLoading}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="offers-file-upload" className={`file-upload-label ${uploadLoading ? 'disabled' : ''}`}>
                                        {uploadLoading ? (
                                            <>
                                                <span className="upload-icon">⏳</span>
                                                <span className="upload-text">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="upload-icon">📁</span>
                                                <span className="upload-text">Click to Choose File</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        ) : previewData ? (
                            <div className="preview-results">
                                <div className="preview-header">
                                    <h4>File Analysis Results</h4>
                                </div>

                                <div className="file-analysis-results">
                                    <div className="analysis-stats-grid">
                                        <div className="analysis-stat-card total">
                                            <span className="analysis-stat-number">{previewData.totalRecords}</span>
                                            <span className="analysis-stat-label">Total Records</span>
                                        </div>
                                        <div className="analysis-stat-card valid">
                                            <span className="analysis-stat-number">{previewData.validRecords}</span>
                                            <span className="analysis-stat-label">Valid Records</span>
                                        </div>
                                        <div className="analysis-stat-card duplicate">
                                            <span className="analysis-stat-number">{previewData.duplicateRecords}</span>
                                            <span className="analysis-stat-label">Duplicates</span>
                                        </div>
                                        <div className="analysis-stat-card invalid">
                                            <span className="analysis-stat-number">{previewData.invalidRecords}</span>
                                            <span className="analysis-stat-label">Invalid Records</span>
                                        </div>
                                    </div>

                                    {previewData.invalidRecords > 0 && (
                                        <div className="invalid-records-section">
                                            <div className="invalid-records-title">Invalid Records (will be skipped)</div>
                                            {previewData.invalid.slice(0, 5).map((inv, index) => (
                                                <div key={index} className="invalid-record-item">
                                                    Row {inv.index}: {inv.reason}
                                                </div>
                                            ))}
                                            {previewData.invalid.length > 5 && (
                                                <div className="invalid-record-item">
                                                    ... and {previewData.invalid.length - 5} more invalid records
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {previewData.duplicateRecords > 0 && (
                                        <div className="invalid-records-section">
                                            <div className="invalid-records-title">Duplicate Records (will be skipped)</div>
                                            {previewData.duplicates.slice(0, 5).map((dup, index) => (
                                                <div key={index} className="invalid-record-item">
                                                    Row {dup.index}: {dup.promoCode} - {dup.reason}
                                                </div>
                                            ))}
                                            {previewData.duplicates.length > 5 && (
                                                <div className="invalid-record-item">
                                                    ... and {previewData.duplicates.length - 5} more duplicates
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {previewData.validRecords === 0 ? (
                                        <div className="confirmation-actions">
                                            <button type="button" className="btn-elite-outline" onClick={closeUploadModal}>Close</button>
                                        </div>
                                    ) : (
                                        <div className="confirmation-actions">
                                            <button type="button" className="btn-elite-outline" onClick={closeUploadModal}>Cancel</button>
                                            <button type="button" className="btn-elite-primary" onClick={handleConfirmUpload}>
                                                Confirm Upload ({previewData.validRecords} offers)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : confirmStep && uploadLoading ? (
                            <div className="confirm-step">
                                <div className="confirm-header">
                                    <h4>Uploading Offers...</h4>
                                </div>
                                <div className="upload-progress">
                                    <div className="spinner"></div>
                                    <p>Uploading offers to database...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="upload-results">
                                <div className={`result-header ${uploadResult?.errors?.length ? 'warning' : 'success'}`}>
                                    <h4>{uploadResult?.message || 'Upload Complete'}</h4>
                                </div>
                                <div className="result-stats">
                                    <p><strong>Total Processed:</strong> {uploadResult?.totalRecords || 0}</p>
                                    <p><strong>Successfully Uploaded:</strong> {uploadResult?.successful?.length || 0}</p>
                                    <p><strong>Failed:</strong> {uploadResult?.failed?.length || 0}</p>
                                </div>
                                {uploadResult?.errors?.length > 0 && (
                                    <div className="error-section">
                                        <h5>Errors:</h5>
                                        <ul className="error-list">
                                            {uploadResult.errors.slice(0, 10).map((err, index) => (
                                                <li key={index}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="confirmation-actions">
                                    <button type="button" className="btn-elite-primary" onClick={closeUploadModal}>Done</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOffers;

