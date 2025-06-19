import { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { logSecurityEvent } from '../utils/securityLogger';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error);
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
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
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // Remove user dependency to prevent infinite loops

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('Fetching user profile for:', authUser.id);
      
      // Reset daily/monthly tokens if needed
      try {
        await supabase.rpc('reset_daily_tokens');
        await supabase.rpc('reset_monthly_tokens');
      } catch (rpcError) {
        console.warn('Token reset functions not available:', rpcError);
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        console.log('User profile not found, creating new one...');
        // User doesn't exist, create new profile
        const newUser = {
          id: authUser.id,
          email: authUser.email!,
          subscription_tier: 'free' as const,
          tokens_remaining: 100000, // Daily limit for free tier
          daily_tokens_used: 0,
          monthly_tokens_used: 0,
          monthly_exports_used: 0,
          last_token_reset: new Date().toISOString().split('T')[0],
          monthly_reset_date: new Date().getDate(),
        };

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();

        if (createError) {
          console.error('Failed to create user profile:', createError);
          throw createError;
        }
        
        const userProfile = {
          ...createdUser,
          created_at: new Date(createdUser.created_at),
          subscription_expires_at: createdUser.subscription_expires_at 
            ? new Date(createdUser.subscription_expires_at) 
            : undefined,
        };
        
        setUser(userProfile);
        console.log('User profile created successfully:', userProfile);

        // Log new user creation
        await logSecurityEvent({
          userId: userProfile.id,
          action: 'user_profile_created',
          resource: 'user_management',
          allowed: true,
          subscriptionTier: userProfile.subscription_tier,
        });
      } else if (error) {
        console.error('Database error fetching user profile:', error);
        throw error;
      } else {
        const userProfile = {
          ...data,
          created_at: new Date(data.created_at),
          subscription_expires_at: data.subscription_expires_at 
            ? new Date(data.subscription_expires_at) 
            : undefined,
        };
        
        setUser(userProfile);
        console.log('User profile loaded successfully:', userProfile);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      
      // Log profile fetch error
      await logSecurityEvent({
        userId: authUser.id,
        action: 'user_profile_fetch_error',
        resource: 'user_management',
        allowed: false,
        subscriptionTier: 'unknown',
        errorMessage: `Profile fetch failed: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Sign in response:', { data: !!data, error });
      
      if (error) {
        console.error('Sign in error:', error);
        // Log failed sign-in attempt
        await logSecurityEvent({
          userId: 'unknown',
          action: 'sign_in_failed',
          resource: 'authentication',
          allowed: false,
          subscriptionTier: 'unknown',
          errorMessage: error.message,
        });
      }
      
      return { error };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Attempting sign up for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      console.log('Sign up response:', { data: !!data, error });
      
      if (error) {
        console.error('Sign up error:', error);
        // Log failed sign-up attempt
        await logSecurityEvent({
          userId: 'unknown',
          action: 'sign_up_failed',
          resource: 'authentication',
          allowed: false,
          subscriptionTier: 'unknown',
          errorMessage: error.message,
        });
      }
      
      return { error };
    } catch (error: any) {
      console.error('Sign up exception:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      
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
      setUser(null);
      setLoading(false);

      // Then perform the actual sign out
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        // If sign out fails, we still want to clear local state
        // The user will be redirected to sign in anyway
        return { error: null }; // Don't return the error to prevent UI issues
      }

      console.log('Sign out completed successfully');
      return { error: null };
    } catch (error: any) {
      console.error('Sign out exception:', error);
      // Even if there's an error, clear the local state
      setUser(null);
      setLoading(false);
      return { error: null }; // Don't return the error to prevent UI issues
    }
  };

  const updateTokens = async (tokensUsed: number) => {
    if (!user) return { error: new Error('No user found') };

    console.log('Updating tokens:', { tokensUsed, currentTokens: user.tokens_remaining });

    // Log token usage attempt
    await logSecurityEvent({
      userId: user.id,
      action: 'token_usage_attempt',
      resource: 'tokens',
      allowed: true,
      subscriptionTier: user.subscription_tier,
    });

    // Get subscription limits
    const getSubscriptionLimits = () => {
      switch (user.subscription_tier) {
        case 'pro':
          return { dailyLimit: -1, monthlyLimit: 5000000 }; // No daily limit for Pro
        case 'premium':
          return { dailyLimit: -1, monthlyLimit: 10000000 }; // No daily limit for Premium
        default:
          return { dailyLimit: 100000, monthlyLimit: 1000000 }; // Free tier
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
          
          setUser({ 
            ...user, 
            tokens_remaining: maxDailyTokens,
            daily_tokens_used: 0,
            last_token_reset: today
          });
        } catch (error) {
          console.error('Failed to reset daily tokens:', error);
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
              tokens_remaining: 100000,
              daily_tokens_used: 0
            })
            .eq('id', user.id);
          
          setUser({ 
            ...user, 
            monthly_tokens_used: 0,
            monthly_exports_used: 0,
            tokens_remaining: 100000,
            daily_tokens_used: 0
          });
        } catch (error) {
          console.error('Failed to reset monthly tokens:', error);
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

      if (!error) {
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
      } else {
        console.error('Token update error:', error);
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
      console.error('Token update exception:', error);
      return { error };
    }
  };

  const updateExports = async (exportsUsed: number) => {
    if (!user) return { error: new Error('No user found') };

    console.log('Updating exports:', { exportsUsed, currentExports: user.monthly_exports_used });

    // Log export attempt
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
      await logSecurityEvent({
        userId: user.id,
        action: 'export_unlimited',
        resource: 'exports',
        allowed: true,
        subscriptionTier: user.subscription_tier,
      });
      return { error: null };
    }

    const newExportsUsed = (user.monthly_exports_used || 0) + exportsUsed;
    
    if (newExportsUsed > limits.monthlyLimit) {
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
      const { error } = await supabase
        .from('users')
        .update({ monthly_exports_used: newExportsUsed })
        .eq('id', user.id);

      if (!error) {
        setUser({ ...user, monthly_exports_used: newExportsUsed });
        
        // Log successful export
        await logSecurityEvent({
          userId: user.id,
          action: 'export_successful',
          resource: 'exports',
          allowed: true,
          subscriptionTier: user.subscription_tier,
        });
      } else {
        console.error('Export update error:', error);
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
      console.error('Export update exception:', error);
      return { error };
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateTokens,
    updateExports,
  };
};