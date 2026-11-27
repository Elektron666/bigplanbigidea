import { requireShopUser } from "@/lib/auth/shop";
import { getLeads } from "@/lib/musteri/store";
import { ShopLeads } from "@/components/magaza/ShopLeads";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "İlgilenen müşteriler" };

// Customers who left their name and phone for the shop (job 13), with their
// consent. The shop's own: ORMEN does not see them (not in the support view either).
export default async function ShopLeadsPage() {
  const user = await requireShopUser();
  const store = getLeads();
  const [leads, retention] = await Promise.all([store.list(user), store.retention(user.firmId)]);
  return (
    <>
      <PageHeader title="İlgilenen müşteriler" eyebrow={`${leads.length} kayıt`} />
      <ShopLeads leads={leads} retention={retention} readOnly={!!user.support} />
    </>
  );
}
