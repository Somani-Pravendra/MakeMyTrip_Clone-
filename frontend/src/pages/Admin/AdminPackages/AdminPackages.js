import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../utils/api";
import { useAdminUX } from "../AdminUXContext";
import {
    exportRowsAsCsv,
    getAdminAuthConfig,
    getNormalizedSearchTerm,
    includesNormalizedSearch,
    useClampedAdminPage,
} from "../adminPageUtils";
import "./AdminPackages.css";

const API_URL = `${API_BASE_URL}/packages`;
const today = new Date().toISOString().split('T')[0];

const AdminPackages = () => {
    const { confirm, notify } = useAdminUX();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);

    // Pagination & Search State
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const itemsPerPage = 10;


    // Upload state
    const [uploadModal, setUploadModal] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);
    const [deletingPackageId, setDeletingPackageId] = useState(null);

    const initialFormState = {
        packageId: "",
        packageTitle: "",
        destination: "",
        country: "",
        city: "",
        duration: "3N/4D",
        category: "Holiday",
        pricePerPerson: 0,
        originalPrice: 0,
        discount: 0,
        currency: "INR",
        startLocation: "",
        transportType: "Flight",
        hotelType: "3 Star",
        mealsIncluded: "Breakfast",
        highlights: "", // handled as string locally
        itinerary: [{ day: 1, title: "", description: "", activities: "" }],
        included: "", // handled as string locally
        excluded: "", // handled as string locally
        thumbnailImage: "",
        galleryImages: "", // handled as string locally
        date: today,
        availableFrom: "",
        availableTo: "",
        seatsAvailable: 50,
        status: "Active"
    };

    const [formData, setFormData] = useState(initialFormState);

    const fetchPackages = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/all`, getAdminAuthConfig());
            setPackages(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }, []);

    const handleConfirmUpload = useCallback(async () => {
        if (!previewData || !previewData.valid) return;
        setUploadLoading(true);
        setConfirmStep(false);

        try {
            const response = await axios.post(`${API_URL}/admin/upload`, {
                packagesToUpload: previewData.valid
            }, getAdminAuthConfig());
            setUploadResult(response.data);
            fetchPackages();
            setPreviewData(null);
        } catch (err) {
            console.error(err);
            setUploadResult({
                message: err.response?.data?.message || "Upload failed",
                errors: [err.response?.data?.error || "Unknown error"]
            });
        } finally {
            setUploadLoading(false);
        }
    }, [previewData, fetchPackages]);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    useEffect(() => {
        if (confirmStep && previewData) {
            handleConfirmUpload();
        }
    }, [confirmStep, previewData, handleConfirmUpload]);

    const handleInputChange = (e, index = null, subfield = null) => {
        const { name, value, type, checked } = e.target;
        let val = type === "checkbox" ? checked : value;

        if (index !== null) {
            const updatedArray = [...formData.itinerary];
            if (subfield) {
                updatedArray[index][subfield] = val;
            } else {
                updatedArray[index][name] = val;
            }
            setFormData({ ...formData, itinerary: updatedArray });
        } else {
            setFormData({ ...formData, [name]: val });
        }
    };

    const addArrayItem = (item) => {
        setFormData({ ...formData, itinerary: [...formData.itinerary, item] });
    };

    const removeArrayItem = (index) => {
        const updatedArray = formData.itinerary.filter((_, i) => i !== index);
        setFormData({ ...formData, itinerary: updatedArray });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Process string fields back to arrays
        const processedData = {
            ...formData,
            highlights: formData.highlights.split(",").map(t => t.trim()).filter(t => t),
            included: formData.included.split(",").map(i => i.trim()).filter(i => i),
            excluded: formData.excluded.split(",").map(e => e.trim()).filter(e => e),
            galleryImages: formData.galleryImages.split(",").map(g => g.trim()).filter(g => g),
            itinerary: formData.itinerary.map(item => ({
                ...item,
                activities: typeof item.activities === 'string' ? item.activities.split(",").map(a => a.trim()).filter(a => a) : item.activities
            }))
        };

        try {
            if (editingPackage) {
                await axios.put(`${API_URL}/update/${editingPackage._id}`, processedData, getAdminAuthConfig());
            } else {
                await axios.post(`${API_URL}/add`, processedData, getAdminAuthConfig());
            }
            setShowModal(false);
            fetchPackages();
        } catch (err) {
            console.error(err);
            notify({
                type: 'error',
                title: 'Save failed',
                message: "Error saving package: " + (err.response?.data?.message || err.message)
            });
        }
    };

    const handleEdit = (pkg) => {
        const formattedData = {
            ...pkg,
            highlights: pkg.highlights ? pkg.highlights.join(", ") : "",
            included: pkg.included ? pkg.included.join(", ") : "",
            excluded: pkg.excluded ? pkg.excluded.join(", ") : "",
            galleryImages: pkg.galleryImages ? pkg.galleryImages.join(", ") : "",
            date: pkg.date || today,
            availableFrom: pkg.availableFrom ? pkg.availableFrom.split('T')[0] : "",
            availableTo: pkg.availableTo ? pkg.availableTo.split('T')[0] : "",
            itinerary: pkg.itinerary ? pkg.itinerary.map(item => ({ ...item, activities: item.activities ? item.activities.join(", ") : "" })) : [{ day: 1, title: "", description: "", activities: "" }]
        };
        setEditingPackage(pkg);
        setFormData(formattedData);
        setShowModal(true);
    };

    const toggleStatus = async (id) => {
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${API_URL}/toggle-status/${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            fetchPackages();
        } catch (err) {
            console.error(err);
            notify({
                type: 'error',
                title: 'Status update failed',
                message: err.response?.data?.message || "Unable to update package status"
            });
        }
    };

    const handlePackageStatusChange = async (pkg, nextStatus) => {
        if (pkg.status === nextStatus) return;
        await toggleStatus(pkg._id);
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: 'Delete package',
            message: 'This holiday package will be permanently removed from the catalog.',
            confirmLabel: 'Delete package',
            tone: 'danger'
        });
        if (!confirmed) return;
        try {
            setDeletingPackageId(id);
            await axios.delete(`${API_URL}/delete/${id}`, getAdminAuthConfig());
            setPackages((currentPackages) => currentPackages.filter((pkg) => pkg._id !== id));
            notify({
                type: 'success',
                title: 'Successfully deleted',
                message: 'Package deleted successfully.'
            });
            fetchPackages();
        } catch (err) {
            notify({
                type: 'error',
                title: 'Delete failed',
                message: err.response?.data?.message || 'Unable to delete package.'
            });
        } finally {
            setDeletingPackageId(null);
        }
    };

    /* -------------------- UPLOAD HANDLERS -------------------- */
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
        setPreviewData(null);
        setConfirmStep(false);

        try {
            const fd = new FormData();
            fd.append('file', file);
            const authConfig = getAdminAuthConfig();
            const response = await axios.post(`${API_URL}/admin/preview`, fd, {
                ...authConfig,
                headers: {
                    ...authConfig.headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setPreviewData(response.data);
            e.target.value = '';
        } catch (err) {
            console.error(err);
            setUploadResult({
                message: err.response?.data?.message || "Preview failed",
                errors: [err.response?.data?.error || "Unknown error"]
            });
        } finally {
            setUploadLoading(false);
        }
    };

    const closeUploadModal = () => {
        setUploadModal(false);
        setUploadResult(null);
        setPreviewData(null);
        setConfirmStep(false);
        setUploadLoading(false);
    };

    /* -------------------- PAGINATION & FILTER -------------------- */
    const normalizedSearchTerm = getNormalizedSearchTerm(searchTerm);
    const filteredPackages = packages.filter(pkg => 
        includesNormalizedSearch(pkg.packageTitle, normalizedSearchTerm) ||
        includesNormalizedSearch(pkg.packageId, normalizedSearchTerm) ||
        includesNormalizedSearch(pkg.destination, normalizedSearchTerm)
    );

    const indexOfLastPackage = currentPage * itemsPerPage;
    const indexOfFirstPackage = indexOfLastPackage - itemsPerPage;
    const currentPackages = filteredPackages.slice(indexOfFirstPackage, indexOfLastPackage);
    const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);

    useClampedAdminPage(totalPages, setCurrentPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleExport = () => {
        if (!packages || packages.length === 0) return;
        exportRowsAsCsv(packages.map((p) => ({
            'Package ID': p.packageId,
            'Title': p.packageTitle,
            'Date': p.date || '',
            'Destination': p.destination,
            'Duration': p.duration,
            'Category': p.category,
            'Price': p.pricePerPerson,
            'Discount': p.discount,
            'Rating': p.rating,
            'Status': p.status
        })), `packages_export_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="management-container admin-holiday-container">
            <div className="management-header holiday-header">
                <div className="header-main">
                    <h1>Holiday Package Explorer</h1>
                    <p>Curate premium global holiday experiences for travelers.</p>
                </div>
                <div className="management-actions">
                    <div className="search-box">
                        <span className="search-icon">Search</span>
                        <input 
                            type="text" 
                            placeholder="Search packages..." 
                            value={searchTerm}
                            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                        />
                    </div>
                    <div className="header-buttons">
                        <button className="export-btn" onClick={handleExport}>Export CSV</button>
                        <button className="upload-btn" onClick={() => setUploadModal(true)}>Upload Packages</button>
                        <button className="add-btn" onClick={() => { setShowModal(true); setEditingPackage(null); setFormData(initialFormState); }}>
                            + Create New Package
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="page-loading-state">
                    <div className="spinner"></div>
                    <span>Loading packages...</span>
                </div>
            ) : (
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Sr No.</th>
                                <th>Code</th>
                                <th>Title</th>
                                <th>Date</th>
                                <th>Price</th>
                                <th>Bookings</th>
                                <th>Rating</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentPackages.map((pkg, index) => (
                                <tr key={pkg._id}>
                                    <td>{indexOfFirstPackage + index + 1}</td>
                                    <td>{pkg.packageId}</td>
                                    <td>{pkg.packageTitle}</td>
                                    <td>{pkg.date || 'N/A'}</td>
                                    <td>{pkg.currency} {pkg.pricePerPerson}</td>
                                    <td>{pkg.bookings?.length || 0}</td>
                                    <td>⭐ {pkg.rating} ({pkg.totalReviews})</td>
                                    <td>
                                        <div className="status-select-wrapper">
                                            <select
                                                className={`status-select-inline ${pkg.status.toLowerCase()}`}
                                                value={pkg.status}
                                                onChange={(e) => handlePackageStatusChange(pkg, e.target.value)}
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-btns">
                                            <button className="edit-btn" onClick={() => handleEdit(pkg)}>Edit</button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDelete(pkg._id)}
                                                disabled={deletingPackageId === pkg._id}
                                            >
                                                {deletingPackageId === pkg._id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div className="pagination-container">
                            <div className="pagination-info">
                                Showing {indexOfFirstPackage + 1} to {Math.min(indexOfLastPackage, filteredPackages.length)} of {filteredPackages.length} entries
                            </div>
                            <div className="pagination-controls">
                                <button
                                    className="page-btn"
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
                                    className="page-btn"
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay package-modal">
                    <div className="modal-content package-modal-content" style={{ maxWidth: '1000px' }}>
                        <div className="modal-header">
                            <h3>{editingPackage ? "Edit Package Data" : "Initialize New Package"}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="admin-form-sections">

                                {/* Section 1: Basic & Destination */}
                                <div className="form-section">
                                    <h4><span role="img" aria-label="info">ℹ️</span> Basic & Destination</h4>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Package ID / Code*</label>
                                            <input type="text" name="packageId" value={formData.packageId} onChange={handleInputChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Title*</label>
                                            <input type="text" name="packageTitle" value={formData.packageTitle} onChange={handleInputChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Category*</label>
                                            <select name="category" value={formData.category} onChange={handleInputChange}>
                                                <option value="Holiday">Holiday</option>
                                                <option value="Honeymoon">Honeymoon</option>
                                                <option value="Adventure">Adventure</option>
                                                <option value="Budget">Budget</option>
                                                <option value="Luxury">Luxury</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Destination Area*</label>
                                            <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Country*</label>
                                            <input type="text" name="country" value={formData.country} onChange={handleInputChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>City*</label>
                                            <input type="text" name="city" value={formData.city} onChange={handleInputChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Date*</label>
                                            <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
                                        </div>
                                    </div>
                                    <div className="form-group full-width" style={{ marginTop: '10px' }}>
                                        <label>Highlights (Comma separated)</label>
                                        <textarea name="highlights" value={formData.highlights} onChange={handleInputChange} rows="2" />
                                    </div>
                                </div>

                                {/* Section 2: Pricing & Details */}
                                <div className="form-section">
                                    <h4><span role="img" aria-label="price">💰</span> Pricing & Details</h4>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Price Per Person*</label>
                                            <input type="number" name="pricePerPerson" value={formData.pricePerPerson} onChange={handleInputChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Original Price</label>
                                            <input type="number" name="originalPrice" value={formData.originalPrice} onChange={handleInputChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Discount (%)</label>
                                            <input type="number" name="discount" value={formData.discount} onChange={handleInputChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Currency</label>
                                            <input type="text" name="currency" value={formData.currency} onChange={handleInputChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Duration (e.g. 5N/6D)*</label>
                                            <input type="text" name="duration" value={formData.duration} onChange={handleInputChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Start Location</label>
                                            <input type="text" name="startLocation" value={formData.startLocation} onChange={handleInputChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Transport Type</label>
                                            <input type="text" name="transportType" value={formData.transportType} onChange={handleInputChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Hotel Type</label>
                                            <input type="text" name="hotelType" value={formData.hotelType} onChange={handleInputChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Meals Included</label>
                                            <input type="text" name="mealsIncluded" value={formData.mealsIncluded} onChange={handleInputChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Seats Available</label>
                                            <input type="number" name="seatsAvailable" value={formData.seatsAvailable} onChange={handleInputChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Available From</label>
                                            <input type="date" name="availableFrom" value={formData.availableFrom} onChange={handleInputChange} min={today} />
                                        </div>
                                        <div className="form-group">
                                            <label>Available To</label>
                                            <input type="date" name="availableTo" value={formData.availableTo} onChange={handleInputChange} min={formData.availableFrom || today} />
                                        </div>
                                        <div className="form-group">
                                            <label>Status</label>
                                            <select name="status" value={formData.status} onChange={handleInputChange}>
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Arrays & Itinerary */}
                                <div className="form-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h4 style={{ margin: 0 }}><span role="img" aria-label="map">🗺️</span> Day-wise Itinerary</h4>
                                        <button type="button" className="add-btn" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => addArrayItem({ day: formData.itinerary.length + 1, title: "", description: "", activities: "" })}>
                                            + Add Day
                                        </button>
                                    </div>
                                    {formData.itinerary.map((item, index) => (
                                        <div key={index} className="itinerary-edit-row" style={{ border: '1px solid var(--border-subtle)', padding: '15px', borderRadius: '8px', marginBottom: '10px', background: 'rgba(255, 255, 255, 0.02)' }}>
                                            <div className="form-grid">
                                                <div className="form-group">
                                                    <label>Day {index + 1} Title</label>
                                                    <input type="text" value={item.title} onChange={(e) => handleInputChange(e, index, "title")} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Day {index + 1} Activities (CS)</label>
                                                    <input type="text" value={item.activities} onChange={(e) => handleInputChange(e, index, "activities")} />
                                                </div>
                                            </div>
                                            <textarea placeholder="Description of day's events..." value={item.description} onChange={(e) => handleInputChange(e, index, "description")} style={{ marginTop: '10px' }} />
                                            {formData.itinerary.length > 1 && (
                                                <button type="button" onClick={() => removeArrayItem(index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', marginTop: '5px' }}>Remove Day</button>
                                            )}
                                        </div>
                                    ))}

                                    <div className="form-grid" style={{ marginTop: '20px' }}>
                                        <div className="form-group full-width">
                                            <label>Included (Comma separated)</label>
                                            <textarea name="included" value={formData.included} onChange={handleInputChange} rows="2" />
                                        </div>
                                        <div className="form-group full-width">
                                            <label>Excluded (Comma separated)</label>
                                            <textarea name="excluded" value={formData.excluded} onChange={handleInputChange} rows="2" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Media */}
                                <div className="form-section">
                                    <h4><span role="img" aria-label="shuttle">🖼️</span> Media</h4>
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label>Thumbnail Image URL*</label>
                                            <input type="text" name="thumbnailImage" value={formData.thumbnailImage} onChange={handleInputChange} required />
                                        </div>
                                        <div className="form-group full-width">
                                            <label>Gallery Images (Comma separated URLs)</label>
                                            <textarea name="galleryImages" value={formData.galleryImages} onChange={handleInputChange} rows="2" />
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <div className="form-actions" style={{ position: 'sticky', bottom: 0, background: 'var(--bg-card)', padding: '20px 0', borderTop: '1px solid var(--border-subtle)', marginTop: '20px', zIndex: 10 }}>
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Discard Changes</button>
                                <button type="submit" className="save-btn" style={{ padding: '10px 40px' }}>{editingPackage ? "Save & Update DB" : "Create Package"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {uploadModal && (
                <div className="modal-overlay">
                    <div className="modal-content upload-modal">
                        <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h3 style={{margin: 0}}>Upload Packages</h3>
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
                                        id="file-upload"
                                        accept=".csv,.json"
                                        onChange={handleFileUpload}
                                        disabled={uploadLoading}
                                        style={{ display: 'none' }}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className={`file-upload-label ${uploadLoading ? 'disabled' : ''}`}
                                    >
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

                                {uploadLoading && (
                                    <div className="upload-progress">
                                        <div className="spinner"></div>
                                        <p>Analyzing file, please wait...</p>
                                    </div>
                                )}

                                {!uploadLoading && (
                                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                                        <button onClick={closeUploadModal} className="cancel-btn">Close</button>
                                    </div>
                                )}
                            </div>
                        ) : previewData && !confirmStep ? (
                            <div className="preview-results">
                                <div className="preview-header">
                                    <h4>📊 File Analysis Results</h4>
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
                                </div>

                                {previewData.duplicateRecords > 0 && (
                                        <div className="invalid-records-section">
                                            <div className="invalid-records-title">Duplicate Records (will be skipped)</div>
                                            {previewData.duplicates.slice(0, 5).map((dup, index) => (
                                                <div key={index} className="invalid-record-item">
                                                    Row {dup.index}: {dup.packageId} - {dup.reason}
                                                </div>
                                            ))}
                                            {previewData.duplicates.length > 5 && (
                                                <div className="invalid-record-item">
                                                    ... and {previewData.duplicates.length - 5} more duplicates
                                                </div>
                                            )}
                                        </div>
                                    )}

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
                                        <>
                                            <div className="analysis-message">
                                                No valid records to upload. Please check your file and try again.
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <button className="analysis-close-btn" onClick={closeUploadModal}>
                                                    CLOSE
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="confirmation-actions">
                                            <button className="cancel-btn" onClick={closeUploadModal}>Cancel</button>
                                            <button className="confirm-upload-btn" onClick={() => setConfirmStep(true)}>
                                                Confirm Upload ({previewData.validRecords} packages)
                                            </button>
                                        </div>
                                    )}
                                </div>
                        ) : confirmStep && !uploadResult ? (
                            <div className="confirm-step">
                                <div className="confirm-header">
                                    <h4>🚀 Uploading Packages...</h4>
                                </div>
                                <div className="upload-progress">
                                    <div className="spinner"></div>
                                    <p>Uploading {previewData.validRecords} packages to database...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="upload-results">
                                <div className={`result-header ${uploadResult?.errors?.length > 0 ? 'warning' : 'success'}`}>
                                    <h4>{uploadResult?.message || "Upload Complete"}</h4>
                                </div>

                                <div className="result-stats">
                                    <p><strong>Total Processed:</strong> {uploadResult?.totalRecords || 0}</p>
                                    <p><strong>Successfully Uploaded:</strong> {uploadResult?.successful?.length || 0}</p>
                                    <p><strong>Failed:</strong> {uploadResult?.failed?.length || 0}</p>
                                </div>

                                {uploadResult?.errors && uploadResult.errors.length > 0 && (
                                    <div className="error-section">
                                        <h5>Errors:</h5>
                                        <ul className="error-list">
                                            {uploadResult.errors.slice(0, 10).map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                            {uploadResult.errors.length > 10 && (
                                                <li>... and {uploadResult.errors.length - 10} more errors</li>
                                            )}
                                        </ul>
                                    </div>
                                )}

                                <div className="result-actions" style={{ marginTop: '20px' }}>
                                    <button className="close-btn" onClick={closeUploadModal}>Done</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPackages;

