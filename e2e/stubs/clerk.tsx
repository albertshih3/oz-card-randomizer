import type { ReactNode } from "react";

const getToken = async () => "e2e-token";

export const ClerkProvider = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);
export const useAuth = () => ({
  isLoaded: true,
  isSignedIn: true,
  userId: "user_e2e",
  getToken,
});
export const useUser = () => ({
  isLoaded: true,
  isSignedIn: true,
  user: {
    id: "user_e2e",
    fullName: "E2E Admin",
    firstName: "E2E",
    lastName: "Admin",
    imageUrl: "",
    primaryEmailAddress: { emailAddress: "e2e@example.test" },
    publicMetadata: { approved: true },
  },
});
export const useClerk = () => ({
  openUserProfile: () => {},
  signOut: () => {},
});
export const useSignIn = () => ({
  isLoaded: true,
  signIn: null,
  setActive: null,
});
export const Show = ({
  when,
  children,
}: {
  when: string;
  children: ReactNode;
}) => (when === "signed-in" ? <>{children}</> : null);
export const UserButton = () => <span data-testid="user-button" />;
export const SignInButton = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);
