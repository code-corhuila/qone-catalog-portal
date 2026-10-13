import { useSyncExternalStore, type ReactNode } from "react";
import { session, type Role } from "shell/session";

// Authorization inside the portal (07-api/authentication.md, access matrix): the role comes
// from shell/session, never from the token. A wrong role sees a notice in place; the shell
// owns navigation and the sign-in.
export function useSessionUser() {
  return useSyncExternalStore(session.subscribe, () => session.user(), () => session.user());
}

export function RequireRole({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const user = useSessionUser();
  if (!user || !roles.includes(user.role)) {
    return (
      <p role="alert">You do not have permission for this section.</p>
    );
  }
  return <>{children}</>;
}
