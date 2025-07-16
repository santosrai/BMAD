import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";


export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const user = useQuery(api.users.current);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}

export function useCurrentUser() {
  return useQuery(api.users.current);
}

export function useUserProfile() {
  return useQuery(api.users.getProfile);
}