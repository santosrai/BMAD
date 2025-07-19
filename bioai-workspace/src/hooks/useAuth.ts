import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useAuth() {
  try {
    const { isLoaded, isSignedIn, signOut } = useClerkAuth();
    const { user } = useUser();
    
    // Get user data from Convex (if needed for additional user data)
    const convexUser = useQuery(api.users.current);

    return {
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn,
      user: user || convexUser,
      signOut,
    };
  } catch (error) {
    console.error('Error in useAuth hook:', error);
    // Return fallback values if Clerk is not properly initialized
    return {
      isLoading: true,
      isAuthenticated: false,
      user: null,
      signOut: () => {},
    };
  }
}

export function useCurrentUser() {
  try {
    const { user } = useUser();
    return user;
  } catch (error) {
    console.error('Error in useCurrentUser hook:', error);
    return null;
  }
}

export function useUserProfile() {
  try {
    const { user } = useUser();
    return user;
  } catch (error) {
    console.error('Error in useUserProfile hook:', error);
    return null;
  }
}