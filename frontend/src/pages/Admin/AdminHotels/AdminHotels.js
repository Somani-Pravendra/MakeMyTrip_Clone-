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
import "./AdminHotels.css";

const API_URL = `${API_BASE_URL}/admin/hotels`;
const today = new Date().toISOString().split("T")[0];
const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const getHotelDisplayPrice = (hotel = {}) => {
  const roomTypes = Array.isArray(hotel.roomTypes) ? hotel.roomTypes : [];
  const prices = roomTypes
    .map((room) => Number(room?.pricePerNight) || 0)
    .filter((price) => price > 0);

  return prices.length ? Math.min(...prices) : 0;
};

const getHotelOriginalPrice = (hotel = {}) => {
  const basePrice = getHotelDisplayPrice(hotel);
  if (!basePrice) return 0;
  return Number(hotel.originalPrice) || Math.round(basePrice * 1.18);
};

const getHotelStatusClass = (status = "") => String(status || "").trim().toLowerCase() || "available";

const AdminHotels = () => {
  const { confirm, notify } = useAdminUX();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [deletingHotelId, setDeletingHotelId] = useState(null);

  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  const initialFormState = {
    name: "",
    category: "Hotel",
    location: {
      city: "",
      address: "",
      state: "",
      pincode: ""
    },
    description: "",
    rating: 3,
    stars: 3,
    images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop"],
    roomTypes: [
      {
        type: "Single",
        pricePerNight: 2000,
        maxOccupancy: 1,
        amenities: ["Wi-Fi", "AC", "TV"]
      },
      {
        type: "Double",
        pricePerNight: 3000,
        maxOccupancy: 2,
        amenities: ["Wi-Fi", "AC", "TV", "Mini Bar"]
      }
    ],
    totalRooms: 50,
    availableRooms: 50,
    date: today,
    amenities: ["Wi-Fi", "AC", "Parking"],
    checkInTime: "12:00",
    checkOutTime: "11:00",
    bookingStatus: "Available",
    contactInfo: {
      phone: "",
      email: "",
      website: ""
    },
    policies: {
      cancellationPolicy: "Free cancellation 24 hours before check-in",
      paymentPolicy: "Full payment required at booking",
      checkInInstructions: "Valid ID required at check-in"
    },
    isActive: true
  };

  const [formData, setFormData] = useState(initialFormState);

  /* -------------------- FETCH HOTELS -------------------- */
  const fetchHotels = useCallback(async () => {
    try {
      const res = await axios.get(API_URL, {
        ...getAdminAuthConfig(),
        withCredentials: true
      });
      setHotels(res.data);
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
        hotelsToUpload: previewData.valid
      }, {
        ...getAdminAuthConfig(),
        withCredentials: true
      });

      setUploadResult(response.data);
      fetchHotels();
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
  }, [previewData, fetchHotels]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    if (confirmStep && previewData) {
      handleConfirmUpload();
    }
  }, [confirmStep, previewData, handleConfirmUpload]);

  /* -------------------- FORM HANDLERS -------------------- */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: type === "checkbox" ? checked : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value
      });
    }
  };

  const handleImageChange = (index, value) => {
    const updatedImages = [...formData.images];
    updatedImages[index] = value;
    setFormData({ ...formData, images: updatedImages });
  };

  const handleRoomTypeChange = (index, field, value) => {
    const updatedRoomTypes = [...formData.roomTypes];
    if (field === "amenities") {
      updatedRoomTypes[index][field] = value.split(",").map(a => a.trim());
    } else {
      updatedRoomTypes[index][field] = field === "pricePerNight" || field === "maxOccupancy" ? Number(value) : value;
    }
    setFormData({ ...formData, roomTypes: updatedRoomTypes });
  };

  const addRoomType = () => {
    setFormData({
      ...formData,
      roomTypes: [
        ...formData.roomTypes,
        {
          type: "Deluxe",
          pricePerNight: 5000,
          maxOccupancy: 2,
          amenities: ["Wi-Fi", "AC", "TV", "Mini Bar", "Balcony"]
        }
      ]
    });
  };

  const removeRoomType = (index) => {
    const updatedRoomTypes = formData.roomTypes.filter((_, i) => i !== index);
    setFormData({ ...formData, roomTypes: updatedRoomTypes });
  };

  const addImageField = () => {
    setFormData({
      ...formData,
      images: [...formData.images, ""]
    });
  };

  const removeImageField = (index) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: updatedImages });
  };

  /* -------------------- SUBMIT -------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHotel) {
        await axios.put(`${API_URL}/${editingHotel._id}`, formData, {
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
      setEditingHotel(null);
      setFormData(initialFormState);
      fetchHotels();
    } catch (err) {
      console.error(err);
      notify({
        type: "error",
        title: "Save failed",
        message: err.response?.data?.message || "Error saving hotel."
      });
    }
  };

  /* -------------------- EDIT -------------------- */
  const handleEdit = (hotel) => {
    setEditingHotel(hotel);
    setFormData({
      ...initialFormState,
      ...hotel,
      date: hotel.date || today,
      location: {
        ...initialFormState.location,
        ...(hotel.location || {})
      },
      contactInfo: {
        ...initialFormState.contactInfo,
        ...(hotel.contactInfo || {})
      },
      policies: {
        ...initialFormState.policies,
        ...(hotel.policies || {})
      },
      images: Array.isArray(hotel.images) && hotel.images.length ? hotel.images : initialFormState.images,
      roomTypes: Array.isArray(hotel.roomTypes) && hotel.roomTypes.length ? hotel.roomTypes : initialFormState.roomTypes,
      amenities: Array.isArray(hotel.amenities) ? hotel.amenities : initialFormState.amenities
    });
    setShowModal(true);
  };

  /* -------------------- DELETE -------------------- */
  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Delete hotel",
      message: "This property will be permanently removed from inventory.",
      confirmLabel: "Delete hotel",
      tone: "danger"
    });

    if (!confirmed) return;

    try {
      setDeletingHotelId(id);
      await axios.delete(`${API_URL}/${id}`, {
        ...getAdminAuthConfig(),
        withCredentials: true
      });

      setHotels((currentHotels) => currentHotels.filter((hotel) => hotel._id !== id));
      notify({
        type: "success",
        title: "Successfully deleted",
        message: "Hotel deleted successfully."
      });
      fetchHotels();
    } catch (err) {
      console.error(err);
      notify({
        type: "error",
        title: "Delete failed",
        message: err.response?.data?.message || "Unable to delete hotel."
      });
    } finally {
      setDeletingHotelId(null);
    }
  };

  const updateHotelStatus = async (hotel, nextStatus) => {
    try {
      await axios.put(
        `${API_URL}/${hotel._id}`,
        { ...hotel, bookingStatus: nextStatus },
        {
          ...getAdminAuthConfig(),
          withCredentials: true
        }
      );
      fetchHotels();
    } catch (err) {
      console.error("Error updating hotel status:", err);
      notify({
        type: "error",
        title: "Status update failed",
        message: err.response?.data?.message || "Unable to update hotel status."
      });
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
          'Content-Type': 'multipart/form-data',
          ...getAdminAuthConfig().headers
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
  const filteredHotels = hotels.filter(h =>
    includesNormalizedSearch(h?.name, normalizedSearchTerm) ||
    includesNormalizedSearch(h?.category, normalizedSearchTerm) ||
    includesNormalizedSearch(h?.location?.city, normalizedSearchTerm)
  );

  const indexOfLastHotel = currentPage * itemsPerPage;
  const indexOfFirstHotel = indexOfLastHotel - itemsPerPage;
  const currentHotels = filteredHotels.slice(indexOfFirstHotel, indexOfLastHotel);
  const totalPages = Math.ceil(filteredHotels.length / itemsPerPage);

  useClampedAdminPage(totalPages, setCurrentPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleExport = () => {
    if (!hotels || hotels.length === 0) return;
    const csvData = hotels.map(h => ({
      'Hotel Name': h.name,
      'Date': h.date || '',
      'City': h.location?.city,
      'Category': h.category,
      'Rating': h.rating,
      'Reviews Count': h.reviewsCount,
      'Price': getHotelDisplayPrice(h),
      'Original Price': getHotelOriginalPrice(h),
      'Rooms Available': h.availableRooms,
      'Total Rooms': h.totalRooms,
      'Address': h.location?.address
    }));
    exportRowsAsCsv(csvData, `hotels_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="management-container admin-hotels-container">
      <div className="management-header hotels-header">
        <div className="header-main">
          <h1>Luxury Hotel Management</h1>
          <p>Curate premium accommodations, pricing, and guest availability.</p>
        </div>
        <div className="management-actions">
          <div className="search-box">
            <span className="search-icon">Search</span>
            <input
              type="text"
              placeholder="Search hotels..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
            >Upload Hotels</button>
            <button
              className="add-btn"
              onClick={() => {
                setShowModal(true);
                setEditingHotel(null);
                setFormData(initialFormState);
              }}
            >
              + Add New Hotel
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="page-loading-state">
          <div className="spinner"></div>
          <span>Loading hotels...</span>
        </div>
      ) : (
        <section className="admin-page-panel">
          <div className="admin-page-panel__head">
            <div>
              <span className="admin-page-panel__kicker">Property Ledger</span>
              <h3>Track hotel stock, pricing and operational status</h3>
              <p>{filteredHotels.length} hotels match the current search. Review inventory before exporting or editing.</p>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sr No.</th>
                  <th>Hotel Name</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>City</th>
                  <th>Rating</th>
                  <th>Rooms</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentHotels.length > 0 ? (
                  currentHotels.map((hotel, index) => (
                    <tr key={hotel._id}>
                      <td>{indexOfFirstHotel + index + 1}</td>
                      <td>
                        <div className="user-info">
                          <strong className="user-name">{hotel.name || "Unnamed Hotel"}</strong>
                          <span className="user-email">{formatCurrency(getHotelDisplayPrice(hotel))} starting price</span>
                        </div>
                      </td>
                      <td>{hotel.category || "Hotel"}</td>
                      <td>{hotel.date || "N/A"}</td>
                      <td>{hotel.location?.city || "N/A"}</td>
                      <td>{hotel.rating ? `Star ${hotel.rating}` : "Unrated"}</td>
                      <td>{hotel.availableRooms}/{hotel.totalRooms}</td>
                      <td>
                        <div className="status-select-wrapper">
                          <select
                            className={`status-select-inline ${getHotelStatusClass(hotel.bookingStatus)}`}
                            value={hotel.bookingStatus || "Available"}
                            onChange={(e) => updateHotelStatus(hotel, e.target.value)}
                          >
                            <option value="Available">Available</option>
                            <option value="Limited">Limited</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="edit-btn" onClick={() => handleEdit(hotel)}>
                            Edit
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(hotel._id)}
                            disabled={deletingHotelId === hotel._id}
                          >
                            {deletingHotelId === hotel._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="empty-table">No hotels match the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {indexOfFirstHotel + 1} to {Math.min(indexOfLastHotel, filteredHotels.length)} of {filteredHotels.length} entries
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
        </section>
      )}
      {showModal && (
        <div className="modal-overlay hotel-modal">
          <div className="modal-content-glass">
            <div className="modal-header">
              <h3>{editingHotel ? "Edit Hotel" : "Add New Hotel"}</h3>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Basic Information */}
                <div className="form-group">
                  <label>Hotel Name*</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category*</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    <option value="Hotel">Hotel</option>
                    <option value="Resort">Resort</option>
                    <option value="Guest House">Guest House</option>
                    <option value="Villa">Villa</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Boutique Hotel">Boutique Hotel</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Date*</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Rating*</label>
                  <input
                    type="number"
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                    min="1"
                    max="5"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Stars*</label>
                  <select name="stars" value={formData.stars} onChange={handleInputChange}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <option key={star} value={star}>{star} Star</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div className="form-group">
                  <label>City*</label>
                  <input
                    type="text"
                    name="location.city"
                    value={formData.location.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Address*</label>
                  <input
                    type="text"
                    name="location.address"
                    value={formData.location.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="location.state"
                    value={formData.location.state}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    name="location.pincode"
                    value={formData.location.pincode}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Room Information */}
                <div className="form-group">
                  <label>Total Rooms*</label>
                  <input
                    type="number"
                    name="totalRooms"
                    value={formData.totalRooms}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Available Rooms*</label>
                  <input
                    type="number"
                    name="availableRooms"
                    value={formData.availableRooms}
                    onChange={handleInputChange}
                    min="0"
                    max={formData.totalRooms}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Check-in Time*</label>
                  <input
                    type="time"
                    name="checkInTime"
                    value={formData.checkInTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Check-out Time*</label>
                  <input
                    type="time"
                    name="checkOutTime"
                    value={formData.checkOutTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Booking Status*</label>
                  <select name="bookingStatus" value={formData.bookingStatus} onChange={handleInputChange}>
                    <option value="Available">Available</option>
                    <option value="Limited">Limited</option>
                    <option value="Full">Full</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    Active
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="form-group full-width">
                <label>Description*</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  required
                />
              </div>

              {/* Images */}
              <div className="form-section">
                <h4>Hotel Images</h4>
                {formData.images.map((image, index) => (
                  <div key={index} className="image-input-group">
                    <input
                      type="url"
                      value={image}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      placeholder="Image URL"
                    />
                    {formData.images.length > 1 && (
                      <button type="button" onClick={() => removeImageField(index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addImageField}>
                  + Add Image
                </button>
              </div>

              {/* Room Types */}
              <div className="form-section">
                <h4>Room Types</h4>
                {formData.roomTypes.map((roomType, index) => (
                  <div key={index} className="room-type-card">
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Room Type*</label>
                        <select
                          value={roomType.type}
                          onChange={(e) => handleRoomTypeChange(index, "type", e.target.value)}
                        >
                          <option value="Single">Single</option>
                          <option value="Double">Double</option>
                          <option value="Deluxe">Deluxe</option>
                          <option value="Suite">Suite</option>
                          <option value="Family">Family</option>
                          <option value="Executive">Executive</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Price per Night*</label>
                        <input
                          type="number"
                          value={roomType.pricePerNight}
                          onChange={(e) => handleRoomTypeChange(index, "pricePerNight", e.target.value)}
                          min="0"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Max Occupancy*</label>
                        <input
                          type="number"
                          value={roomType.maxOccupancy}
                          onChange={(e) => handleRoomTypeChange(index, "maxOccupancy", e.target.value)}
                          min="1"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Amenities (comma-separated)</label>
                        <input
                          type="text"
                          value={roomType.amenities.join(", ")}
                          onChange={(e) => handleRoomTypeChange(index, "amenities", e.target.value)}
                          placeholder="Wi-Fi, AC, TV"
                        />
                      </div>
                    </div>
                    {formData.roomTypes.length > 1 && (
                      <button type="button" onClick={() => removeRoomType(index)}>
                        Remove Room Type
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addRoomType}>
                  + Add Room Type
                </button>
              </div>

              {/* Amenities */}
              <div className="form-section">
                <h4>Hotel Amenities</h4>
                <div className="amenities-grid">
                  {[
                    "Wi-Fi", "AC", "Parking", "Restaurant", "Swimming Pool",
                    "Gym", "Spa", "Bar", "Airport Transfer", "Kids Club",
                    "Beach Access", "Business Center", "Room Service", "Laundry", "Pet Friendly"
                  ].map(amenity => (
                    <label key={amenity} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              amenities: [...formData.amenities, amenity]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              amenities: formData.amenities.filter(a => a !== amenity)
                            });
                          }
                        }}
                      />
                      {amenity}
                    </label>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="form-section">
                <h4>Contact Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="contactInfo.phone"
                      value={formData.contactInfo.phone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="contactInfo.email"
                      value={formData.contactInfo.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      name="contactInfo.website"
                      value={formData.contactInfo.website}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Policies */}
              <div className="form-section">
                <h4>Policies</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Cancellation Policy</label>
                    <textarea
                      name="policies.cancellationPolicy"
                      value={formData.policies.cancellationPolicy}
                      onChange={handleInputChange}
                      rows="2"
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Policy</label>
                    <textarea
                      name="policies.paymentPolicy"
                      value={formData.policies.paymentPolicy}
                      onChange={handleInputChange}
                      rows="2"
                    />
                  </div>

                  <div className="form-group">
                    <label>Check-in Instructions</label>
                    <textarea
                      name="policies.checkInInstructions"
                      value={formData.policies.checkInInstructions}
                      onChange={handleInputChange}
                      rows="2"
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingHotel ? "Update Hotel" : "Add Hotel"}
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
              <h3>Upload Hotels</h3>
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

                  {previewData.duplicateRecords > 0 && (
                    <div className="invalid-records-section">
                      <div className="invalid-records-title">Duplicate Records (will be skipped)</div>
                      {previewData.duplicates.slice(0, 5).map((dup, index) => (
                        <div key={index} className="invalid-record-item">
                          Row {dup.index}: Hotel {dup.hotelName} - {dup.reason}
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
                    <div className="form-actions">
                      <button className="cancel-btn" onClick={closeUploadModal}>
                        Cancel
                      </button>
                      <button
                        className="submit-btn"
                        onClick={() => setConfirmStep(true)}
                      >
                        Confirm Upload ({previewData.validRecords} hotels)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : confirmStep ? (
              <div className="confirm-step">
                <div className="confirm-header">
                  <h4>🚀 Uploading Hotels...</h4>
                </div>

                <div className="upload-progress">
                  <div className="spinner"></div>
                  <p>Uploading {previewData.validRecords} hotels to database...</p>
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

export default AdminHotels;

