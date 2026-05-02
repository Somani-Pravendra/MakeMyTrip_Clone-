import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/api';
import { normalizeCabType } from '../../../utils/cabBooking';
import { useAdminUX } from '../AdminUXContext';
import {
    exportRowsAsCsv,
    getAdminAuthConfig,
    getNormalizedSearchTerm,
    includesNormalizedSearch,
    useClampedAdminPage,
} from '../adminPageUtils';
import './AdminCabs.css';

const today = new Date().toISOString().split('T')[0];

const normalizeCabBookingStatus = (status) => {
    const rawStatus = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');

    if (!rawStatus) return 'pending';
    return rawStatus;
};

const toAdminStatusLabel = (status) => {
    const normalized = normalizeCabBookingStatus(status);

    if (normalized === 'confirmed') return 'Confirmed';
    if (normalized === 'completed') return 'Completed';
    if (normalized === 'cancelled') return 'Cancelled';
    if (normalized === 'pending') return 'Pending';
    return 'Pending';
};

const deriveCabRoute = (booking = {}) => {
    const pickup = booking.pickupLocationName || booking.pickupLocation || booking.cab?.pickupLocation;
    const drop = booking.dropLocationName || booking.dropLocation || booking.cab?.dropLocation;

    if (pickup || drop) {
        return {
            pickup: pickup || 'Pickup pending',
            drop: drop || 'Drop pending'
        };
    }

    const route = booking.details?.route || '';
    if (route.includes('->')) {
        const [routePickup, routeDrop] = route.split('->').map((item) => item.trim());
        return {
            pickup: routePickup || 'Pickup pending',
            drop: routeDrop || 'Drop pending'
        };
    }

    return {
        pickup: booking.from || 'Pickup pending',
        drop: booking.to || 'Drop pending'
    };
};

