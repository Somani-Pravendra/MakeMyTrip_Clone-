import React, { useMemo, useState } from 'react';

const TravellerDetails = ({ data, onNext, onBack, onUpdate }) => {
  const [errors, setErrors] = useState({});
  const blankPassenger = useMemo(() => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
    gender: ''
  }), []);

  const primaryPassenger = data.passengers?.[0] || blankPassenger;
  const selectedCab = data.selectedCab || data.cab || {};
  const capacity = Math.max(Number(selectedCab.seats || selectedCab.numberOfSeats || 4), 1);
  const passengerCount = data.numberOfPassengers || data.passengers?.length || 1;

  const buildPassengerArray = (count, seedPassengers = data.passengers || []) => {
    const safeCount = Math.max(Number(count) || 1, 1);
    return Array.from({ length: safeCount }, (_, index) => {
      if (seedPassengers[index]) {
        return { ...blankPassenger, ...seedPassengers[index] };
      }
      return { ...blankPassenger };
    });
  };

  const passengers = buildPassengerArray(passengerCount);
  const getErrorKey = (index, field) => (index === 0 ? field : `${field}_${index}`);

  const validateForm = () => {
    const newErrors = {};
    const passengersToValidate = buildPassengerArray(passengerCount);

    if (!passengersToValidate[0].firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!passengersToValidate[0].lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!passengersToValidate[0].email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(passengersToValidate[0].email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!passengersToValidate[0].phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(passengersToValidate[0].phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    passengersToValidate.slice(1).forEach((passenger, index) => {
      const passengerIndex = index + 1;
      if (!passenger.firstName.trim()) {
        newErrors[getErrorKey(passengerIndex, 'firstName')] = 'First name is required';
      }
      if (!passenger.lastName.trim()) {
        newErrors[getErrorKey(passengerIndex, 'lastName')] = 'Last name is required';
      }
    });

    if (!data.termsAccepted) {
      newErrors.termsAccepted = 'Please accept the cab rental policy to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePassengerChange = (index, field, value) => {
    const updatedPassengers = buildPassengerArray(passengerCount);
    updatedPassengers[index] = {
      ...updatedPassengers[index],
      [field]: value
    };

    const nextPayload = { passengers: updatedPassengers };

    if (index === 0) {
      nextPayload.contactDetails = {
        ...data.contactDetails,
        name: `${updatedPassengers[0].firstName} ${updatedPassengers[0].lastName}`.trim(),
        email: updatedPassengers[0].email,
        phone: updatedPassengers[0].phone
      };
    }

    onUpdate(nextPayload);
    const errorKey = getErrorKey(index, field);
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: '' }));
    }
  };

  const handlePassengerCountChange = (value) => {
    const nextCount = parseInt(value, 10) || 1;
    const updatedPassengers = buildPassengerArray(nextCount);
    updatedPassengers[0] = { ...updatedPassengers[0], ...primaryPassenger };

    onUpdate({
      numberOfPassengers: nextCount,
      passengers: updatedPassengers,
      contactDetails: {
        ...data.contactDetails,
        name: `${updatedPassengers[0].firstName} ${updatedPassengers[0].lastName}`.trim(),
        email: updatedPassengers[0].email,
        phone: updatedPassengers[0].phone
      }
    });
  };

  const handleTermsChange = (checked) => {
    onUpdate({ termsAccepted: checked });
    if (errors.termsAccepted) {
      setErrors((prev) => ({ ...prev, termsAccepted: '' }));
    }
  };

  const handleNext = () => {
    if (validateForm()) onNext();
  };

  return (
    <div className="traveller-details-step elite-design-v4">
      <div className="card-v4 premium-glass">
        <div className="section-header-row">
          <div className="label-col">
            <span className="elite-badge">Verified Contact</span>
            <h3 className="no-margin mt-10"><span>Contact</span> & Traveller Details</h3>
          </div>
        </div>

        <div className="traveller-entry-card mt-30">
          <div className="passenger-header">
            <div className="index-pill-elite">P1</div>
            <div style={{ flex: 1 }}>
              <h4 className="no-margin white-bold" style={{ fontSize: '18px' }}>Primary Traveller</h4>
              <span className="label-text-dim">THE MAIN PERSON RIDING</span>
            </div>
          </div>

          <div className="elite-form-row double mt-24">
            <div className="form-field-v2">
              <label>FIRST NAME</label>
              <input
                type="text"
                className="elite-input"
                value={primaryPassenger.firstName}
                onChange={(e) => handlePassengerChange(0, 'firstName', e.target.value)}
                placeholder="Enter first name"
              />
              {errors.firstName && <p className="error-text-elite">{errors.firstName}</p>}
            </div>
            <div className="form-field-v2">
              <label>LAST NAME</label>
              <input
                type="text"
                className="elite-input"
                value={primaryPassenger.lastName}
                onChange={(e) => handlePassengerChange(0, 'lastName', e.target.value)}
                placeholder="Enter last name"
              />
              {errors.lastName && <p className="error-text-elite">{errors.lastName}</p>}
            </div>
          </div>

          <div className="elite-form-row double mt-20">
            <div className="form-field-v2">
              <label>EMAIL ADDRESS</label>
              <input
                type="email"
                className="elite-input"
                value={primaryPassenger.email}
                onChange={(e) => handlePassengerChange(0, 'email', e.target.value)}
                placeholder="name@example.com"
              />
              {errors.email && <p className="error-text-elite">{errors.email}</p>}
            </div>
            <div className="form-field-v2">
              <label>MOBILE NUMBER</label>
              <input
                type="tel"
                className="elite-input"
                value={primaryPassenger.phone}
                onChange={(e) => handlePassengerChange(0, 'phone', e.target.value)}
                placeholder="10-digit mobile"
              />
              {errors.phone && <p className="error-text-elite">{errors.phone}</p>}
            </div>
          </div>
        </div>

        <div className="section-header-row mt-40">
          <h3><span>Guests</span> Ride Occupancy</h3>
        </div>
        <div className="elite-form-row mt-20">
          <div className="form-field-v2">
            <label>AGE</label>
            <input
              type="number"
              className="elite-input"
              value={primaryPassenger.age}
              onChange={(e) => handlePassengerChange(0, 'age', e.target.value)}
              placeholder="Age"
            />
          </div>
          <div className="form-field-v2">
            <label>GENDER</label>
            <select
              className="elite-select"
              value={primaryPassenger.gender}
              onChange={(e) => handlePassengerChange(0, 'gender', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-field-v2">
            <label>TOTAL TRAVELLERS</label>
            <select
              className="elite-select"
              value={data.numberOfPassengers || 1}
              onChange={(e) => handlePassengerCountChange(e.target.value)}
            >
              {[...Array(capacity)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} Guest{i > 0 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {passengers.slice(1).map((passenger, idx) => {
        const passengerIndex = idx + 1;
        return (
          <div key={`cab-guest-${passengerIndex}`} className="card-v4 premium-glass mt-24">
            <div className="passenger-header">
              <div className="index-pill-elite" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                P{passengerIndex + 1}
              </div>
              <h4 className="no-margin white-bold">Guest Traveller {passengerIndex + 1}</h4>
            </div>

            <div className="elite-form-row double mt-24">
              <div className="form-field-v2">
                <label>FIRST NAME</label>
                <input
                  type="text"
                  className="elite-input"
                  value={passenger.firstName}
                  onChange={(e) => handlePassengerChange(passengerIndex, 'firstName', e.target.value)}
                  placeholder="First name"
                />
                {errors[getErrorKey(passengerIndex, 'firstName')] && (
                  <p className="error-text-elite">{errors[getErrorKey(passengerIndex, 'firstName')]}</p>
                )}
              </div>
              <div className="form-field-v2">
                <label>LAST NAME</label>
                <input
                  type="text"
                  className="elite-input"
                  value={passenger.lastName}
                  onChange={(e) => handlePassengerChange(passengerIndex, 'lastName', e.target.value)}
                  placeholder="Last name"
                />
                {errors[getErrorKey(passengerIndex, 'lastName')] && (
                  <p className="error-text-elite">{errors[getErrorKey(passengerIndex, 'lastName')]}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="card-v4 premium-glass mt-24">
        <div className="section-header-row">
          <h3><span>Pickup</span> Dispatch & Pickup Note</h3>
        </div>
        <div className="form-field-v2 mt-20">
          <label>SPECIAL INSTRUCTIONS FOR DRIVER</label>
          <textarea
            className="elite-input"
            style={{ width: '100%', minHeight: '120px', padding: '20px', resize: 'none', borderStyle: 'dashed' }}
            value={data.specialRequirements || ''}
            onChange={(e) => onUpdate({ specialRequirements: e.target.value })}
            placeholder="Gate number, landmark, luggage count, or a precise pickup location."
          />
        </div>
      </div>

      <div className="card-v4 glass-info mt-24">
        <label className="custom-checkbox-v4">
          <input
            type="checkbox"
            checked={data.termsAccepted || false}
            onChange={(e) => handleTermsChange(e.target.checked)}
          />
          <span className="checkmark"></span>
          <span className="label-text-dim" style={{ textTransform: 'none', cursor: 'pointer', fontSize: '13px' }}>
            I agree to the <span className="cyan-highlight">Cab Rental Policy & cancellation terms</span>.
            Availability is subject to driver allocation by the service provider.
          </span>
        </label>
        {errors.termsAccepted && <p className="error-text-elite">{errors.termsAccepted}</p>}
      </div>

      <div className="booking-actions-shell mt-40">
        <button className="btn-elite-outline" onClick={onBack}>
          <span>&larr;</span> Back to Review
        </button>
        <button
          className="btn-elite-primary"
          onClick={handleNext}
          style={{ minWidth: '280px' }}
        >
          CONTINUE TO PICKUP & DROP <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
};

export default TravellerDetails;
