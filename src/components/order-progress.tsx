const stages = [
  { id: "pending", label: "Menunggu konfirmasi" },
  { id: "confirmed", label: "Dikonfirmasi" },
  { id: "ready", label: "Siap diambil" },
  { id: "picked_up", label: "Selesai" },
];

export function OrderProgress({ status }: { status: string }) {
  if (status === "cancelled") {
    return <p className="order-progress-cancelled">Pesanan dibatalkan</p>;
  }

  const activeIndex = stages.findIndex((stage) => stage.id === status);
  const current = stages[Math.max(activeIndex, 0)];

  return (
    <div className="order-progress" aria-label={`Status pesanan: ${current.label}`}>
      {stages.map((stage, index) => (
        <span className={`order-progress-step${index <= activeIndex ? " is-done" : ""}${index === activeIndex ? " is-current" : ""}`} key={stage.id}>
          <i aria-hidden="true">{index < activeIndex ? "✓" : index + 1}</i>
          <small>{stage.label}</small>
        </span>
      ))}
    </div>
  );
}
