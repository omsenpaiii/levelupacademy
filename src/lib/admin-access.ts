/** Only trusted, verified auth identities may match this server-side configuration. */
export function isApprovedAdmin(
  email: string,
  verified: boolean,
  allowlist = "",
) {
  return (
    verified === true &&
    allowlist
      .split(",")
      .some(
        (approved) =>
          approved.trim().toLowerCase() === email.trim().toLowerCase() &&
          approved.trim() !== "",
      )
  );
}
