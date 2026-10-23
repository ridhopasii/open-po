/* Loading skeleton untuk halaman penjual */
export default function Loading() {
  return (
    <div className="page-shell">
      <div className="site-header" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="nav-wrap">
          <div className="skeleton skeleton-brand" />
          <div className="skeleton skeleton-btn" />
        </div>
      </div>
      <main className="seller-page">
        <div className="skeleton" style={{ width: 100, height: 11, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: 260, height: 36, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: 420, height: 14, marginBottom: 32 }} />

        {/* Batch skeleton */}
        <section className="seller-batches">
          <div className="skeleton" style={{ width: 140, height: 20, marginBottom: 16 }} />
          {Array.from({ length: 2 }).map((_, i) => (
            <article key={i} className="seller-batch">
              <div className="seller-batch-heading">
                <div>
                  <div className="skeleton" style={{ width: 120, height: 11, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: 200, height: 22, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: 300, height: 13 }} />
                </div>
                <div className="skeleton" style={{ width: 90, height: 40, borderRadius: 6 }} />
              </div>
              <div className="skeleton" style={{ width: "100%", height: 80, borderRadius: 8, marginTop: 16 }} />
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
