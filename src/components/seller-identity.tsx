import Image from "next/image";

type SellerIdentityProps = {
  name: string;
  faculty?: string | null;
  compact?: boolean;
  avatarUrl?: string | null;
};

function getCampusBadge(faculty?: string | null): { label: "USU" | "POLMED"; className: string } {
  const lower = (faculty || "").toLowerCase();
  if (
    lower.includes("polmed") ||
    lower.includes("politeknik") ||
    lower.includes("niaga") ||
    lower.includes("akuntansi polmed") ||
    lower.includes("sipil polmed") ||
    lower.includes("mesin polmed") ||
    lower.includes("elektro polmed")
  ) {
    return { label: "POLMED", className: "badge-polmed" };
  }
  return { label: "USU", className: "badge-usu" };
}

export function SellerIdentity({ name, faculty, compact = false, avatarUrl }: SellerIdentityProps) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase("id-ID") || "?";

  const campus = getCampusBadge(faculty);

  return (
    <span className={`seller-identity${compact ? " seller-identity-compact" : ""}`}>
      <span className={`seller-avatar${avatarUrl ? " has-photo" : ""}`} aria-hidden="true">
        {avatarUrl ? <Image src={avatarUrl} alt="" fill sizes="42px" unoptimized /> : initials}
      </span>
      <span className="seller-identity-copy">
        <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span>{name}</span>
          <span
            className={campus.className}
            style={{ fontSize: "10px", padding: "2px 7px", lineHeight: 1.2 }}
          >
            {campus.label}
          </span>
        </strong>
        {faculty && <small>{faculty}</small>}
      </span>
    </span>
  );
}
