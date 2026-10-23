/* Loading skeleton untuk halaman detail PO */
export default function Loading() {
  return (
    <div className="page-shell">
      <div className="site-header" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="nav-wrap">
          <div className="skeleton skeleton-brand" />
          <div className="skeleton skeleton-btn" />
        </div>
      </div>
      <main className="detail-page">
        <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 24 }} />
        <div className="detail-grid">
          <article className="detail-copy">
            <div className="skeleton" style={{ width: 120, height: 11, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: "75%", height: 42, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
              <div className="skeleton" style={{ width: 42, height: 42, borderRadius: "50%" }} />
              <div>
                <div className="skeleton" style={{ width: 110, height: 12, marginBottom: 5 }} />
                <div className="skeleton" style={{ width: 160, height: 10 }} />
              </div>
            </div>
            <div className="skeleton" style={{ width: "100%", height: 80, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: 120, height: 32, marginBottom: 20 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ width: 80, height: 10, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: 120, height: 16 }} />
                </div>
              ))}
            </div>
          </article>
          <aside>
            <div className="order-card">
              <div className="skeleton" style={{ width: 80, height: 11, marginBottom: 10 }} />
              <div className="skeleton" style={{ width: 150, height: 24, marginBottom: 20 }} />
              <div style={{ display: "grid", gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ width: "100%", height: 50, borderRadius: 8 }} />
                ))}
              </div>
              <div className="skeleton" style={{ width: "100%", height: 48, borderRadius: 7, marginTop: 16 }} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
