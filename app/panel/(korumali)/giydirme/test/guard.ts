import "server-only";
import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/auth/panel";
import { can } from "@/lib/auth/roles";

/** The test bench is the yönetici's (a run is paid for); others get "not found". */
export async function requirePermissionPage() {
  const user = await requirePanelUser();
  if (!can(user.role, "maliyet")) notFound();
  return user;
}
