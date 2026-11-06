/** Mirrors isApproved in api/_auth.ts. Controls what the UI shows, nothing more. */
export function isApprovedUser(
  user: { publicMetadata?: unknown } | null | undefined,
): boolean {
  const metadata = user?.publicMetadata as { approved?: unknown } | undefined;
  return metadata?.approved === true;
}
