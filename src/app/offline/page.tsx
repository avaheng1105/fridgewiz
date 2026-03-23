export default function OfflinePage() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60dvh",
      textAlign: "center",
      gap: "16px",
    }}>
      <span style={{ fontSize: "4rem" }}>📡</span>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
        You&apos;re Offline
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "260px", lineHeight: 1.6 }}>
        No internet connection detected. Your cached data is still available.
      </p>
      <a
        href="/"
        style={{
          marginTop: "8px",
          padding: "12px 28px",
          background: "linear-gradient(135deg, var(--brand-green), var(--brand-green-dark))",
          color: "#fff",
          borderRadius: "9999px",
          fontWeight: 600,
          fontSize: "0.9rem",
        }}
      >
        Back to Home
      </a>
    </div>
  );
}
