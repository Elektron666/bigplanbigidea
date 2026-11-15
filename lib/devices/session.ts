import "server-only";
import { cookies } from "next/headers";
import { getCentral, type ShopState } from "@/lib/central/store";
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE, DEVICE_TOKEN, type Device } from "./pairing";

// Which screen is asking (Showroom package, job 1). The screen holds a long
// random secret in a cookie script cannot read; the shop is always derived
// from that secret on the server. A screen never says which shop it belongs
// to, so it cannot ask for another shop's content.

export async function currentDevice(): Promise<{ device: Device; shop: ShopState } | null> {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!token || !DEVICE_TOKEN.test(token)) return null;
  const central = getCentral();
  const device = await central.deviceByToken(token);
  if (!device) return null;
  const shop = await central.getShopState(device.firmId);
  return shop ? { device, shop } : null;
}

export async function rememberDevice(token: string): Promise<void> {
  (await cookies()).set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}

export async function forgetDevice(): Promise<void> {
  (await cookies()).delete(DEVICE_COOKIE);
}
