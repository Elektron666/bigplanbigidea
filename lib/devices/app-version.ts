// The build the server runs, as a short text a screen can compare with its own.
// On Vercel every deployment has its own commit; locally the value is fixed.
export function appVersion(): string {
  return (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "yerel").slice(0, 12);
}
