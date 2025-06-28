import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    rpc: vi.fn()
  }
}));

// Mock security logger
vi.mock('../utils/securityLogger', () => ({
  logSecurityEvent: vi.fn()
}));

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('should handle sign in correctly', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ data: {}, error: null });
    const { supabase } = await import('../lib/supabase');
    supabase.auth.signInWithPassword = mockSignIn;
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });
    
    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
  });

  it('should handle sign out correctly', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });
    const { supabase } = await import('../lib/supabase');
    supabase.auth.signOut = mockSignOut;
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signOut();
    });
    
    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('should validate token limits correctly', async () => {
    const { result } = renderHook(() => useAuth());
    
    // Set up a mock user
    act(() => {
      // @ts-ignore - we're mocking the user
      result.current.user = {
        id: 'test-id',
        subscription_tier: 'free',
        tokens_remaining: 50000,
        daily_tokens_used: 50000,
        monthly_tokens_used: 500000,
        monthly_reset_date: 1
      };
    });
    
    // Test token validation
    await act(async () => {
      const { error } = await result.current.updateTokens(10000);
      expect(error?.message).toContain('Daily token limit reached');
    });
  });

  it('should handle export limits correctly', async () => {
    const { result } = renderHook(() => useAuth());
    
    // Set up a mock user
    act(() => {
      // @ts-ignore - we're mocking the user
      result.current.user = {
        id: 'test-id',
        subscription_tier: 'free',
        monthly_exports_used: 5
      };
    });
    
    // Test export validation
    await act(async () => {
      const { error } = await result.current.updateExports(1);
      expect(error?.message).toContain('Monthly export limit reached');
    });
  });
});