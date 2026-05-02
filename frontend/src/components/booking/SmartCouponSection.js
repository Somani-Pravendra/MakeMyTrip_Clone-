import React, { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../utils/api";
import { formatCurrency } from "../../utils/currency";
import {
  getBestOffer,
  getFallbackOffers,
  normalizeOfferCategory,
  normalizeOfferCode,
  resolveOfferByCode,
} from "../../utils/offers";

const SmartCouponSection = ({
  category,
  subtotal,
  appliedCode = "",
  appliedDiscount = 0,
  onCouponChange,
  title = "OFFERS",
  placeholder = "Enter coupon code",
}) => {
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [couponInput, setCouponInput] = useState(appliedCode || "");
  const [couponFeedback, setCouponFeedback] = useState("");

  const normalizedCategory = normalizeOfferCategory(category);

  useEffect(() => {
    setCouponInput(appliedCode || "");
  }, [appliedCode]);

  // Clear coupon feedback and input when the booking category changes,
  // since offers are category-specific and old feedback would be misleading.
  useEffect(() => {
    setCouponFeedback("");
    setCouponInput("");
  }, [normalizedCategory]);

  useEffect(() => {
    let isActive = true;

    const fetchOffers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/offers?category=${encodeURIComponent(normalizedCategory)}`
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to fetch offers.");
        }

        if (isActive) {
          setOffers(Array.isArray(result.offers) ? result.offers : []);
        }
      } catch (error) {
        if (isActive) {
          setOffers([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchOffers();

    return () => {
      isActive = false;
    };
  }, [normalizedCategory]);

  const effectiveOffers = offers.length > 0 ? offers : getFallbackOffers(normalizedCategory);

  const bestOffer = useMemo(
    () => getBestOffer(effectiveOffers, subtotal),
    [effectiveOffers, subtotal]
  );

  const appliedOffer = useMemo(
    () => resolveOfferByCode(effectiveOffers, appliedCode, subtotal),
    [effectiveOffers, appliedCode, subtotal]
  );

  useEffect(() => {
    if (!appliedCode) {
      setCouponFeedback("");
      return;
    }

    if (appliedOffer.valid) {
      setCouponFeedback(`Applied ${appliedOffer.code}`);
      if (
        typeof onCouponChange === "function" &&
        appliedOffer.amount !== Number(appliedDiscount || 0)
      ) {
        onCouponChange({
          couponCode: appliedOffer.code,
          couponDiscount: appliedOffer.amount,
        });
      }
      return;
    }

    setCouponFeedback(appliedOffer.message || "");

    if (typeof onCouponChange === "function" && Number(appliedDiscount || 0) > 0) {
      onCouponChange({
        couponCode: "",
        couponDiscount: 0,
      });
    }
  }, [appliedCode, appliedOffer, appliedDiscount, onCouponChange]);

  const applyCouponCode = (inputCode) => {
    const normalizedCode = normalizeOfferCode(inputCode);
    if (!normalizedCode) {
      setCouponFeedback("Enter a valid coupon code.");
      return;
    }

    const evaluation = resolveOfferByCode(effectiveOffers, normalizedCode, subtotal);
    if (!evaluation.valid) {
      setCouponFeedback(evaluation.message || "Invalid coupon code.");
      return;
    }

    setCouponFeedback(`Applied ${evaluation.code}`);
    onCouponChange?.({
      couponCode: evaluation.code,
      couponDiscount: evaluation.amount,
    });
  };

  const handleRemove = () => {
    setCouponInput("");
    setCouponFeedback("");
    onCouponChange?.({
      couponCode: "",
      couponDiscount: 0,
    });
  };

  const visibleOffers = effectiveOffers.slice(0, 4);

  return (
    <div className="addon-summary-section mt-24">
      <p className="label-text-dim">{title}</p>

      {bestOffer?.offer && (
        <div className="elite-status-pill promo-best-offer mt-10">
          <div className="promo-best-offer__copy">
            <strong>Best coupon for you: {bestOffer.code}</strong>
            <p className="no-margin">
              Save {formatCurrency(bestOffer.amount)}
            </p>
          </div>
          {appliedCode !== bestOffer.code && (
            <button
              type="button"
              className="btn-elite-primary mini promo-inline-btn"
              onClick={() => {
                setCouponInput(bestOffer.code);
                applyCouponCode(bestOffer.code);
              }}
            >
              APPLY
            </button>
          )}
        </div>
      )}

      <div className="promo-inline-row mt-10">
        <input
          className="elite-input promo-inline-input"
          type="text"
          placeholder={placeholder}
          value={couponInput}
          onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
        />
        <button
          type="button"
          className="btn-elite-primary promo-inline-btn"
          onClick={() => applyCouponCode(couponInput)}
          disabled={isLoading}
        >
          {isLoading ? "..." : "APPLY"}
        </button>
      </div>

      {appliedCode && (
        <button type="button" className="clear-all-link mt-10" onClick={handleRemove}>
          Remove Coupon
        </button>
      )}

      {couponFeedback && (
        <p className={`coupon-feedback ${appliedOffer.valid ? "success" : "error"}`}>
          {couponFeedback}
        </p>
      )}

      {visibleOffers.length > 0 && (
        <div className="coupon-chip-list">
          {visibleOffers.map((offer) => (
            <button
              key={offer._id || offer.promoCode}
              type="button"
              className="coupon-chip"
              onClick={() => setCouponInput(offer.promoCode)}
            >
              {offer.promoCode}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartCouponSection;
