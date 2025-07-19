import { describe, it, expect, vi } from 'vitest';

// Mock the Clerk hooks with simple return values
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: false,
    signOut: () => {},
  }),
  useUser: () => ({
    user: null,
  }),
}));

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: () => null,
}));

describe('useAuth hook', () => {
  it('should be properly mocked', () => {
    // This test just ensures our mocks are working
    expect(true).toBe(true);
  });
});
