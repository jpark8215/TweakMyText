import { useState, useEffect, useCallback, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { logSecurityEvent } from '../utils/securityLogger';
import { secureLog, AppError, handleError } from '../utils/errorHandler';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const authSubscriptionRef = useRef<any>(null);

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    mountedRef.current = false;
    if (authSubscriptionRef.current) {
      authSubscriptionRef.current.unsubscribe();
      authSubscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Get initial session with better error handling
    const initializeAuth = async () => {
      try {
        secureLog('Initializing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          secureLog('Session initialization error:', { error: error.message });
          if (mountedRef.current) {
            setLoading(false);
          }
          return;
        }
        
        if (session?.user && mountedRef.current) {
          secureLog('Found existing session for user');
          await fetchUserProfile(session.user);
        } else {
          secureLog('No existing session found');
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      } catch (error) {
        const appError = handleError(error, 'auth_initialization');
        secureLog('Auth initialization failed:', { error: appError.message });
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes with improved error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        secureLog('Auth state change:', { event });
        
        try {
          if (session?.user) {
            await fetchUserProfile(session.user);
            
            // Log authentication events
            if (event === 'SIGNED_IN') {
              await logSecurityEvent({
                userId: session.user.id,
                action: 'user_sign_in',
                resource: 'authentication',
                allowed: true,
                subscriptionTier: 'unknown', // Will be updated after profile fetch
              });
            }
          } else {
            if (event === 'SIGNED_OUT' && user) {
              await logSecurityEvent({
                userId: user.id,
                action: 'user_sign_out',
                resource: 'authentication',
                allowed: true,
                subscriptionTier: user.subscription_tier,
              });
            }
            
            if (mountedRef.current) {
              setUser(null);
              setLoading(false);
            }
          }
        } catch (error) {
          const appError = handleError(error, 'auth_state_change');
          secureLog('Auth state change error:', { error: appError.message });
          if (mountedRef.current) {
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    authSubscriptionRef.current = subscription;

    return cleanup;
  }, []); // Remove user dependency to prevent infinite loops

  // Helper function to get expected token amounts for each tier
  const getExpectedTokensForTier = useCallback((tier: string): { daily: number | null, monthly: number } => {
    const tierLimits = {
      free: { daily: 100000, monthly: 1000000 },
      pro: { daily: null, monthly: 5000000 },
      premium: { daily: null, monthly: 10000000 }
    } as const;
    
    const limits = tierLimits[tier as keyof typeof tierLimits];
    if (!limits) {
      secureLog('Invalid subscription tier:', { tier });
      return tierLimits.free; // Safe fallback
    }
    
    return limits;
  }, []);

  const fetchUserProfile = useCallback(async (authUser: SupabaseUser) => {
    if (!mountedRef.current) return;
    
    try {
      secureLog('Fetching user profile');
      
      // Reset daily/monthly tokens if needed (with error handling)
      try {
        await supabase.rpc('reset_daily_tokens');
        await supabase.rpc('reset_monthly_tokens');
      } catch (rpcError) {
        secureLog('Token reset functions not available:', { error: rpcError });
        // Don't fail the entire auth process if token reset fails
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        secureLog('User profile not found, creating new one...');
        // User doesn't exist, create new profile with correct free tier limits
        const newUser = {
          id: authUser.id,
          email: authUser.email!,
          subscription_tier: 'free' as const,
          tokens_remaining: 100000, // 100K daily limit for free tier
          daily_tokens_used: 0,
          monthly_tokens_used: 0,
          monthly_exports_used: 0,
          last_token_reset: new Date().toISOString().split('T')[0],
          monthly_reset_date: new Date().getDate(),
          billing_start_date: null, // No billing for free users
          is_admin: false, // NEW: Default to non-admin
        };

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();

        if (createError) {
          throw new AppError('Failed to create user profile', 'USER_CREATION_FAILED', 'critical');
        }
        
        const userProfile = {
          ...createdUser,
          created_at: new Date(createdUser.created_at),
          subscription_expires_at: createdUser.subscription_expires_at 
            ? new Date(createdUser.subscription_expires_at) 
            : undefined,
          billing_start_date: createdUser.billing_start_date 
            ? new Date(createdUser.billing_start_date) 
            : undefined,
        };
        
        if (mountedRef.current) {
          setUser(userProfile);
        }
        secureLog('User profile created successfully');

        // Log new user creation
        await logSecurityEvent({
          userId: userProfile.id,
          action: 'user_profile_created',
          resource: 'user_management',
          allowed: true,
          subscriptionTier: userProfile.subscription_tier,
        });
      } else if (error) {
        throw new AppError(`Database error: ${error.message}`, 'DATABASE_ERROR', 'high');
      } else {
        // Validate and fix token amounts based on subscription tier
        let correctedData = { ...data };
        let needsUpdate = false;

        // Check if tokens_remaining is correct for the subscription tier
        const expectedTokens = getExpectedTokensForTier(data.subscription_tier);
        if (data.tokens_remaining > expectedTokens.monthly) {
          secureLog('Correcting tokens for user:', { 
            tier: data.subscription_tier,
            current: data.tokens_remaining,
            expected: expectedTokens.daily || expectedTokens.monthly
          });
          correctedData.tokens_remaining = expectedTokens.daily || expectedTokens.monthly;
          needsUpdate = true;
        }

        // Update database if corrections are needed
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              tokens_remaining: correctedData.tokens_remaining,
            })
            .eq('id', authUser.id);

          if (updateError) {
            secureLog('Failed to update corrected user data:', { error: updateError.message });
          } else {
            secureLog('User token amounts corrected in database');
          }
        }

        const userProfile = {
          ...correctedData,
          created_at: new Date(correctedData.created_at),
          subscription_expires_at: correctedData.subscription_expires_at 
            ? new Date(correctedData.subscription_expires_at) 
            : undefined,
          billing_start_date: correctedData.billing_start_date 
            ? new Date(correctedData.billing_start_date) 
            : undefined,
        };
        
        if (mountedRef.current) {
          setUser(userProfile);
        }
        secureLog('User profile loaded successfully');
      }
    } catch (error) {
      const appError = handleError(error, 'fetch_user_profile');
      secureLog('Error in fetchUserProfile:', { error: appError.message });
      
      // Log profile fetch error
      await logSecurityEvent({
        userId: authUser.id,
        action: 'user_profile_fetch_error',
        resource: 'user_management',
        allowed: false,
        subscriptionTier: 'unknown',
        errorMessage: `Profile fetch failed: ${appError.message}`,
      });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [getExpectedTokensForTier]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      secureLog('Attempting sign in');
      
      // Clear any existing session first
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      secureLog('Sign in response:', { 
        success: !error, 
        hasUser: !!data?.user
      });
      
      if (error) {
        // Enhanced error handling
        let userFriendlyMessage = error.message;
        
        switch (error.message) {
          case 'Invalid login credentials':
            userFriendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'Email not confirmed':
            userFriendlyMessage = 'Please check your email and click the confirmation link before signing in.';
            break;
          case 'Too many requests':
            userFriendlyMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
            break;
          case 'User not found':
            userFriendlyMessage = 'No account found with this email address.';
            break;
        }
        
        // Log failed sign-in attempt
        await logSecurityEvent({
          userId: 'unknown',
          action: 'sign_in_failed',
          resource: 'authentication',
          allowed: false,
          subscriptionTier: 'unknown',
          errorMessage: error.message,
        });
        
        return { error: { ...error, message: userFriendlyMessage } };
      }
      
      return { error: null };
    } catch (error: any) {
      const appError = handleError(error, 'sign_in');
      secureLog('Sign in exception:', { error: appError.message });
      return { 
        error: { 
          message: 'Network error. Please check your connection and try again.' 
        } 
      };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      secureLog('Attempting sign up');
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation for now
        }
      });
      
      secureLog('Sign up response:', { 
        success: !error, 
        hasUser: !!data?.user
      });
      
      if (error) {
        // Enhanced error handling
        let userFriendlyMessage = error.message;
        
        switch (error.message) {
          case 'User already registered':
            userFriendlyMessage = 'An account with this email already exists. Please sign in instead.';
            break;
          case 'Password should be at least 6 characters':
            userFriendlyMessage = 'Password must be at least 6 characters long.';
            break;
          case 'Unable to validate email address: invalid format':
            userFriendlyMessage = 'Please enter a valid email address.';
            break;
        }
        
        // Log failed sign-up attempt
        await logSecurityEvent({
          userId: 'unknown',
          action: 'sign_up_failed',
          resource: 'authentication',
          allowed: false,
          subscriptionTier: 'unknown',
          errorMessage: error.message,
        });
        
        return { error: { ...error, message: userFriendlyMessage } };
      }
      
      return { error: null };
    } catch (error: any) {
      const appError = handleError(error, 'sign_up');
      secureLog('Sign up exception:', { error: appError.message });
      return { 
        error: { 
          message: 'Network error. Please check your connection and try again.' 
        } 
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      secureLog('Starting sign out process...');
      
      // Log sign out attempt before clearing user state
      if (user) {
        await logSecurityEvent({
          userId: user.id,
          action: 'user_sign_out_attempt',
          resource: 'authentication',
          allowed: true,
          subscriptionTier: user.subscription_tier,
        });
      }

      // Clear user state immediately to prevent UI issues
      if (mountedRef.current) {
        setUser(null);
        setLoading(false);
      }

      // Then perform the actual sign out
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        secureLog('Sign out error:', { error: error.message });
        // If sign out fails, we still want to clear local state
        // The user will be redirected to sign in anyway
        return { error: null }; // Don't return the error to prevent UI issues
      }

      secureLog('Sign out completed successfully');
      return { error: null };
    } catch (error: any) {
      const appError = handleError(error, 'sign_out');
      secureLog('Sign out exception:', { error: appError.message });
      // Even if there's an error, clear the local state
      if (mountedRef.current) {
        setUser(null);
        setLoading(false);
      }
      return { error: null }; // Don't return the error to prevent UI issues
    }
  }, [user]);

  const updateTokens = useCallback(async (tokensUsed: number) => {
    if (!user) return { error: new Error('No user found') };

    secureLog('Updating tokens:', { tokensUsed, currentTokens: user.tokens_remaining });

    // Log token usage attempt
    await logSecurityEvent({
      userId: user.id,
      action: 'token_usage_attempt',
      resource: 'tokens',
      allowed: true,
      subscriptionTier: user.subscription_tier,
    });

    // Get subscription limits with corrected values
    const getSubscriptionLimits = () => {
      switch (user.subscription_tier) {
        case 'pro':
          return { dailyLimit: -1, monthlyLimit: 5000000 }; // No daily limit for Pro
        case 'premium':
          return { dailyLimit: -1, monthlyLimit: 10000000 }; // No daily limit for Premium
        default:
          return { dailyLimit: 100000, monthlyLimit: 1000000 }; // Free tier: 100K daily, 1M monthly
      }
    };

    const limits = getSubscriptionLimits();

    // Check daily and monthly limits
    if (user.subscription_tier === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const currentDay = new Date().getDate();
      
      // Reset daily tokens if it's a new day
      if (user.last_token_reset !== today) {
        const maxDailyTokens = Math.min(100000, limits.monthlyLimit - user.monthly_tokens_used);
        try {
          await supabase
            .from('users')
            .update({ 
              tokens_remaining: maxDailyTokens,
              daily_tokens_used: 0,
              last_token_reset: today
            })
            .eq('id', user.id);
          
          if (mountedRef.current) {
            setUser({ 
              ...user, 
              tokens_remaining: maxDailyTokens,
              daily_tokens_used: 0,
              last_token_reset: today
            });
          }
        } catch (error) {
          secureLog('Failed to reset daily tokens:', { error });
        }
      }

      // Reset monthly tokens if it's the monthly reset day
      if (currentDay === user.monthly_reset_date && user.last_token_reset !== today) {
        try {
          await supabase
            .from('users')
            .update({ 
              monthly_tokens_used: 0,
              monthly_exports_used: 0,
              tokens_remaining: 100000, // Reset to daily limit for free tier
              daily_tokens_used: 0
            })
            .eq('id', user.id);
          
          if (mountedRef.current) {
            setUser({ 
              ...user, 
              monthly_tokens_used: 0,
              monthly_exports_used: 0,
              tokens_remaining: 100000,
              daily_tokens_used: 0
            });
          }
        } catch (error) {
          secureLog('Failed to reset monthly tokens:', { error });
        }
      }

      // Check if user has exceeded monthly limit
      if (user.monthly_tokens_used >= limits.monthlyLimit) {
        await logSecurityEvent({
          userId: user.id,
          action: 'token_limit_exceeded',
          resource: 'tokens',
          allowed: false,
          subscriptionTier: user.subscription_tier,
          errorMessage: `Monthly token limit reached (${limits.monthlyLimit} tokens)`,
        });
        return { error: new Error(`Monthly token limit reached (${limits.monthlyLimit} tokens)`) };
      }

      // Check if user has exceeded daily limit
      if (user.daily_tokens_used >= limits.dailyLimit) {
        await logSecurityEvent({
          userId: user.id,
          action: 'daily_token_limit_exceeded',
          resource: 'tokens',
          allowed: false,
          subscriptionTier: user.subscription_tier,
          errorMessage: `Daily token limit reached (${limits.dailyLimit} tokens)`,
        });
        return { error: new Error(`Daily token limit reached (${limits.dailyLimit} tokens)`) };
      }
    } else {
      // For Pro/Premium users, only check monthly limits
      if (user.monthly_tokens_used >= limits.monthlyLimit) {
        await logSecurityEvent({
          userId: user.id,
          action: 'monthly_token_limit_exceeded',
          resource: 'tokens',
          allowed: false,
          subscriptionTier: user.subscription_tier,
          errorMessage: `Monthly token limit reached (${limits.monthlyLimit} tokens)`,
        });
        return { error: new Error(`Monthly token limit reached (${limits.monthlyLimit} tokens)`) };
      }
    }

    const newTokens = Math.max(0, user.tokens_remaining - tokensUsed);
    const newDailyUsed = user.daily_tokens_used + tokensUsed;
    const newMonthlyUsed = user.monthly_tokens_used + tokensUsed;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          tokens_remaining: newTokens,
          daily_tokens_used: newDailyUsed,
          monthly_tokens_used: newMonthlyUsed
        })
        .eq('id', user.id);

      if (!error && mountedRef.current) {
        setUser({ 
          ...user, 
          tokens_remaining: newTokens,
          daily_tokens_used: newDailyUsed,
          monthly_tokens_used: newMonthlyUsed
        });

        // Log successful token usage
        await logSecurityEvent({
          userId: user.id,
          action: 'tokens_used',
          resource: 'tokens',
          allowed: true,
          subscriptionTier: user.subscription_tier,
        });
      } else if (error) {
        secureLog('Token update error:', { error: error.message });
        // Log token update error
        await logSecurityEvent({
          userId: user.id,
          action: 'token_update_error',
          resource: 'tokens',
          allowed: false,
          subscriptionTier: user.subscription_tier,
          errorMessage: error.message,
        });
      }

      return { error };
    } catch (error: any) {
      const appError = handleError(error, 'token_update');
      secureLog('Token update exception:', { error: appError.message });
      return { error: appError };
    }
  }, [user]);

  const updateExports = useCallback(async (exportsUsed: number) => {
    if (!user) return { error: new Error('No user found') };

    secureLog('Updating exports:', { 
      exportsUsed, 
      currentExports: user.monthly_exports_used,
      subscriptionTier: user.subscription_tier 
    });

    // Log export attempt with detailed information
    await logSecurityEvent({
      userId: user.id,
      action: 'export_attempt',
      resource: 'exports',
      allowed: true,
      subscriptionTier: user.subscription_tier,
    });

    // Get export limits based on subscription tier
    const getExportLimits = () => {
      switch (user.subscription_tier) {
        case 'pro':
          return { monthlyLimit: 200 };
        case 'premium':
          return { monthlyLimit: -1 }; // Unlimited
        default:
          return { monthlyLimit: 5 }; // Free tier
      }
    };

    const limits = getExportLimits();

    // Check if unlimited exports (Premium)
    if (limits.monthlyLimit === -1) {
      secureLog('Premium user - unlimited exports, logging for analytics');
      await logSecurityEvent({
        userId: user.id,
        action: 'export_unlimited',
        resource: 'exports',
        allowed: true,
        subscriptionTier: user.subscription_tier,
      });
      return { error: null };
    }

    const currentExportsUsed = user.monthly_exports_used || 0;
    const newExportsUsed = currentExportsUsed + exportsUsed;
    
    secureLog('Export limit check:', {
      currentExportsUsed,
      newExportsUsed,
      monthlyLimit: limits.monthlyLimit,
      willExceed: newExportsUsed > limits.monthlyLimit
    });

    if (newExportsUsed > limits.monthlyLimit) {
      secureLog('Export limit exceeded');
      await logSecurityEvent({
        userId: user.id,
        action: 'export_limit_exceeded',
        resource: 'exports',
        allowed: false,
        subscriptionTier: user.subscription_tier,
        errorMessage: `Monthly export limit reached (${limits.monthlyLimit} exports)`,
      });
      return { error: new Error(`Monthly export limit reached (${limits.monthlyLimit} exports)`) };
    }

    try {
      secureLog('Updating database with new export count:', newExportsUsed);
      
      const { error } = await supabase
        .from('users')
        .update({ monthly_exports_used: newExportsUsed })
        .eq('id', user.id);

      if (!error && mountedRef.current) {
        secureLog('Export count updated successfully in database');
        
        // Update local user state
        setUser({ ...user, monthly_exports_used: newExportsUsed });
        
        // Log successful export with detailed information
        await logSecurityEvent({
          userId: user.id,
          action: 'export_successful',
          resource: 'exports',
          allowed: true,
          subscriptionTier: user.subscription_tier,
        });
        
        secureLog('Local user state updated with new export count');
      } else if (error) {
        secureLog('Export update error:', { error: error.message });
        // Log export error
        await logSecurityEvent({
          userId: user.id,
          action: 'export_error',
          resource: 'exports',
          allowed: false,
          subscriptionTier: user.subscription_tier,
          errorMessage: error.message,
        });
      }

      return { error };
    } catch (error: any) {
      const appError = handleError(error, 'export_update');
      secureLog('Export update exception:', { error: appError.message });
      await logSecurityEvent({
        userId: user.id,
        action: 'export_exception',
        resource: 'exports',
        allowed: false,
        subscriptionTier: user.subscription_tier,
        errorMessage: `Exception during export update: ${appError.message}`,
      });
      return { error: appError };
    }
  }, [user]);

  // Enhanced rewrite history saving
  const saveRewriteHistory = useCallback(async (rewriteData: {
    original_text: string;
    rewritten_text: string;
    confidence: number;
    style_tags: string[];
  }) => {
    if (!user) return { error: new Error('No user found') };

    try {
      secureLog('Saving rewrite history for user');
      
      const { data, error } = await supabase
        .from('rewrite_history')
        .insert({
          user_id: user.id,
          original_text: rewriteData.original_text,
          rewritten_text: rewriteData.rewritten_text,
          confidence: rewriteData.confidence,
          style_tags: rewriteData.style_tags,
        })
        .select()
        .single();

      if (error) {
        secureLog('Failed to save rewrite history:', { error: error.message });
        
        // Log rewrite save error
        await logSecurityEvent({
          userId: user.id,
          action: 'rewrite_save_error',
          resource: 'rewrite_history',
          allowed: false,
          subscriptionTier: user.subscription_tier,
          errorMessage: error.message,
        });
        
        return { error };
      }

      secureLog('Rewrite history saved successfully');
      
      // Log successful rewrite save
      await logSecurityEvent({
        userId: user.id,
        action: 'rewrite_saved',
        resource: 'rewrite_history',
        allowed: true,
        subscriptionTier: user.subscription_tier,
      });

      return { error: null, data };
    } catch (error: any) {
      const appError = handleError(error, 'save_rewrite_history');
      secureLog('Exception saving rewrite history:', { error: appError.message });
      return { error: appError };
    }
  }, [user]);

  // NEW: Check if user is admin
  const isAdmin = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase.rpc('is_user_admin', { p_user_id: user.id });
      
      if (error) {
        secureLog('Error checking admin status:', { error: error.message });
        return false;
      }
      
      return data || false;
    } catch (error) {
      secureLog('Exception checking admin status:', { error });
      return false;
    }
  }, [user]);

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateTokens,
    updateExports,
    saveRewriteHistory,
    isAdmin, // NEW: Expose admin check function
  };
};