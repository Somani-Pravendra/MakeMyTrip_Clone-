import React from "react";
import { formatCurrency } from "../../utils/currency";

const PAYMENT_METHODS = [
    { id: "upi", label: "UPI / QR", icon: "UPI" },
    { id: "card", label: "Credit/Debit Card", icon: "CARD" },
    { id: "netbanking", label: "Net Banking", icon: "BANK" },
    { id: "wallet", label: "MakeMyTrip Wallet (Refund Amount)", icon: "WALLET" }
];

const DEFAULT_SUB_OPTIONS = {
    upi: "upiId",
    card: "credit",
    netbanking: "hdfc",
    wallet: "balance"
};

const CARD_OPTIONS = [
    { id: "credit", title: "Credit Card", note: "Use Visa, Mastercard, or Amex credit cards.", accent: "Rewards and EMI friendly" },
    { id: "debit", title: "Debit Card", note: "Pay directly from your linked savings or current account.", accent: "Instant bank debit" },
    { id: "rupay", title: "RuPay Card", note: "Domestic RuPay cards supported with secure verification.", accent: "RuPay network support" }
];

const UPI_OPTIONS = [
    { id: "upiId", title: "Enter UPI ID", note: "Type your VPA and approve the collect request." },
    { id: "qr", title: "Scan QR Code", note: "Scan the code from any UPI app to complete payment." },
    { id: "apps", title: "Saved UPI Apps", note: "Launch a saved UPI app in one tap." }
];

const SAVED_UPI_APPS = [
    { id: "gpay", label: "Google Pay", handle: "paywithgpay@okaxis" },
    { id: "phonepe", label: "PhonePe", handle: "paywithphonepe@ybl" },
    { id: "paytm", label: "Paytm", handle: "paywithpaytm@paytm" },
    { id: "bhim", label: "BHIM UPI", handle: "paywithbhim@upi" }
];

const BANK_OPTIONS = [
    { id: "hdfc", label: "HDFC Bank" },
    { id: "sbi", label: "State Bank of India" },
    { id: "icici", label: "ICICI Bank" },
    { id: "axis", label: "Axis Bank" },
    { id: "kotak", label: "Kotak Mahindra Bank" },
    { id: "pnb", label: "Punjab National Bank" }
];

const getCardMeta = (cardType) => CARD_OPTIONS.find((option) => option.id === cardType) || CARD_OPTIONS[0];
const getUpiMeta = (paymentSubOption) => UPI_OPTIONS.find((option) => option.id === paymentSubOption) || UPI_OPTIONS[0];
const getSelectedBank = (provider) => BANK_OPTIONS.find((bank) => bank.label === provider || bank.id === provider) || BANK_OPTIONS[0];