const normalizeCabBooking = (booking = {}) => {
    const route = deriveCabRoute(booking);

    return {
        ...booking,
        bookingId: booking.bookingId || booking._id || 'N/A',
        customerName: booking.userId?.name || booking.contactDetails?.name || booking.passengerName || 'Guest',
        customerEmail: booking.userId?.email || booking.contactDetails?.email || booking.passengerEmail || 'N/A',
        cabTypeName:
            booking.cabTypeId?.cabTypeName ||
            booking.cab?.cabType ||
            booking.cabType ||
            booking.title?.replace(/\s+Booking$/i, '') ||
            'N/A',
        pickupLocationName: route.pickup,
        dropLocationName: route.drop,
        estimatedFare: Number(booking.estimatedFare ?? booking.totalFare ?? booking.totalPrice ?? 0),
        bookingStatus: normalizeCabBookingStatus(booking.bookingStatus || booking.status)
    };
};
const AdminCabs = () => {
    const { confirm, notify } = useAdminUX();
    const [cabTypes, setCabTypes] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [activeTab, setActiveTab] = useState('types');
    const [showModal, setShowModal] = useState(false);
    const [editingCabType, setEditingCabType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    
    // Upload State
    const [uploadModal, setUploadModal] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);
    const [deletingCabTypeId, setDeletingCabTypeId] = useState(null);
    
    // Search & Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        cabTypeName: '',
        numberOfSeats: '',
        baseFare: '',
        pricePerKm: '',
        date: today,
        status: 'active',
        description: '',
        features: []
    });

    const [featureInput, setFeatureInput] = useState('');

    useEffect(() => {
        fetchCabTypes();
        setCurrentPage(1);
        if (activeTab === 'bookings') {
            fetchBookings();
        }
    }, [activeTab]);

    const fetchCabTypes = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/cabs/types`);
            const normalized = (response.data.data || []).map(normalizeCabType);
            setCabTypes(normalized);
        } catch (error) {
            console.error('Error fetching cab types:', error);
        }
    };

    const fetchBookings = async () => {
        setBookingsLoading(true);
        try {
            let fetchedBookings = [];

            try {
                const response = await axios.get(`${API_BASE_URL}/admin/bookings`, getAdminAuthConfig());
                fetchedBookings = Array.isArray(response.data)
                    ? response.data
                    : Array.isArray(response.data?.bookings)
                        ? response.data.bookings
                        : Array.isArray(response.data?.data)
                            ? response.data.data
                            : [];
            } catch (adminError) {
                console.warn('Admin bookings endpoint failed for cabs, using legacy cab bookings API.', adminError);
                const response = await axios.get(`${API_BASE_URL}/cabs/admin/bookings`, getAdminAuthConfig());
                fetchedBookings = Array.isArray(response.data?.data) ? response.data.data : [];
            }

            const cabBookings = fetchedBookings
                .filter((booking) => ['cab', 'cabs'].includes(String(booking.category || '').toLowerCase()))
                .map(normalizeCabBooking);

            setBookings(cabBookings);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setBookings([]);
        } finally {
            setBookingsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFeatureAdd = () => {
        if (featureInput.trim()) {
            setFormData(prev => ({
                ...prev,
                features: [...prev.features, featureInput.trim()]
            }));
            setFeatureInput('');
        }
    };

    const handleFeatureRemove = (index) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                numberOfSeats: Number(formData.numberOfSeats),
                baseFare: Number(formData.baseFare),
                pricePerKm: Number(formData.pricePerKm)
            };
            const config = getAdminAuthConfig();

            if (editingCabType) {
                await axios.put(`${API_BASE_URL}/cabs/types/${editingCabType.id}`, payload, config);
            } else {
                await axios.post(`${API_BASE_URL}/cabs/types`, payload, config);
            }
            fetchCabTypes();
            setShowModal(false);
            resetForm();
        } catch (error) {
            notify({
                type: 'error',
                title: 'Save failed',
                message: 'Error saving cab type: ' + (error.response?.data?.message || error.message)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (cabType) => {
        setEditingCabType(cabType);
        setFormData({
            cabTypeName: cabType.cabTypeName,
            numberOfSeats: cabType.numberOfSeats,
            baseFare: cabType.baseFare,
            pricePerKm: cabType.pricePerKm,
            date: cabType.date || today,
            status: cabType.status,
            description: cabType.description || '',
            features: cabType.features || []
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: 'Delete cab type',
            message: 'This cab type will be permanently removed from the catalog.',
            confirmLabel: 'Delete cab type',
            tone: 'danger'
        });
        if (!confirmed) return;
        try {
            setDeletingCabTypeId(id);
            await axios.delete(`${API_BASE_URL}/cabs/types/${id}`, getAdminAuthConfig());
            setCabTypes((currentCabTypes) => currentCabTypes.filter((cabType) => cabType.id !== id));
            notify({
                type: 'success',
                title: 'Successfully deleted',
                message: 'Cab type deleted successfully.'
            });
            fetchCabTypes();
        } catch (error) {
            console.error('Delete error:', error);
            notify({
                type: 'error',
                title: 'Delete failed',
                message: error.response?.data?.message || 'Error deleting cab type.'
            });
        } finally {
            setDeletingCabTypeId(null);
        }
    };

    const updateBookingStatus = async (bookingId, status) => {
        try {
            const isLegacyCabStatus = ['driver_assigned', 'in_progress', 'active'].includes(status);

            try {
                await axios.put(`${API_BASE_URL}/cabs/bookings/${bookingId}/status`,
                    { bookingStatus: status },
                    getAdminAuthConfig()
                );
            } catch (legacyError) {
                if (isLegacyCabStatus) {
                    throw legacyError;
                }

                await axios.put(`${API_BASE_URL}/admin/bookings/${bookingId}`,
                    { status: toAdminStatusLabel(status) },
                    getAdminAuthConfig()
                );
            }
            fetchBookings();
        } catch (error) {
            console.error('Error updating status:', error);
            notify({
                type: 'error',
                title: 'Status update failed',
                message: 'Unable to update cab booking status right now.'
            });
        }
    };

    
    const resetForm = () => {
        setFormData({
            cabTypeName: '',
            numberOfSeats: '',
            baseFare: '',
            pricePerKm: '',
            date: today,
            status: 'active',
            description: '',
            features: []
        });
        setEditingCabType(null);
        setFeatureInput('');
    };

    // Bulk Upload Handlers
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

            const response = await axios.post(`${API_BASE_URL}/cabs/types/preview`, fd, {
                headers: {
                    ...getAdminAuthConfig().headers,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setPreviewData(response.data);
            e.target.value = '';
        } catch (error) {
            console.error('Error previewing cab types upload:', error);
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
            const response = await axios.post(`${API_BASE_URL}/cabs/types/upload`, {
                cabTypesToUpload: previewData.valid
            }, getAdminAuthConfig());

            setUploadResult(response.data);
            setPreviewData(null);
            fetchCabTypes();
        } catch (error) {
            console.error('Error uploading cab types:', error);
            setUploadResult({
                message: error.response?.data?.message || 'Upload failed',
                errors: [error.response?.data?.error || 'Unknown error']
            });
        } finally {
            setUploadLoading(false);
            setConfirmStep(false);
        }
    };

    // Filter Logic
    const normalizedSearchTerm = getNormalizedSearchTerm(searchTerm);
    const filteredData = activeTab === 'types' 
        ? cabTypes.filter(c => includesNormalizedSearch(c.cabTypeName, normalizedSearchTerm))
        : bookings.filter(b => 
            includesNormalizedSearch(b.bookingId, normalizedSearchTerm) ||
            includesNormalizedSearch(b.customerName, normalizedSearchTerm) ||
            includesNormalizedSearch(b.customerEmail, normalizedSearchTerm) ||
            includesNormalizedSearch(b.cabTypeName, normalizedSearchTerm)
        );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    useClampedAdminPage(totalPages, setCurrentPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleExport = () => {
        const dataToExport = activeTab === 'types' ? cabTypes : bookings;
        if (!dataToExport || dataToExport.length === 0) return;

        const filename = `cabs_${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`;
        const csvData = activeTab === 'types'
            ? dataToExport.map(c => ({
                'Cab Type': c.cabTypeName,
                'Seats': c.numberOfSeats,
                'Base Fare': c.baseFare,
                'Price Per KM': c.pricePerKm,
                'Date': c.date || '',
                'Status': c.status,
                'Features': c.features?.join(' | ') || ''
            }))
            : dataToExport.map(b => ({
                'Booking ID': b.bookingId,
                'Customer': b.customerName || 'N/A',
                'Email': b.customerEmail || 'N/A',
                'Cab Type': b.cabTypeName || 'N/A',
                'Pickup': b.pickupLocationName,
                'Drop': b.dropLocationName,
                'Fare': b.estimatedFare,
                'Status': b.bookingStatus
            }));

        exportRowsAsCsv(csvData, filename);
    };

    return (
        <div className="management-container admin-cabs-container">
            <div className="management-header cabs-header">
                <div className="header-main">
                    <h1>Premium Fleet Management</h1>
                    <p>Manage luxury fleet categories and monitor elite booking requests.</p>
                </div>
                <div className="management-actions">
                    <div className="search-box">
                        <span className="search-icon">Search</span>
                        <input 
                            type="text" 
                            placeholder={activeTab === 'types' ? "Search fleet..." : "Search bookings..."}
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <div className="header-buttons">
                    <button className="export-btn" onClick={handleExport}>Export CSV</button>
                    {activeTab === 'types' && (
                        <>
                            <button className="upload-btn" onClick={handleUploadClick}>
                                📁 Upload Cab Types
                            </button>
                            <button className="add-btn" onClick={() => { resetForm(); setShowModal(true); }}>
                                + Add New Cab Type
                            </button>
                        </>
                    )}
                </div>
            </div>
            </div>

            <div className="management-tabs">
                <button className={`tab-link ${activeTab === 'types' ? 'active' : ''}`} onClick={() => { setActiveTab('types'); setCurrentPage(1); setSearchTerm(""); }}>Cab Fleet Types</button>
                <button className={`tab-link ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => { setActiveTab('bookings'); setCurrentPage(1); setSearchTerm(""); }}>Cab Bookings</button>
            </div>

            <div className="data-table-container">
                <table className="data-table">
                    {activeTab === 'types' ? (
                        <>
                                <thead>
                                    <tr>
                                        <th>Sr No.</th>
                                        <th>Cab Type</th>
                                        <th>Seats</th>
                                        <th>Pricing</th>
                                        <th>Date</th>
                                        <th>Features</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((cab, idx) => (
                                        <tr key={cab.id || idx}>
                                            <td><strong>{indexOfFirstItem + idx + 1}</strong></td>
                                            <td><strong className="main-text">{cab.cabTypeName}</strong></td>
                                            <td>{cab.numberOfSeats} Seats</td>
                                            <td>
                                                <div className="price-stack">
                                                    <span>Base: ₹{cab.baseFare}</span>
                                                    <span className="sub-text">₹{cab.pricePerKm}/km</span>
                                                </div>
                                            </td>
                                            <td>{cab.date || 'N/A'}</td>
                                            <td>
                                                <div className="feature-tags-inline">
                                                    {cab.features?.slice(0, 2).map((f, i) => (
                                                        <span key={i} className="small-tag">{f}</span>
                                                    ))}
                                                    {cab.features?.length > 2 && <span className="more-text">+{cab.features.length - 2} more</span>}
                                                </div>
                                            </td>
                                            <td><span className={`status-badge ${cab.status}`}>{cab.status}</span></td>
                                            <td>
                                                <div className="action-btns">
                                                    <button className="edit-btn" onClick={() => handleEdit(cab)}>Edit</button>
                                                    <button
                                                        className="delete-btn"
                                                        onClick={() => handleDelete(cab.id)}
                                                        disabled={deletingCabTypeId === cab.id}
                                                    >
                                                        {deletingCabTypeId === cab.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        ) : (
                            <>
                                <thead>
                                    <tr>
                                        <th>Sr No.</th>
                                        <th>Booking ID</th>
                                        <th>Customer</th>
                                        <th>Cab Type</th>
                                        <th>Route Details</th>
                                        <th>Fare</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookingsLoading ? (
                                        <tr><td colSpan="8" className="table-loader">Loading bookings...</td></tr>
                                    ) : currentItems.map((b, idx) => (
                                        <tr key={b._id || idx}>
                                            <td><strong>{indexOfFirstItem + idx + 1}</strong></td>
                                            <td><span className="id-text">{b.bookingId}</span></td>
                                            <td>
                                                <div className="user-info">
                                                    <strong>{b.customerName || 'N/A'}</strong>
                                                    <span className="sub-text">{b.customerEmail || ''}</span>
                                                </div>
                                            </td>
                                            <td>{b.cabTypeName || 'N/A'}</td>
                                            <td>
                                                <div className="route-info-stack">
                                                    <span className="pickup">📍 {b.pickupLocationName}</span>
                                                    <span className="drop">🏁 {b.dropLocationName}</span>
                                                </div>
                                            </td>
                                            <td><strong>₹{b.estimatedFare?.toFixed(2)}</strong></td>
                                            <td><span className={`status-badge ${b.bookingStatus}`}>{b.bookingStatus?.replace('_', ' ')}</span></td>
                                            <td>
                                                <div className="table-status-actions">
                                                    <select 
                                                        className={`status-select-inline ${
                                                            ['confirmed', 'active', 'completed'].includes(b.bookingStatus) ? 'status-active' :
                                                            ['cancelled', 'failed'].includes(b.bookingStatus) ? 'status-inactive' :
                                                            'status-pending'
                                                        }`}
                                                        value={b.bookingStatus}
                                                        onChange={(e) => updateBookingStatus(b._id, e.target.value)}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="confirmed">Confirmed</option>
                                                        <option value="driver_assigned">Driver Assigned</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="active">Active</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}
                </table>
            </div>

                {totalPages > 1 && (
                    <div className="pagination-wrapper">
                        <div className="pagination-info">
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} entries
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
                                        className={`page-num ${currentPage === page ? 'active' : ''}`}
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

            {showModal && (
                <div className="modal-overlay cab-modal">
                    <div className="modal-content-glass">
                        <div className="modal-header">
                            <h3>{editingCabType ? 'Edit Fleet Category' : 'Add New Fleet Category'}</h3>
                            <button type="button" className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="admin-form">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Cab Category Name</label>
                                    <input type="text" name="cabTypeName" value={formData.cabTypeName} onChange={handleInputChange} placeholder="e.g. Luxury Sedan" required />
                                </div>
                                <div className="form-group">
                                    <label>Seating Capacity</label>
                                    <input type="number" name="numberOfSeats" value={formData.numberOfSeats} onChange={handleInputChange} min="1" required />
                                </div>
                                <div className="form-group">
                                    <label>Base Fare (₹)</label>
                                    <input type="number" name="baseFare" value={formData.baseFare} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Price per KM (₹)</label>
                                    <input type="number" name="pricePerKm" value={formData.pricePerKm} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
                                </div>
                            </div>
                            <div className="form-group full-width">
                                <label>Features</label>
                                <div className="input-with-btn">
                                    <input type="text" value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} placeholder="e.g. AC, GPS, Extra Luggage" onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleFeatureAdd(); }}}/>
                                    <button type="button" className="inline-add-btn" onClick={handleFeatureAdd}>Add</button>
                                </div>
                                <div className="tags-container">
                                    {formData.features.map((f, i) => (
                                        <span key={i} className="elite-tag">{f} <i onClick={() => handleFeatureRemove(i)}>&times;</i></span>
                                    ))}
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Saving...' : 'Save Fleet Category'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {uploadModal && (
                <div className="modal-overlay">
                    <div className="modal-content-glass upload-modal cabs-upload-modal">
                        <div className="modal-header">
                            <h3>Upload Fleet Categories</h3>
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
                                        id="cabs-file-upload"
                                        accept=".csv,.json"
                                        onChange={handleFileUpload}
                                        disabled={uploadLoading}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="cabs-file-upload" className={`file-upload-label ${uploadLoading ? 'disabled' : ''}`}>
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

                                    {previewData.validRecords === 0 ? (
                                        <div className="confirmation-actions">
                                            <button type="button" className="cancel-btn" onClick={closeUploadModal}>Close</button>
                                        </div>
                                    ) : (
                                        <div className="confirmation-actions">
                                            <button type="button" className="cancel-btn" onClick={closeUploadModal}>Cancel</button>
                                            <button type="button" className="submit-btn" onClick={handleConfirmUpload}>
                                                Confirm Upload ({previewData.validRecords} Cab Types)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : confirmStep && uploadLoading ? (
                            <div className="confirm-step">
                                <div className="confirm-header">
                                    <h4>Uploading Fleet Categories...</h4>
                                </div>
                                <div className="upload-progress">
                                    <div className="spinner"></div>
                                    <p>Uploading fleet categories to database...</p>
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
                                    <button type="button" className="submit-btn" onClick={closeUploadModal}>Done</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCabs;

