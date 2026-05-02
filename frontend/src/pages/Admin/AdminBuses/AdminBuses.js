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
import "./AdminBuses.css";

const API_URL = `${API_BASE_URL}/admin/buses`; // BACK TO PROPER ADMIN ENDPOINT

const AdminBuses = () => {
  const { confirm, notify } = useAdminUX();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [deletingBusId, setDeletingBusId] = useState(null);

  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  const fetchBuses = useCallback(async () => {
    try {
      const res = await axios.get(API_URL, {
        ...getAdminAuthConfig()
      });
      setBuses(res.data.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      // If auth fails, logout user
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setBuses([]);
      }
      setLoading(false);
    }
  }, []);

  const handleConfirmUpload = useCallback(async () => {
    if (!previewData || !previewData.valid) return;

    setUploadLoading(true);
    setConfirmStep(false);

    try {
      const response = await axios.post(`${API_URL}/upload`, {
        busesToUpload: previewData.valid
      }, getAdminAuthConfig());

      setUploadResult(response.data);
      fetchBuses();
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
  }, [previewData, fetchBuses]);

  // Fetch buses on mount
  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  useEffect(() => {
    if (confirmStep && previewData) {
      handleConfirmUpload();
    }
  }, [confirmStep, previewData, handleConfirmUpload]);

  const initialFormState = {
    operatorName: "",
    busType: "AC Sleeper",
    seatLayout: "2+1",
    from: "",
    to: "",
    departureTime: "",
    arrivalTime: "",
    duration: "",
    price: "",
    totalSeats: 40,
    availableSeats: 40,
    rating: 4.0,
    amenities: ["WiFi", "Water", "Charging"],
    status: "Active",
    date: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before sending
    const requiredFields = ['operatorName', 'busType', 'seatLayout', 'from', 'to', 'departureTime', 'arrivalTime', 'duration', 'price', 'totalSeats', 'availableSeats', 'date'];
    const missingFields = requiredFields.filter(field => !formData[field] || formData[field] === '');
    
    if (missingFields.length > 0) {
      notify({
        type: 'error',
        title: 'Missing fields',
        message: `Please fill in all required fields: ${missingFields.join(', ')}`
      });
      return;
    }
    
    // Validate numeric fields
    if (Number(formData.price) <= 0) {
      notify({
        type: 'error',
        title: 'Invalid price',
        message: 'Price must be greater than 0.'
      });
      return;
    }
    
    if (Number(formData.totalSeats) <= 0 || Number(formData.totalSeats) > 60) {
      notify({
        type: 'error',
        title: 'Invalid seat count',
        message: 'Total seats must be between 1 and 60.'
      });
      return;
    }
    
    if (Number(formData.availableSeats) < 0 || Number(formData.availableSeats) > Number(formData.totalSeats)) {
      notify({
        type: 'error',
        title: 'Invalid availability',
        message: 'Available seats must be between 0 and total seats.'
      });
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        notify({
          type: 'error',
          title: 'Authentication required',
          message: 'Please login to perform this action.'
        });
        return;
      }
      
      const submitData = {
        ...formData,
        price: Number(formData.price),
        totalSeats: Number(formData.totalSeats),
        availableSeats: Number(formData.availableSeats),
        rating: Number(formData.rating)
      };
      
      if (editingBus) {
        await axios.put(`${API_URL}/${editingBus._id}`, submitData, {
          ...getAdminAuthConfig()
        });
        notify({
          type: 'success',
          title: 'Bus updated',
          message: 'Bus updated successfully.'
        });
      } else {
        await axios.post(API_URL, submitData, {
          ...getAdminAuthConfig()
        });
        notify({
          type: 'success',
          title: 'Bus created',
          message: 'Bus created successfully.'
        });
      }
      
      resetForm();
      fetchBuses();
    } catch (err) {
      console.error("Error saving bus:", err);
      
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(e => `${e.field}: ${e.message}`).join('\n');
        notify({
          type: 'error',
          title: 'Validation error',
          message: errorMessages
        });
      } else if (err.response?.data?.missingFields) {
        notify({
          type: 'error',
          title: 'Missing required fields',
          message: err.response.data.missingFields.join(', ')
        });
      } else {
        notify({
          type: 'error',
          title: 'Save failed',
          message: err.response?.data?.message || "Error saving bus. Please check all fields and try again."
        });
      }
    }
  };

  const handleEdit = (bus) => {
    setEditingBus(bus);
    setFormData({
      operatorName: bus.operatorName,
      busType: bus.busType,
      seatLayout: bus.seatLayout,
      from: bus.from,
      to: bus.to,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
      duration: bus.duration,
      price: bus.price,
      totalSeats: bus.totalSeats,
      availableSeats: bus.availableSeats,
      rating: bus.rating,
      amenities: bus.amenities,
      status: bus.status,
      date: bus.date
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete bus',
      message: 'This bus listing will be permanently removed from fleet management.',
      confirmLabel: 'Delete bus',
      tone: 'danger'
    });
    if (!confirmed) return;
    try {
      setDeletingBusId(id);
      await axios.delete(`${API_URL}/${id}`, {
        ...getAdminAuthConfig()
      });
      setBuses((currentBuses) => currentBuses.filter((bus) => bus._id !== id));
      notify({
        type: 'success',
        title: 'Successfully deleted',
        message: 'Bus deleted successfully.'
      });
      fetchBuses();
    } catch (err) {
      console.error(err);
      notify({
        type: 'error',
        title: 'Delete failed',
        message: err.response?.data?.message || err.response?.data?.error || 'Unable to delete bus right now.'
      });
    } finally {
      setDeletingBusId(null);
    }
  };

  const updateBusStatus = async (bus, nextStatus) => {
    try {
      await axios.put(
        `${API_URL}/${bus._id}`,
        { ...bus, status: nextStatus },
        getAdminAuthConfig()
      );
      fetchBuses();
    } catch (err) {
      console.error("Error toggling bus status:", err);
      notify({
        type: 'error',
        title: 'Status update failed',
        message: err.response?.data?.message || 'Unable to update bus status.'
      });
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingBus(null);
    setShowModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAmenityChange = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  // Upload handlers
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

  const normalizedSearchTerm = getNormalizedSearchTerm(searchTerm);
  const filteredBuses = buses.filter(b => 
    includesNormalizedSearch(b.operatorName, normalizedSearchTerm) ||
    includesNormalizedSearch(b.from, normalizedSearchTerm) ||
    includesNormalizedSearch(b.to, normalizedSearchTerm) ||
    includesNormalizedSearch(b.busType, normalizedSearchTerm)
  );

  const indexOfLastBus = currentPage * itemsPerPage;
  const indexOfFirstBus = indexOfLastBus - itemsPerPage;
  const currentBuses = filteredBuses.slice(indexOfFirstBus, indexOfLastBus);
  const totalPages = Math.ceil(filteredBuses.length / itemsPerPage);

  useClampedAdminPage(totalPages, setCurrentPage);

  if (loading) {
    return (
      <div className="page-loading-state">
        <div className="spinner"></div>
        <span>Loading buses...</span>
      </div>
    );
  }

  /* -------------------- PAGINATION & FILTER -------------------- */

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleExport = () => {
    if (!buses || buses.length === 0) return;
    exportRowsAsCsv(buses.map((b) => ({
      'Operator': b.operatorName,
      'Bus Type': b.busType,
      'From': b.from,
      'To': b.to,
      'Departure': b.departureTime,
      'Arrival': b.arrivalTime,
      'Duration': b.duration,
      'Price': b.price,
      'Seats Available': b.availableSeats,
      'Total Seats': b.totalSeats
    })), `buses_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="management-container admin-buses-container">
      <div className="management-header buses-header">
        <div className="header-main">
          <h1>Bus Fleet Management</h1>
          <p>Organize premium bus routes, seating, and dynamic schedules.</p>
        </div>
        <div className="management-actions">
          <div className="search-box">
             <span className="search-icon">Search</span>
             <input 
              type="text" 
              placeholder="Search buses..." 
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
            >Upload Buses</button>
            <button
              className="add-btn"
              onClick={() => {
                setShowModal(true);
                setEditingBus(null);
                setFormData(initialFormState);
              }}
            >
              + Add New Bus
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="page-loading-state">
          <div className="spinner"></div>
          <span>Loading buses...</span>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sr No.</th>
                <th>Operator</th>
                <th>Bus Type</th>
                <th>Route</th>
                <th>Timing</th>
                <th>Price</th>
                <th>Seats</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentBuses.map((bus, index) => (
                <tr key={bus._id}>
                  <td>{indexOfFirstBus + index + 1}</td>
                  <td>{bus.operatorName}</td>
                  <td>{bus.busType}</td>
                  <td>{bus.from} → {bus.to}</td>
                  <td>{bus.departureTime} - {bus.arrivalTime}</td>
                  <td>₹{bus.price}</td>
                  <td>{bus.availableSeats}/{bus.totalSeats}</td>
                  <td>
                    <div className="status-select-wrapper">
                      <select
                        className={`status-select-inline ${(bus.status || "").toLowerCase()}`}
                        value={bus.status}
                        onChange={(e) => updateBusStatus(bus, e.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="edit-btn" onClick={() => handleEdit(bus)}>Edit</button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(bus._id)}
                        disabled={deletingBusId === bus._id}
                      >
                        {deletingBusId === bus._id ? 'Deleting...' : 'Delete'}
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
                Showing {indexOfFirstBus + 1} to {Math.min(indexOfLastBus, filteredBuses.length)} of {filteredBuses.length} entries
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
        <div className="modal-overlay bus-modal">
          <div className="modal-content-glass">
            <div className="modal-header">
              <h3>{editingBus ? "Edit Bus" : "Add New Bus"}</h3>
              <button type="button" className="modal-close" onClick={resetForm}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Basic Bus Information */}
                <div className="form-group">
                  <label>Operator Name*</label>
                  <input
                    type="text"
                    name="operatorName"
                    value={formData.operatorName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Bus Type*</label>
                  <select
                    name="busType"
                    value={formData.busType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="AC Sleeper">AC Sleeper</option>
                    <option value="Non-AC Sleeper">Non-AC Sleeper</option>
                    <option value="AC Semi Sleeper">AC Semi Sleeper</option>
                    <option value="Non-AC Semi Sleeper">Non-AC Semi Sleeper</option>
                    <option value="AC Seater">AC Seater</option>
                    <option value="Non-AC Seater">Non-AC Seater</option>
                    <option value="Volvo AC">Volvo AC</option>
                    <option value="Bharat Benz AC">Bharat Benz AC</option>
                    <option value="Scania AC">Scania AC</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Seat Layout*</label>
                  <select
                    name="seatLayout"
                    value={formData.seatLayout}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="2+1">2+1</option>
                    <option value="2+2">2+2</option>
                    <option value="1+1">1+1</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Rating</label>
                  <select
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                  >
                    <option value="5">5 Stars</option>
                    <option value="4.5">4.5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3.5">3.5 Stars</option>
                    <option value="3">3 Stars</option>
                  </select>
                </div>

                {/* Route Information */}
                <div className="form-group">
                  <label>From City*</label>
                  <input
                    type="text"
                    name="from"
                    value={formData.from}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>To City*</label>
                  <input
                    type="text"
                    name="to"
                    value={formData.to}
                    onChange={handleInputChange}
                    required
                  />
                </div>

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
                  <label>Duration*</label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
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

                {/* Pricing & Seats */}
                <div className="form-group">
                  <label>Ticket Price (₹)*</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="1"
                    max="10000"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Total Seats*</label>
                  <input
                    type="number"
                    name="totalSeats"
                    value={formData.totalSeats}
                    onChange={handleInputChange}
                    min="1"
                    max="60"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Available Seats*</label>
                  <input
                    type="number"
                    name="availableSeats"
                    value={formData.availableSeats}
                    onChange={handleInputChange}
                    min="0"
                    max={formData.totalSeats}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Amenities */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Amenities</label>
                  <div className="amenities-checkboxes">
                    {[
                      ["WiFi", "WiFi"],
                      ["Water", "Water"],
                      ["Charging", "Charging Point"],
                      ["Blanket", "Blanket"],
                      ["Pillow", "Pillow"],
                      ["Snacks", "Snacks"],
                      ["TV", "TV"],
                      ["Air Conditioning", "AC"],
                      ["Reading Light", "Reading Light"],
                      ["Emergency Exit", "Emergency Exit"]
                    ].map(([amenity, label]) => (
                      <label key={amenity} className="checkbox-label">
                        <input
                          type="checkbox"
                          name="amenities"
                          value={amenity}
                          checked={formData.amenities.includes(amenity)}
                          onChange={(e) => handleAmenityChange(amenity)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingBus ? "Update Bus" : "Add Bus"}
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
              <h3>Upload Buses</h3>
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
                                                    Row {dup.index}: {dup.reason}
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
                                                Confirm Upload ({previewData.validRecords} buses)
                                            </button>
                                        </div>
                                    )}
                                </div>
              </div>
            ) : confirmStep ? (
              <div className="confirm-step">
                <div className="confirm-header">
                  <h4>🚀 Uploading Buses...</h4>
                </div>
                
                <div className="upload-progress">
                  <div className="spinner"></div>
                  <p>Uploading {previewData.validRecords} buses to database...</p>
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

export default AdminBuses;

