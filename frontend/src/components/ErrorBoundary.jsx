// components/ErrorBoundary.jsx
// Class component required — React error boundaries cannot be function components.
import { Component } from "react";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0A0908",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "rgba(20,17,12,0.9)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 24,
            padding: "2.5rem",
            textAlign: "center",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 60px rgba(248,113,113,0.04)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <AlertTriangle size={24} color="#f87171" />
          </div>

          <h2 style={{ color: "#F0E6D2", fontWeight: 700, fontSize: "1.15rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "rgba(180,195,230,0.5)", fontSize: "0.85rem", marginBottom: "0.5rem", lineHeight: 1.6 }}>
            An unexpected error occurred. Your data is safe — this is a display issue only.
          </p>
          {this.state.error?.message && (
            <p
              style={{
                color: "rgba(248,113,113,0.5)",
                fontSize: "0.75rem",
                fontFamily: "JetBrains Mono, monospace",
                background: "rgba(248,113,113,0.05)",
                border: "1px solid rgba(248,113,113,0.1)",
                borderRadius: 8,
                padding: "0.5rem 0.75rem",
                marginBottom: "1.5rem",
                textAlign: "left",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(212,168,86,0.2)",
                borderRadius: 12,
                padding: "0.6rem 1.2rem",
                color: "#F0E6D2",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={14} />
              Try again
            </button>
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "linear-gradient(135deg, #D4A856, #E8B894)",
                border: "none",
                borderRadius: 12,
                padding: "0.6rem 1.2rem",
                color: "#0A0908",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <LayoutDashboard size={14} />
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}