const PaymentMethodSection = ({
    paymentMethod,
    setPaymentMethod,
    paymentSubOption,
    setPaymentSubOption,
    netBankingProvider,
    setNetBankingProvider,
    upiId,
    setUpiId,
    selectedUpiApp,
    setSelectedUpiApp,
    cardType,
    setCardType,
    cardData,
    setCardData,
    errors,
    walletBalance = 0,
    totalAmount = 0
}) => {
    const activeCardMeta = getCardMeta(cardType);
    const activeUpiMeta = getUpiMeta(paymentSubOption);
    const selectedBank = getSelectedBank(netBankingProvider);
    const walletApplied = Math.min(walletBalance, totalAmount);
    const amountLeftToPay = Math.max(0, totalAmount - walletBalance);
    const balanceLeftInWallet = Math.max(0, walletBalance - totalAmount);

    const handleMethodSelect = (methodId) => {
        setPaymentMethod(methodId);
        setPaymentSubOption(DEFAULT_SUB_OPTIONS[methodId]);

        if (methodId === "netbanking") {
            const defaultBank = BANK_OPTIONS[0];
            setNetBankingProvider(defaultBank.label);
        }

        if (methodId !== "upi") {
            setSelectedUpiApp(null);
        }
    };

    const handleUpiModeChange = (value) => {
        setPaymentSubOption(value);
        if (value !== "apps") {
            setSelectedUpiApp(null);
        }
    };

    const updateCardField = (field, value) => {
        setCardData({ ...cardData, [field]: value });
    };

    return (
        <div className="payment-unified-grid">
            <div className="payment-method-tabs">
                {PAYMENT_METHODS.map((method) => (
                    <button
                        key={method.id}
                        type="button"
                        onClick={() => handleMethodSelect(method.id)}
                        className={`payment-tab-item-v4 ${paymentMethod === method.id ? "active" : ""}`}
                    >
                        <span>{method.icon}</span>
                        <span className="tab-label">{method.label}</span>
                    </button>
                ))}
            </div>

            <div className="payment-details-pane">
                {paymentMethod === "upi" && (
                    <div className="payment-detail-stack">
                        <div className="payment-pane-header">
                            <div>
                                <h4 className="white-bold">UPI Payment</h4>
                                <p className="label-text-dim-large no-margin">Pay by UPI ID, QR code, or your saved UPI apps.</p>
                            </div>
                            <div className="payment-amount-pill">Payable: {formatCurrency(totalAmount)}</div>
                        </div>

                        <div className="payment-subpanel">
                            <div className="payment-subpanel-head">
                                <h5>UPI Mode</h5>
                                <p>Select how you want to complete your UPI payment.</p>
                            </div>

                            <div className="form-field-v2">
                                <label>Choose UPI Option</label>
                                <select
                                    className="elite-select"
                                    value={paymentSubOption}
                                    onChange={(event) => handleUpiModeChange(event.target.value)}
                                >
                                    {UPI_OPTIONS.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="payment-inline-banner mt-20">
                                <strong>{activeUpiMeta.title}</strong>
                                <span>{activeUpiMeta.note}</span>
                            </div>

                            {paymentSubOption === "upiId" && (
                                <div className="form-field-v2 mt-20">
                                    <label>VPA / UPI ID</label>
                                    <input
                                        type="text"
                                        placeholder="username@bank"
                                        value={upiId}
                                        onChange={(event) => setUpiId(event.target.value)}
                                        className="elite-input"
                                    />
                                    {errors.upi && <p className="error-text-elite">{errors.upi}</p>}
                                </div>
                            )}

                            {paymentSubOption === "qr" && (
                                <div className="payment-qr-shell mt-20">
                                    <div className="payment-qr-code">
                                        <span>Scan</span>
                                        <strong>UPI QR</strong>
                                        <p>{formatCurrency(totalAmount)}</p>
                                    </div>
                                    <div className="payment-qr-copy">
                                        <div className="payment-inline-note">
                                            Scan this QR from Google Pay, PhonePe, Paytm, BHIM, or any UPI app and complete the payment request.
                                        </div>
                                        <div className="payment-qr-meta">
                                            <div className="impact-row">
                                                <span>UPI Merchant</span>
                                                <strong>MakeMyTrip Secure</strong>
                                            </div>
                                            <div className="impact-row">
                                                <span>Transaction Type</span>
                                                <strong>QR Collect</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {paymentSubOption === "apps" && (
                                <>
                                    <div className="form-field-v2 mt-20">
                                        <label>Saved UPI App</label>
                                        <select
                                            className="elite-select"
                                            value={selectedUpiApp?.id || ""}
                                            onChange={(event) => {
                                                const app = SAVED_UPI_APPS.find((item) => item.id === event.target.value) || null;
                                                setSelectedUpiApp(app);
                                                setUpiId(app?.handle || "");
                                            }}
                                        >
                                            <option value="">Select an app</option>
                                            {SAVED_UPI_APPS.map((app) => (
                                                <option key={app.id} value={app.id}>
                                                    {app.label}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.savedUpiApp && <p className="error-text-elite">{errors.savedUpiApp}</p>}
                                    </div>

                                    <div className="payment-app-grid mt-20">
                                        {SAVED_UPI_APPS.map((app) => (
                                            <button
                                                key={app.id}
                                                type="button"
                                                className={`payment-app-card ${selectedUpiApp?.id === app.id ? "active" : ""}`}
                                                onClick={() => {
                                                    setSelectedUpiApp(app);
                                                    setUpiId(app.handle);
                                                }}
                                            >
                                                <strong>{app.label}</strong>
                                                <span>{app.handle}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {paymentMethod === "card" && (
                    <div className="payment-detail-stack">
                        <div className="payment-pane-header">
                            <div>
                                <h4 className="white-bold">Credit / Debit Card</h4>
                                <p className="label-text-dim-large no-margin">Select card type and fill only the relevant card details.</p>
                            </div>
                            <div className="payment-amount-pill">Payable: {formatCurrency(totalAmount)}</div>
                        </div>

                        <div className="payment-subpanel">
                            <div className="payment-subpanel-head">
                                <h5>Card Type</h5>
                                <p>After selecting the card type, the payment form updates automatically.</p>
                            </div>

                            <div className="form-field-v2">
                                <label>Select Card Type</label>
                                <select
                                    className="elite-select"
                                    value={cardType}
                                    onChange={(event) => {
                                        setCardType(event.target.value);
                                        setPaymentSubOption(event.target.value);
                                    }}
                                >
                                    {CARD_OPTIONS.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="payment-card-preview mt-20">
                                <div className="payment-card-preview__badge">{activeCardMeta.title}</div>
                                <strong>{activeCardMeta.accent}</strong>
                                <span>{activeCardMeta.note}</span>
                            </div>

                            <div className="card-form-grid mt-20">
                                <div className="form-field-v2">
                                    <label>{activeCardMeta.title.toUpperCase()} Number</label>
                                    <input
                                        type="text"
                                        placeholder="XXXX XXXX XXXX XXXX"
                                        value={cardData.number}
                                        onChange={(event) => updateCardField("number", event.target.value)}
                                        className="elite-input"
                                    />
                                    {errors.cardNumber && <p className="error-text-elite">{errors.cardNumber}</p>}
                                </div>

                                <div className="elite-form-row double mt-20">
                                    <div className="form-field-v2">
                                        <label>Expiry (MM/YY)</label>
                                        <input
                                            type="text"
                                            placeholder="MM/YY"
                                            value={cardData.expiry}
                                            onChange={(event) => updateCardField("expiry", event.target.value)}
                                            className="elite-input"
                                        />
                                        {errors.expiry && <p className="error-text-elite">{errors.expiry}</p>}
                                    </div>
                                    <div className="form-field-v2">
                                        <label>{cardType === "rupay" ? "OTP / CVV" : "CVV"}</label>
                                        <input
                                            type="password"
                                            placeholder={cardType === "rupay" ? "OTP / CVV" : "123"}
                                            value={cardData.cvv}
                                            onChange={(event) => updateCardField("cvv", event.target.value)}
                                            className="elite-input"
                                        />
                                        {errors.cvv && <p className="error-text-elite">{errors.cvv}</p>}
                                    </div>
                                </div>

                                <div className="form-field-v2 mt-20">
                                    <label>Name on Card</label>
                                    <input
                                        type="text"
                                        placeholder="Full name as on card"
                                        value={cardData.name}
                                        onChange={(event) => updateCardField("name", event.target.value)}
                                        className="elite-input"
                                    />
                                    {errors.name && <p className="error-text-elite">{errors.name}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {paymentMethod === "netbanking" && (
                    <div className="payment-detail-stack">
                        <div className="payment-pane-header">
                            <div>
                                <h4 className="white-bold">Net Banking</h4>
                                <p className="label-text-dim-large no-margin">Choose your bank from the dropdown or quick bank tiles.</p>
                            </div>
                            <div className="payment-amount-pill">Payable: {formatCurrency(totalAmount)}</div>
                        </div>

                        <div className="payment-subpanel">
                            <div className="payment-subpanel-head">
                                <h5>Bank Selection</h5>
                                <p>Select HDFC, SBI, ICICI, Axis, or any supported bank to continue.</p>
                            </div>

                            <div className="form-field-v2">
                                <label>Select Bank</label>
                                <select
                                    className="elite-select"
                                    value={selectedBank.id}
                                    onChange={(event) => {
                                        const bank = BANK_OPTIONS.find((item) => item.id === event.target.value) || BANK_OPTIONS[0];
                                        setNetBankingProvider(bank.label);
                                        setPaymentSubOption(bank.id);
                                    }}
                                >
                                    {BANK_OPTIONS.map((bank) => (
                                        <option key={bank.id} value={bank.id}>
                                            {bank.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="payment-bank-grid mt-20">
                                {BANK_OPTIONS.map((bank) => (
                                    <button
                                        key={bank.id}
                                        type="button"
                                        className={`payment-bank-card ${selectedBank.id === bank.id ? "active" : ""}`}
                                        onClick={() => {
                                            setNetBankingProvider(bank.label);
                                            setPaymentSubOption(bank.id);
                                        }}
                                    >
                                        <strong>{bank.label}</strong>
                                        <span>Secure Bank Login</span>
                                    </button>
                                ))}
                            </div>
                            {errors.netbanking && <p className="error-text-elite mt-10">{errors.netbanking}</p>}
                        </div>
                    </div>
                )}

                {paymentMethod === "wallet" && (
                    <div className="payment-detail-stack">
                        <div className="payment-pane-header">
                            <div>
                                <h4 className="white-bold">MakeMyTrip Wallet</h4>
                                <p className="label-text-dim-large no-margin">Use your accumulated refund amount to pay for this booking.</p>
                            </div>
                        </div>

                        <div className="payment-subpanel">
                            <div className="wallet-pane-content">
                                <div className="wallet-balance-hero">
                                    <div className="wallet-hero-icon">WLT</div>
                                    <div>
                                        <p className="label-text-dim">Available Balance</p>
                                        <h3 className="wallet-balance-val">{formatCurrency(walletBalance)}</h3>
                                    </div>
                                </div>

                                <div className="wallet-impact-box">
                                    <div className="impact-row">
                                        <span>Total Booking Fare</span>
                                        <strong>{formatCurrency(totalAmount)}</strong>
                                    </div>
                                    <div className="impact-row highlight">
                                        <span>Wallet Applied</span>
                                        <strong>- {formatCurrency(walletApplied)}</strong>
                                    </div>
                                    <div className="impact-divider" />
                                    <div className="impact-row final">
                                        <span>Amount Left to Pay</span>
                                        <strong>{formatCurrency(amountLeftToPay)}</strong>
                                    </div>
                                    <div className="impact-row wallet-balance-row">
                                        <span>Balance Left in Wallet</span>
                                        <strong>{formatCurrency(balanceLeftInWallet)}</strong>
                                    </div>
                                </div>

                                {walletBalance < totalAmount && (
                                    <p className="payment-state-note payment-state-note--error">
                                        Insufficient balance for full payment. Please use UPI, Card, or Net Banking if you need to cover the remaining amount.
                                    </p>
                                )}

                                {walletBalance >= totalAmount && (
                                    <p className="payment-state-note payment-state-note--success">
                                        Your wallet balance is sufficient. You can pay the full amount instantly.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export { PaymentMethodSection };
export default PaymentMethodSection;
