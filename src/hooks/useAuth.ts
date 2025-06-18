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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      // Reset daily/monthly credits if needed
      await supabase.rpc('reset_daily_credits');
      await supabase.rpc('reset_monthly_credits');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create new profile
        const newUser = {
          id: authUser.id,
          email: authUser.email!,
          subscription_tier: 'free' as const,
          credits_remaining: 3,
          daily_credits_used: 0,
          monthly_credits_used: 0,
          monthly_exports_used: 0,
          last_credit_reset: new Date().toISOString().split('T')[0],
          monthly_reset_date: new Date().getDate(),
        };

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();

        if (createError) throw createError;
        
        const userProfile = {
          ...createdUser,
          created_at: new Date(createdUser.created_at),
          subscription_expires_at: createdUser.subscription_expires_at 
            ? new Date(createdUser.subscription_expires_at) 
            : undefined,
        };
        
        setUser(userProfile);

        // Log new user creation
        await logSecurityEvent({
          userId: userProfile.id,
          action: 'user_profile_created',
          resource: 'user_management',
          allowed: true,
          subscriptionTier: userProfile.subscription_tier,
        });
      } else if (error) {
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
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
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
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
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
  };

  const signOut = async () => {
    try {
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

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return { error };
      }

      // Clear user state immediately after successful sign out
      setUser(null);
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error as Error };
    }
  };

  const updateCredits = async (creditsUsed: number) => {
    if (!user) return { error: new Error('No user found') };

    // Log credit usage attempt
    await logSecurityEvent({
      userId: user.id,
      action: 'credit_usage_attempt',
      resource: 'credits',
      allowed: true,
      subscriptionTier: user.subscription_tier,
    });

    // Get subscription limits
    const getSubscriptionLimits = () => {
      switch (user.subscription_tier) {
        case 'pro':
          return { dailyLimit: -1, monthlyLimit: 200 }; // No daily limit for Pro
        case 'premium':
          return { dailyLimit: -1, monthlyLimit: 300 }; // No daily limit for Premium
        default:
          return { dailyLimit: 3, monthlyLimit: 90 }; // Free tier
      }
    };

    const limits = getSubscriptionLimits();

    // Check daily and monthly limits
    if (user.subscription_tier === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const currentDay = new Date().getDate();
      
      // Reset daily credits if it's a new day
      if (user.last_credit_reset !== today) {
        const maxDailyCredits = Math.min(3, limits.monthlyLimit - user.monthly_credits_used);
        await supabase
          .from('users')
          .update({ 
            credits_remaining: maxDailyCredits,
            daily_credits_used: 0,
            last_credit_reset: today
          })
          .eq('id', user.id);
        
        setUser({ 
          ...user, 
          credits_remaining: maxDailyCredits,
          daily_credits_used: 0,
          last_credit_reset: today
        });
      }

      // Reset monthly credits if it's the monthly reset day
      if (currentDay === user.monthly_reset_date && user.last_credit_reset !== today) {
        await supabase
          .from('users')
          .update({ 
            monthly_credits_used: 0,
            monthly_exports_used: 0,
            credits_remaining: 3,
            daily_credits_used: 0
          })
          .eq('id', user.id);
        
        setUser({ 
          ...user, 
          monthly_credits_used: 0,
          monthly_exports_used: 0,
          credits_remaining: 3,
          daily_credits_used: 0
        });
      }

      // Check if user has exceeded monthly limit
      if (user.monthly_credits_used >= limits.monthlyLimit) {
        await logSecurityEvent({
          userId: user.id,
          action: 'credit_limit_exceeded',
          resource: 'credits',
          allowed: false,
          subscriptionTier: user.subscription_tier,
          errorMessage: `Monthly credit limit reached (${limits.monthlyLimit} credits)`,
        });
        return { error: new Error(`Monthly credit limit reached (${limits.monthlyLimit} credits)`) };
      }

      // Check if user has exceeded daily limit
      if (user.daily_credits_used >= limits.dailyLimit) {
        await logSecurityEvent({
          userId: user.id,
          action: 'daily_credit_limit_exceeded',
          resource: 'credits',
          allowed: false,
          subscriptionTier: user.subscription_tier,
          errorMessage: `Daily credit limit reached (${limits.dailyLimit} credits)`,
        });
        return { error: new Error(`Daily credit limit reached (${limits.dailyLimit} credits)`) };
      }
    } else {
      // For Pro/Premium users, only check monthly limits
      if (user.monthly_credits_used >= limits.monthlyLimit) {
        await logSecurityEvent({
          userId: user.id,
          action: 'monthly_credit_limit_exceeded',
          resource: 'credits',
          allowed: false,
          subscriptionTier: user.subscription_tier,
          errorMessage: `Monthly credit limit reached (${limits.monthlyLimit} credits)`,
        });
        return { error: new Error(`Monthly credit limit reached (${limits.monthlyLimit} credits)`) };
      }
    }

    const newCredits = Math.max(0, user.credits_remaining - creditsUsed);
    const newDailyUsed = user.daily_credits_used + creditsUsed;
    const newMonthlyUsed = user.monthly_credits_used + creditsUsed;
    
    const { error } = await supabase
      .from('users')
      .update({ 
        credits_remaining: newCredits,
        daily_credits_used: newDailyUsed,
        monthly_credits_used: newMonthlyUsed
      })
      .eq('id', user.id);

    if (!error) {
      setUser({ 
        ...user, 
        credits_remaining: newCredits,
        daily_credits_used: newDailyUsed,
        monthly_credits_used: newMonthlyUsed
      });

      // Log successful credit usage
      await logSecurityEvent({
        userId: user.id,
        action: 'credits_used',
        resource: 'credits',
        allowed: true,
        subscriptionTier: user.subscription_tier,
      });
    } else {
      // Log credit update error
      await logSecurityEvent({
        userId: user.id,
        action: 'credit_update_error',
        resource: 'credits',
        allowed: false,
        subscriptionTier: user.subscription_tier,
        errorMessage: error.message,
      });
    }

    return { error };
  };

  const updateExports = async (exportsUsed: number) => {
    if (!user) return { error: new Error('No user found') };

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
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateCredits,
    updateExports,
  };
};