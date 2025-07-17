import { describe, it, expect, vi } from 'vitest';
import { useAuthActions } from '@convex-dev/auth/react';

const signInMock = vi.fn(async (_provider: string, args: { email: string; password: string; name: string; flow: string }) => {
  return { user: { ...args } };
});

vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({
    signIn: signInMock,
    signOut: vi.fn(),
  }),
}));

describe('signUp', () => {
  it('returns user record with provided name', async () => {
    const { signIn } = useAuthActions();
    const email = 'test@example.com';
    const password = 'StrongPass123';
    const name = 'Test User';

    const result = await signIn('password', { email, password, name, flow: 'signUp' });

    expect(signInMock).toHaveBeenCalledWith('password', { email, password, name, flow: 'signUp' });
    expect(result.user.name).toBe(name);
  });
});
