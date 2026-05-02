const toAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.round(numeric));
};

export const getWalletPaymentBreakdown = ({
  totalAmount,
  walletBalance,
  useWallet,
  walletAmountInput,
  paymentMethod
}) => {
  const total = toAmount(totalAmount);
  const balance = toAmount(walletBalance);
  const maxWalletUsable = Math.min(total, balance);
  const walletOnlyMode = paymentMethod === "wallet";
  const requestedWalletAmount = walletOnlyMode
    ? maxWalletUsable
    : useWallet
      ? Math.min(toAmount(walletAmountInput), maxWalletUsable)
      : 0;

  return {
    totalAmount: total,
    walletBalance: balance,
    maxWalletUsable,
    walletApplied: requestedWalletAmount,
    externalPayable: Math.max(total - requestedWalletAmount, 0),
    walletOnlyMode
  };
};

export const validateBookingPaymentDetails = ({
  paymentMethod,
  paymentSubOption,
  upiId,
  selectedUpiApp,
  cardData,
  netBankingProvider
}) => {
  const newErrors = {};

  if (paymentMethod === "upi") {
    if (paymentSubOption === "apps") {
      if (!selectedUpiApp?.id) {
        newErrors.savedUpiApp = "Select a saved UPI app to continue";
      }
    } else if (paymentSubOption === "upiId") {
      if (!upiId) {
        newErrors.upi = "UPI ID is required";
      } else if (!upiId.includes("@")) {
        newErrors.upi = "Invalid UPI ID format (e.g., user@bank)";
      }
    }
  }

  if (paymentMethod === "card") {
    if (!cardData.number || cardData.number.replace(/\s/g, "").length !== 16) {
      newErrors.cardNumber = "Enter a valid 16-digit card number";
    }
    if (!cardData.expiry || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
      newErrors.expiry = "Use MM/YY format";
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      newErrors.cvv = "CVV must be at least 3 digits";
    }
    if (!cardData.name) {
      newErrors.name = "Name on card is required";
    }
  }

  if (paymentMethod === "netbanking" && !netBankingProvider) {
    newErrors.netbanking = "Please select a bank to continue";
  }

  return newErrors;
};

export const validateWalletAwarePayment = ({
  paymentMethod,
  upiId,
  cardData,
  externalPayable
}) => {
  const newErrors = {};

  if (externalPayable <= 0) {
    return newErrors;
  }

  if (paymentMethod === "wallet") {
    newErrors.wallet = "Wallet balance is not enough for full payment. Choose UPI, card, or net banking for the remaining amount.";
    return newErrors;
  }

  if (paymentMethod === "upi") {
    if (!upiId) {
      newErrors.upi = "UPI ID is required";
    } else if (!upiId.includes("@")) {
      newErrors.upi = "Invalid UPI ID format (e.g., user@bank)";
    }
  }

  if (paymentMethod === "card") {
    if (!cardData.number || cardData.number.replace(/\s/g, "").length !== 16) {
      newErrors.cardNumber = "Enter a valid 16-digit card number";
    }
    if (!cardData.expiry || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
      newErrors.expiry = "Use MM/YY format";
    }
    if (!cardData.cvv || cardData.cvv.length !== 3) {
      newErrors.cvv = "CVV must be 3 digits";
    }
    if (!cardData.name) {
      newErrors.name = "Name on card is required";
    }
  }

  return newErrors;
};

export const buildBookingPaymentPayload = ({
  paymentMethod,
  paymentSubOption,
  upiId,
  selectedUpiApp,
  cardType,
  cardData,
  netBankingProvider,
  walletApplied,
  externalPayable
}) => {
  const externalMethod = externalPayable > 0 ? paymentMethod : "wallet";
  const cardLabel =
    cardType === "debit"
      ? "Debit Card"
      : cardType === "rupay"
        ? "RuPay Card"
        : "Credit Card";
  const upiProvider =
    paymentSubOption === "apps"
      ? selectedUpiApp?.label || "Saved UPI App"
      : paymentSubOption === "qr"
        ? "UPI QR"
        : upiId;

  return {
    method: externalMethod,
    provider:
      externalMethod === "upi"
        ? upiProvider
        : externalMethod === "card"
          ? `${cardLabel} ending ${cardData.number.slice(-4)}`
          : externalMethod === "netbanking"
            ? netBankingProvider
            : "MakeMyTrip Wallet",
    subMethod: externalPayable > 0 ? paymentSubOption || "" : "wallet",
    walletAmountUsed: walletApplied,
    externalAmountPaid: externalPayable,
    externalPaymentMethod: externalPayable > 0 ? paymentMethod : "",
    externalPaymentOption: externalPayable > 0 ? paymentSubOption || "" : ""
  };
};
