import Image from "next/image";

type SellerIdentityProps = {
  name: string;
  faculty?: string | null;
  compact?: boolean;
  avatarUrl?: string | null;
};

export function SellerIdentity({ name, faculty, compact = false, avatarUrl }: SellerIdentityProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("id-ID") || "?";

  return (
    <span className={`seller-identity${compact ? " seller-identity-compact" : ""}`}>
      <span className={`seller-avatar${avatarUrl ? " has-photo" : ""}`} aria-hidden="true">
        {avatarUrl ? <Image src={avatarUrl} alt="" fill sizes="42px" unoptimized /> : initials}
      </span>
      <span className="seller-identity-copy">
        <strong>{name}</strong>
        {faculty && <small>{faculty}</small>}
      </span>
    </span>
  );
}
