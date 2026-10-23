import { MarketHome } from "@/components/market-home";
import { SiteHeader } from "@/components/site-header";
import { getOpenBatches } from "@/lib/marketplace";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  const { batches } = await getOpenBatches();

  return (
    <div className="page-shell">
      <SiteHeader />
      <MarketHome batches={batches} />
    </div>
  );
}
