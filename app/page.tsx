export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <section
        style={{
          maxWidth: "42rem",
          padding: "2rem",
          borderRadius: "1.5rem",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        <p
          style={{
            fontSize: "0.85rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#2563eb",
            marginBottom: "0.75rem",
          }}
        >
          FDF
        </p>
        <h1 style={{ margin: "0 0 1rem", fontSize: "clamp(2rem, 6vw, 3.5rem)" }}>
          Auth and user foundation is ready.
        </h1>
        <p style={{ margin: 0, lineHeight: 1.7, color: "#334155" }}>
          This starter wires Next.js, Drizzle, Neon, phone OTP auth, unified
          error handling, and reusable Express adapters into a single
          TypeScript codebase.
        </p>
      </section>
    </main>
  );
}
