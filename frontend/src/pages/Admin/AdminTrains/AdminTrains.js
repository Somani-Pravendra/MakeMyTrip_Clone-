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
import "./AdminTrains.css";

const API_URL = `${API_BASE_URL}/admin/trains`;

const initialFormState = {
    trainNumber: "",
    trainName: "",
    date: new Date().toISOString().split('T')[0],
    from: "",
    to: "",
    departureTime: "",
    arrivalTime: "",
    duration: "",
    days: "Daily",
    trainType: "Express",
    availableClasses: [
        { type: "1A", fare: 4500, status: "Available - 0023", color: "green", totalSeats: 100, availableSeats: 50 },
        { type: "2A", fare: 2800, status: "Available - 0045", color: "green", totalSeats: 120, availableSeats: 80 },
        { type: "3A", fare: 2100, status: "Available - 0056", color: "green", totalSeats: 150, availableSeats: 100 }
    ],
    isActive: true,
    quota: [
        { type: "General", seats: 100 },
        { type: "Tatkal", seats: 20 }
    ]
};

const AdminTrains = () => {
    const { confirm, notify } = useAdminUX();
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTrain, setEditingTrain] = useState(null);
    const [uploadModal, setUploadModal] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);
    const [deletingTrainId, setDeletingTrainId] = useState(null);
    const [formData, setFormData] = useState(initialFormState);

    // Pagination & Search State
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const itemsPerPage = 10;
    const today = new Date().toISOString().split('T')[0];

    const fetchTrains = useCallback(async () => {
        try {
            const res = await axios.get(API_URL, {
                ...getAdminAuthConfig(),
                withCredentials: true
            });
            setTrains(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const calculateDuration = (departure, arrival) => {
        // Simple duration calculation - can be improved
        const [depHour, depMin] = departure.split(':').map(Number);
        const [arrHour, arrMin] = arrival.split(':').map(Number);
        
        let totalMinutes = (arrHour * 60 + arrMin) - (depHour * 60 + depMin);
        if (totalMinutes < 0) totalMinutes += 24 * 60; // Next day
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value
        });

        // Auto-calculate duration when departure or arrival time changes
        if (name === "departureTime" || name === "arrivalTime") {
            const { departureTime, arrivalTime } = { ...formData, [name]: value };
            if (departureTime && arrivalTime) {
                setFormData(prev => ({
                    ...prev,
                    duration: calculateDuration(departureTime, arrivalTime)
                }));
            }
        }
    };

    const handleClassChange = (index, field, value) => {
        const updatedClasses = [...formData.availableClasses];
        updatedClasses[index][field] = field === "fare" || field === "totalSeats" || field === "availableSeats" 
            ? Number(value) 
            : value;
        setFormData({ ...formData, availableClasses: updatedClasses });
    };

    const addClass = () => {
        setFormData({
            ...formData,
            availableClasses: [
                ...formData.availableClasses,
                { type: "SL", fare: 800, status: "Available - 0100", color: "green", totalSeats: 200, availableSeats: 150 }
            ]
        });
    };

    const removeClass = (index) => {
        if (formData.availableClasses.length > 1) {
            setFormData({
                ...formData,
                availableClasses: formData.availableClasses.filter((_, i) => i !== index)
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTrain) {
                await axios.put(`${API_URL}/${editingTrain._id}`, formData, {
                    ...getAdminAuthConfig(),
                    withCredentials: true
                });
            } else {
                await axios.post(API_URL, formData, {
                    ...getAdminAuthConfig(),
                    withCredentials: true
                });
            }

            setShowModal(false);
            setEditingTrain(null);
            setFormData(initialFormState);
            fetchTrains();
        } catch (err) {
            console.error(err);
            notify({
                type: "error",
                title: "Save failed",
                message: err.response?.data?.message || "Error saving train."
            });
        }
    };

    const handleEdit = (train) => {
        setEditingTrain(train);
        setFormData({
            ...initialFormState,
            ...train,
            date: train.date ? String(train.date).split('T')[0] : today
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: "Delete train",
            message: "This train will be permanently removed from the rail network list.",
            confirmLabel: "Delete train",
            tone: "danger"
        });
        if (!confirmed) return;
        try {
            setDeletingTrainId(id);
            await axios.delete(`${API_URL}/${id}`, {
                ...getAdminAuthConfig(),
                withCredentials: true
            });
            setTrains((currentTrains) => currentTrains.filter((train) => train._id !== id));
            notify({
                type: "success",
                title: "Successfully deleted",
                message: "Train deleted successfully."
            });
            fetchTrains();
        } catch (err) {
            console.error(err);
            notify({
                type: "error",
                title: "Delete failed",
                message: err.response?.data?.message || err.response?.data?.error || "Unable to delete train right now."
            });
        } finally {
            setDeletingTrainId(null);
        }
    };

    const handleConfirmUpload = useCallback(async () => {
        if (!previewData || !previewData.valid) return;

        setUploadLoading(true);
        setConfirmStep(false);

        try {
            const response = await axios.post(`${API_URL}/upload`, {
                trainsToUpload: previewData.valid
            }, {
                ...getAdminAuthConfig(),
                withCredentials: true
            });

            setUploadResult(response.data);
            fetchTrains();
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
    }, [previewData, fetchTrains]);

    useEffect(() => {
        fetchTrains();
    }, [fetchTrains]);

    useEffect(() => {
        if (confirmStep && previewData) {
            handleConfirmUpload();
        }
    }, [confirmStep, previewData, handleConfirmUpload]);

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
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(`${API_URL}/preview`, formData, {
                headers: {
                    ...getAdminAuthConfig().headers,
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
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
    const filteredTrains = trains.filter(t => 
        includesNormalizedSearch(t.trainName, normalizedSearchTerm) ||
        includesNormalizedSearch(t.trainNumber, normalizedSearchTerm) ||
        includesNormalizedSearch(t.from, normalizedSearchTerm) ||
        includesNormalizedSearch(t.to, normalizedSearchTerm)
    );

    const indexOfLastTrain = currentPage * itemsPerPage;
    const indexOfFirstTrain = indexOfLastTrain - itemsPerPage;
    const currentTrains = filteredTrains.slice(indexOfFirstTrain, indexOfLastTrain);
    const totalPages = Math.ceil(filteredTrains.length / itemsPerPage);

    useClampedAdminPage(totalPages, setCurrentPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleExport = () => {
        if (!trains || trains.length === 0) return;
        exportRowsAsCsv(trains.map((t) => ({
            'Train Name': t.trainName,
            'Train Number': t.trainNumber,
            'From': t.from,
            'To': t.to,
            'Date': t.date ? String(t.date).split('T')[0] : 'N/A',
            'Departure': t.departureTime,
            'Arrival': t.arrivalTime,
            'Duration': t.duration,
            'Classes': Array.isArray(t.availableClasses) ? t.availableClasses.map(c => c.type).join(' | ') : ''
        })), `trains_export_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="management-container admin-trains-container">
            <div className="management-header trains-header">
                <div className="header-main">
                    <h1>Rail Network Management</h1>
                    <p>Manage express routes, seat inventory, and dynamic rail schedules.</p>
                </div>
                <div className="management-actions">
                    <div className="search-box">
                        <span className="search-icon">Search</span>
                        <input 
                            type="text" 
                            placeholder="Search trains..." 
                            value={searchTerm}
                            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                        />
                    </div>
                    <div className="header-buttons">
                        <button
                            className="export-btn"
                            onClick={handleExport}
                        >Export CSV</button>
                        <button
                            className="upload-btn"
                            onClick={() => setUploadModal(true)}
                        >Upload Trains</button>
                        <button
                            className="add-btn"
                            onClick={() => {
                                setShowModal(true);
                                setEditingTrain(null);
                                setFormData(initialFormState);
                            }}
                        >
                            + Add New Train
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="page-loading-state">
                    <div className="spinner"></div>
                    <span>Loading trains...</span>
                </div>
            ) : (
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Sr No.</th>
                                <th>Train Name</th>
                                <th>Train Number</th>
                                <th>Route</th>
                                <th>Date</th>
                                <th>Departure</th>
                                <th>Arrival</th>
                                <th>Duration</th>
                                <th>Classes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentTrains.map((train, index) => (
                                <tr key={train._id}>
                                    <td>{indexOfFirstTrain + index + 1}</td>
                                    <td>{train.trainName}</td>
                                    <td>{train.trainNumber}</td>
                                    <td>{train.from} → {train.to}</td>
                                    <td>{train.date ? String(train.date).split('T')[0] : 'N/A'}</td>
                                    <td>{train.departureTime}</td>
                                    <td>{train.arrivalTime}</td>
                                    <td>{train.duration}</td>
                                    <td>{train.availableClasses.map(cls => cls.type).join(", ")}</td>
                                    <td>
                                        <div className="action-btns">
                                            <button className="edit-btn" onClick={() => handleEdit(train)}>
                                                Edit
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDelete(train._id)}
                                                disabled={deletingTrainId === train._id}
                                            >
                                                {deletingTrainId === train._id ? "Deleting..." : "Delete"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Pagination UI */}
                    {totalPages > 1 && (
                        <div className="pagination-container">
                            <div className="pagination-info">
                                Showing {indexOfFirstTrain + 1} to {Math.min(indexOfLastTrain, filteredTrains.length)} of {filteredTrains.length} entries
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
                <div className="modal-overlay train-modal">
                    <div className="modal-content-glass">
                        <div className="modal-header">
                            <h3>{editingTrain ? "Edit Train" : "Add New Train"}</h3>
                            <button type="button" className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                {/* Basic Train Information */}
                                <div className="form-group">
                                    <label>Train Name*</label>
                                    <input
                                        type="text"
                                        name="trainName"
                                        value={formData.trainName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Train Number*</label>
                                    <input
                                        type="text"
                                        name="trainNumber"
                                        value={formData.trainNumber}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Train Type*</label>
                                    <select
                                        name="trainType"
                                        value={formData.trainType}
                                        onChange={handleInputChange}
                                    >
                                        <option value="Express">Express</option>
                                        <option value="Superfast">Superfast</option>
                                        <option value="Mail">Mail</option>
                                        <option value="Passenger">Passenger</option>
                                    </select>
                                </div>

                                {/* Route Information */}
                                <div className="form-group">
                                    <label>From Station*</label>
                                    <input
                                        type="text"
                                        name="from"
                                        value={formData.from}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>To Station*</label>
                                    <input
                                        type="text"
                                        name="to"
                                        value={formData.to}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Travel Date*</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        min={today}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Running Days*</label>
                                    <input
                                        type="text"
                                        name="days"
                                        value={formData.days}
                                        onChange={handleInputChange}
                                        placeholder="e.g., M, T, W, T, F, S, S or Daily"
                                        required
                                    />
                                </div>

                                {/* Timing Information */}
                                <div className="form-group">
                                    <label>Departure Time*</label>
                                    <input
                                        type="time"
                                        name="departureTime"
                                        value={formData.departureTime}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Arrival Time*</label>
                                    <input
                                        type="time"
                                        name="arrivalTime"
                                        value={formData.arrivalTime}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Duration (Auto-calculated)</label>
                                    <input
                                        type="text"
                                        name="duration"
                                        value={formData.duration}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 15h 40m"
                                        readOnly
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                        />
                                        Active Train
                                    </label>
                                </div>
                            </div>

                            {/* Train Classes */}
                            <div className="fares-section">
                                <h4>Train Classes</h4>
                                {formData.availableClasses.map((cls, index) => (
                                    <div key={index} className="fare-type">
                                        <div className="form-group">
                                            <label>Class Type*</label>
                                            <select
                                                value={cls.type}
                                                onChange={(e) => handleClassChange(index, "type", e.target.value)}
                                                required
                                            >
                                                <option value="1A">First AC (1A)</option>
                                                <option value="2A">Second AC (2A)</option>
                                                <option value="3A">Third AC (3A)</option>
                                                <option value="SL">Sleeper (SL)</option>
                                                <option value="CC">AC Chair Car (CC)</option>
                                                <option value="EC">Executive Chair Car (EC)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Fare*</label>
                                            <input
                                                type="number"
                                                value={cls.fare}
                                                onChange={(e) => handleClassChange(index, "fare", e.target.value)}
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Status</label>
                                            <input
                                                type="text"
                                                value={cls.status}
                                                onChange={(e) => handleClassChange(index, "status", e.target.value)}
                                                placeholder="e.g., Available - 0023"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Status Color</label>
                                            <select
                                                value={cls.color}
                                                onChange={(e) => handleClassChange(index, "color", e.target.value)}
                                            >
                                                <option value="green">Green (Available)</option>
                                                <option value="red">Red (Waiting List)</option>
                                                <option value="orange">Orange (RAC)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Total Seats</label>
                                            <input
                                                type="number"
                                                value={cls.totalSeats}
                                                onChange={(e) => handleClassChange(index, "totalSeats", e.target.value)}
                                                min="1"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Available Seats</label>
                                            <input
                                                type="number"
                                                value={cls.availableSeats}
                                                onChange={(e) => handleClassChange(index, "availableSeats", e.target.value)}
                                                min="0"
                                            />
                                        </div>
                                        {formData.availableClasses.length > 1 && (
                                            <button
                                                type="button"
                                                className="remove-btn"
                                                onClick={() => removeClass(index)}
                                            >
                                                Remove Class
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="add-btn"
                                    onClick={addClass}
                                    style={{ marginTop: '10px' }}
                                >
                                    + Add Another Class
                                </button>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    {editingTrain ? "Update Train" : "Add Train"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {uploadModal && (
                <div className="modal-overlay">
                    <div className="modal-content-glass upload-modal">
                        <div className="modal-header">
                            <h3>Upload Trains</h3>
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
                                                    Row {dup.index}: Train {dup.trainNumber} - {dup.reason}
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
                                        <div className="form-actions">
                                            <button className="cancel-btn" onClick={closeUploadModal}>
                                                Cancel
                                            </button>
                                            <button 
                                                className="submit-btn" 
                                                onClick={() => setConfirmStep(true)}
                                            >
                                                Confirm Upload ({previewData.validRecords} trains)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : confirmStep ? (
                            <div className="confirm-step">
                                <div className="confirm-header">
                                    <h4>🚀 Uploading Trains...</h4>
                                </div>
                                
                                <div className="upload-progress">
                                    <div className="spinner"></div>
                                    <p>Uploading {previewData.validRecords} trains to database...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="upload-results">
                                <div className={`result-header ${uploadResult.errors?.length > 0 ? 'warning' : 'success'}`}>
                                    <h4>{uploadResult.message}</h4>
                                </div>
                                
                                <div className="result-stats">
                                    <p><strong>Total Records:</strong> {uploadResult.totalRecords}</p>
                                    <p><strong>Successfully Uploaded:</strong> {uploadResult.successful?.length || 0}</p>
                                    <p><strong>Failed:</strong> {uploadResult.failed?.length || 0}</p>
                                </div>
                                
                                {uploadResult.errors && uploadResult.errors.length > 0 && (
                                    <div className="error-section">
                                        <h5>Errors:</h5>
                                        <ul className="error-list">
                                            {uploadResult.errors.slice(0, 10).map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                            {uploadResult.errors.length > 10 && (
                                                <li>... and {uploadResult.errors.length - 10} more errors</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                                
                                <div className="form-actions" style={{ justifyContent: 'center' }}>
                                    <button className="submit-btn" onClick={closeUploadModal}>
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTrains;

