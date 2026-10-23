/* Loading skeleton untuk etalase utama */
export default function Loading() {
  return (
    <div className="page-shell">
      <div className="site-header skeleton-header">
        <div className="nav-wrap">
          <div className="skeleton skeleton-brand" />
          <div className="skeleton skeleton-nav" />
          <div className="skeleton skeleton-btn" />
        </div>
      </div>
      <main className="shop-home">
        <section className="shop-toolbar">
          <div className="shop-title-row">
            <div>
              <div className="skeleton" style={{ width: 120, height: 28, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 180, height: 14 }} />
            </div>
          </div>
          <div className="skeleton" style={{ width: "100%", height: 46, borderRadius: 10, marginTop: 16 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: 70, height: 34, borderRadius: 20 }} />
            ))}
          </div>
        </section>
        <section className="shop-grid" style={{ marginTop: 24 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="shop-card">
              <div className="skeleton" style={{ width: "100%", aspectRatio: "4/3", borderRadius: "9px 9px 0 0" }} />
              <div style={{ padding: "13px 14px 14px", display: "grid", gap: 8 }}>
                <div className="skeleton" style={{ width: 60, height: 12 }} />
                <div className="skeleton" style={{ width: "80%", height: 16 }} />
                <div className="skeleton" style={{ width: "40%", height: 16 }} />
                <div className="skeleton" style={{ width: "90%", height: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
