import React, { useRef } from "react";
import "./TravelSearchShell.css";

export function TravelSearchShell({ columns, className = "", error = "", children }) {
  const shellClassName = ["travel-search-shell", className].filter(Boolean).join(" ");

  return (
    <div className={shellClassName}>
      <div className="travel-search-shell__grid" style={{ "--travel-search-columns": columns }}>
        {children}
      </div>
      {error ? <div className="travel-search-shell__error">{error}</div> : null}
    </div>
  );
}

export function TravelSearchField({ label, meta = "", className = "", icon = null, children, fieldRef = null }) {
  const containerRef = useRef(null);

  const handleFieldClick = (e) => {
    if (containerRef.current) {
      const input = containerRef.current.querySelector("input");
      if (input) {
        if (typeof input.showPicker === "function") {
          try {
            input.showPicker();
          } catch (err) {
            input.focus();
          }
        } else {
          input.focus();
        }
      }
    }
  };

  return (
    <div 
      ref={fieldRef}
      className={["travel-search-shell__field", className].filter(Boolean).join(" ")}
      onClick={handleFieldClick}
      style={{ cursor: "pointer" }}
    >
      <div className="travel-search-shell__label">
        <span>{label}</span>
        {meta ? <span className="travel-search-shell__meta">{meta}</span> : null}
      </div>
      <div className="travel-search-shell__body" ref={containerRef}>
        {children}
        {icon ? (
          <div className="travel-search-shell__icon">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TravelSearchSwapButton({ className = "", children = "SWAP", ...props }) {
  return (
    <button
      type="button"
      className={["travel-search-shell__swap", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export function TravelSearchButton({
  className = "",
  secondary = false,
  type = "button",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        "travel-search-shell__action",
        secondary ? "travel-search-shell__action--secondary" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export function TravelSearchActions({ className = "", children }) {
  return (
    <div className={["travel-search-shell__actions", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
