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
import "./AdminFlights.css";

const API_URL = `${API_BASE_URL}/admin/flights`;

const AdminFlights = () => {
  const { confirm, notify } = useAdminUX();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFlight, setEditingFlight] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [deletingFlightId, setDeletingFlightId] = useState(null);
  
  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;
  const [previewData, setPreviewData] = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);

  const initialFormState = {
    airline: "",
    airlineName: "",
    flightNumber: "",
    flightType: "Domestic",
    logo: "https://imgak.mmtcdn.com/flights/assets/media/dt/common/icons/6E.png",
    from: "",
    to: "",
    departureCity: "",
    arrivalCity: "",
    date: "",
    departureTime: "",
    arrivalTime: "",
    duration: "",
    stops: "Non Stop",
    basePrice: "",
    totalFare: "",
    currency: "INR",
    passportRequired: false,
    visaRequired: false,
    availableSeats: 60,
    fares: [
      { type: "SAVER", price: 0, benefits: ["15kg Baggage", "Meals Included"] },
      { type: "PLUS", price: 1500, benefits: ["25kg Baggage", "Premium Meals", "Free Seat Selection"] }
    ]
  };

  const [formData, setFormData] = useState(initialFormState);

  /* -------------------- FETCH FLIGHTS -------------------- */
  const fetchFlights = useCallback(async () => {
    try {
      const res = await axios.get(API_URL, {
        ...getAdminAuthConfig(),
        withCredentials: true
      });

      setFlights(res.data);
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
      const response = await axios.post(`${API_URL}/upload`, {
        flightsToUpload: previewData.valid
      }, {
        ...getAdminAuthConfig(),
        withCredentials: true
      });

      setUploadResult(response.data);
      fetchFlights();
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
  }, [previewData, fetchFlights]);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  useEffect(() => {
    if (confirmStep && previewData) {
      handleConfirmUpload();
    }
  }, [confirmStep, previewData, handleConfirmUpload]);

  /* -------------------- FORM HANDLERS -------------------- */
  const calculateDuration = (departureTime, arrivalTime) => {
    if (!departureTime || !arrivalTime) return "";
    
    // Parse times
    const [depHours, depMinutes] = departureTime.split(':').map(Number);
    const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number);
    
    // Create date objects (using same date to avoid date crossing issues)
    const depDate = new Date();
    depDate.setHours(depHours, depMinutes, 0, 0);
    
    const arrDate = new Date();
    arrDate.setHours(arrHours, arrMinutes, 0, 0);
    
    // If arrival time is earlier than departure, assume next day
    if (arrDate < depDate) {
      arrDate.setDate(arrDate.getDate() + 1);
    }
    
    // Calculate difference in milliseconds
    const diffMs = arrDate - depDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Format duration string
    if (diffHours === 0) {
      return `${diffMinutes}m`;
    } else if (diffMinutes === 0) {
      return `${diffHours}h`;
    } else {
      return `${diffHours}h ${diffMinutes}m`;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    let updatedData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value
    };

    if (name === "airlineName") updatedData.airline = value;
    if (name === "departureCity") updatedData.from = value;
    if (name === "arrivalCity") updatedData.to = value;
    if (name === "totalFare") updatedData.basePrice = value;

    // Auto-calculate duration when departure or arrival time changes
    if (name === "departureTime" || name === "arrivalTime") {
      const { departureTime, arrivalTime } = updatedData;
      if (departureTime && arrivalTime) {
        updatedData.duration = calculateDuration(departureTime, arrivalTime);
      }
    }

    setFormData(updatedData);
  };

  const handleFareChange = (index, field, value) => {
    const updatedFares = [...formData.fares];

    if (field === "benefits") {
      updatedFares[index][field] = value.split(",").map((b) => b.trim());
    } else {
      updatedFares[index][field] = value;
    }

    setFormData({ ...formData, fares: updatedFares });
  };

  /* -------------------- SUBMIT -------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingFlight) {
        await axios.put(`${API_URL}/${editingFlight._id}`, formData, {
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
      setEditingFlight(null);
      setFormData(initialFormState);
      fetchFlights();
    } catch (err) {
      console.error(err);
      notify({
        type: "error",
        title: "Save failed",
        message:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Error saving flight"
      });
    }
  };

  /* -------------------- EDIT -------------------- */
  const handleEdit = (flight) => {
    setEditingFlight(flight);
    setFormData(flight);
    setShowModal(true);
  };

  /* -------------------- DELETE -------------------- */
  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Delete flight",
      message: "This flight will be permanently removed from the schedule.",
      confirmLabel: "Delete flight",
      tone: "danger"
    });
    if (!confirmed) return;

    try {
      setDeletingFlightId(id);
      await axios.delete(`${API_URL}/${id}`, {
        ...getAdminAuthConfig(),
        withCredentials: true
      });

      setFlights((currentFlights) => currentFlights.filter((flight) => flight._id !== id));
      notify({
        type: "success",
        title: "Successfully deleted",
        message: "Flight deleted successfully."
      });
      fetchFlights();
    } catch (err) {
      console.error(err);
      notify({
        type: "error",
        title: "Delete failed",
        message:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to delete flight right now."
      });
    } finally {
      setDeletingFlightId(null);
    }
  };

  /* -------------------- UPLOAD HANDLERS -------------------- */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    // Validate file type
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

    // Validate file size (5MB limit)
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
  const filteredFlights = flights.filter(f => 
    includesNormalizedSearch(f.airline || f.airlineName, normalizedSearchTerm) ||
    includesNormalizedSearch(f.flightNumber, normalizedSearchTerm) ||
    includesNormalizedSearch(f.from, normalizedSearchTerm) ||
    includesNormalizedSearch(f.to, normalizedSearchTerm)
  );

  const indexOfLastFlight = currentPage * itemsPerPage;
  const indexOfFirstFlight = indexOfLastFlight - itemsPerPage;
  const currentFlights = filteredFlights.slice(indexOfFirstFlight, indexOfLastFlight);
  const totalPages = Math.ceil(filteredFlights.length / itemsPerPage);

  useClampedAdminPage(totalPages, setCurrentPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleExport = () => {
    if (!flights || flights.length === 0) return;
    exportRowsAsCsv(flights.map((f) => ({
      'Airline': f.airline,
      'Flight Number': f.flightNumber,
      'From': f.from,
      'To': f.to,
      'Departure': f.departureTime,
      'Arrival': f.arrivalTime,
      'Duration': f.duration,
      'Stops': f.stops,
      'Price': Number(f.totalFare ?? f.basePrice ?? 0)
    })), `flights_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  /* -------------------- UI -------------------- */
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="management-container admin-flights-container">
      <div className="management-header flights-header">
        <div className="header-main">
          <h1>Flight Management</h1>
          <p>Manage fleet details, schedules, and premium pricing dynamics.</p>
        </div>
        <div className="management-actions">
          <div className="search-box">
            <span className="search-icon">Search</span>
            <input 
              type="text" 
              placeholder="Search flights..." 
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
            >Upload Flights</button>
            <button
              className="add-btn"
              onClick={() => {
                setShowModal(true);
                setEditingFlight(null);
                setFormData(initialFormState);
              }}
            >
              + Add New Flight
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="page-loading-state">
          <div className="spinner"></div>
          <span>Loading flights...</span>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sr No.</th>
                <th>Airline</th>
                <th>Flight No.</th>
                <th>Type</th>
                <th>Route</th>
                <th>Date</th>
                <th>Timing</th>
                <th>Total Fare</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentFlights.map((flight, index) => (
                <tr key={flight._id}>
                  <td>{indexOfFirstFlight + index + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img src={flight.logo} alt="" style={{ width: "20px" }} />
                      {flight.airlineName || flight.airline}
                    </div>
                  </td>
                  <td>{flight.flightNumber}</td>
                  <td>{flight.flightType}</td>
                  <td>
                    {flight.departureCity || flight.from} →{" "}
                    {flight.arrivalCity || flight.to}
                  </td>
                  <td>{flight.date || "N/A"}</td>
                  <td>
                    {flight.departureTime} - {flight.arrivalTime} ({flight.duration})
                  </td>
                  <td>
                    {flight.currency} {flight.totalFare || flight.basePrice}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="edit-btn" onClick={() => handleEdit(flight)}>
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(flight._id)}
                        disabled={deletingFlightId === flight._id}
                      >
                        {deletingFlightId === flight._id ? "Deleting..." : "Delete"}
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
                Showing {indexOfFirstFlight + 1} to {Math.min(indexOfLastFlight, filteredFlights.length)} of {filteredFlights.length} entries
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
        <div className="modal-overlay flight-modal">
          <div className="modal-content-glass">
            <div className="modal-header">
              <h3>{editingFlight ? "Edit Flight" : "Add New Flight"}</h3>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Basic Flight Information */}
                <div className="form-group">
                  <label>Airline Name*</label>
                  <input
                    type="text"
                    name="airlineName"
                    value={formData.airlineName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Flight Number*</label>
                  <input
                    type="text"
                    name="flightNumber"
                    value={formData.flightNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Flight Type*</label>
                  <select
                    name="flightType"
                    value={formData.flightType}
                    onChange={handleInputChange}
                  >
                    <option value="Domestic">Domestic</option>
                    <option value="International">International</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Airline Logo URL*</label>
                  <input
                    type="url"
                    name="logo"
                    value={formData.logo}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Route Information */}
                <div className="form-group">
                  <label>Departure City*</label>
                  <input
                    type="text"
                    name="departureCity"
                    value={formData.departureCity}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Arrival City*</label>
                  <input
                    type="text"
                    name="arrivalCity"
                    value={formData.arrivalCity}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date*</label>
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
                    placeholder="e.g., 2h 30m"
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label>Stops</label>
                  <select
                    name="stops"
                    value={formData.stops}
                    onChange={handleInputChange}
                  >
                    <option value="Non Stop">Non Stop</option>
                    <option value="1 Stop">1 Stop</option>
                    <option value="2+ Stops">2+ Stops</option>
                  </select>
                </div>

                {/* Pricing Information */}
                <div className="form-group">
                  <label>Base Price*</label>
                  <input
                    type="number"
                    name="basePrice"
                    value={formData.basePrice}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Total Fare</label>
                  <input
                    type="number"
                    name="totalFare"
                    value={formData.totalFare}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Available Seats</label>
                  <input
                    type="number"
                    name="availableSeats"
                    value={formData.availableSeats}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>

                {/* Travel Requirements */}
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="passportRequired"
                      checked={formData.passportRequired}
                      onChange={handleInputChange}
                    />
                    Passport Required
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="visaRequired"
                      checked={formData.visaRequired}
                      onChange={handleInputChange}
                    />
                    Visa Required
                  </label>
                </div>
              </div>

              {/* Fare Types */}
              <div className="fares-section">
                <h4>Fare Types</h4>
                {formData.fares.map((fare, index) => (
                  <div key={index} className="fare-type">
                    <div className="form-group">
                      <label>Fare Type*</label>
                      <input
                        type="text"
                        value={fare.type}
                        onChange={(e) => handleFareChange(index, "type", e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Price</label>
                      <input
                        type="number"
                        value={fare.price}
                        onChange={(e) => handleFareChange(index, "price", e.target.value)}
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Benefits (comma-separated)</label>
                      <input
                        type="text"
                        value={fare.benefits.join(", ")}
                        onChange={(e) => handleFareChange(index, "benefits", e.target.value)}
                        placeholder="e.g., 15kg Baggage, Meals Included"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingFlight ? "Update Flight" : "Add Flight"}
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
              <h3>Upload Flights</h3>
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
                                                    Row {dup.index}: Flight {dup.flightNumber} - {dup.reason}
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
                                                Confirm Upload ({previewData.validRecords} flights)
                                            </button>
                                        </div>
                                    )}
                                </div>
              </div>
            ) : confirmStep ? (
              <div className="confirm-step">
                <div className="confirm-header">
                  <h4>🚀 Uploading Flights...</h4>
                </div>
                
                <div className="upload-progress">
                  <div className="spinner"></div>
                  <p>Uploading {previewData.validRecords} flights to database...</p>
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

export default AdminFlights;

