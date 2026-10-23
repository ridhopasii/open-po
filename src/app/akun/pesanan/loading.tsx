/* Loading skeleton untuk halaman pesanan */
export default function Loading() {
  return (
    <div className="page-shell">
      <div className="site-header" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="nav-wrap">
          <div className="skeleton skeleton-brand" />
          <div className="skeleton skeleton-btn" />
        </div>
      </div>
      <main className="account-page">
        <div className="skeleton" style={{ width: 90, height: 11, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: 180, height: 36, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: 340, height: 14, marginBottom: 28 }} />
        <div className="buyer-orders">
          {Array.from({ length: 4 }).map((_, i) => (
            <article key={i} className="buyer-order">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="skeleton" style={{ width: 90, height: 13 }} />
                <div className="skeleton" style={{ width: 110, height: 20, borderRadius: 20 }} />
              </div>
              <div className="skeleton" style={{ width: "70%", height: 20, marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                <div className="skeleton" style={{ width: 30, height: 30, borderRadius: "50%" }} />
                <div>
                  <div className="skeleton" style={{ width: 100, height: 11, marginBottom: 4 }} />
                  <div className="skeleton" style={{ width: 140, height: 9 }} />
                </div>
              </div>
              <div className="skeleton" style={{ width: "100%", height: 44, borderRadius: 8, marginBottom: 14 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="skeleton" style={{ width: "50%", height: 12 }} />
                <div className="skeleton" style={{ width: "70%", height: 12 }} />
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
