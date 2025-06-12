import { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

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
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
          credits_remaining: 2,
          daily_credits_used: 0,
          monthly_credits_used: 0,
          last_credit_reset: new Date().toISOString().split('T')[0],
          monthly_reset_date: new Date().getDate(),
        };

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();

        if (createError) throw createError;
        setUser({
          ...createdUser,
          created_at: new Date(createdUser.created_at),
          subscription_expires_at: createdUser.subscription_expires_at 
            ? new Date(createdUser.subscription_expires_at) 
            : undefined,
        });
      } else if (error) {
        throw error;
      } else {
        setUser({
          ...data,
          created_at: new Date(data.created_at),
          subscription_expires_at: data.subscription_expires_at 
            ? new Date(data.subscription_expires_at) 
            : undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
    }
    return { error };
  };

  const updateCredits = async (creditsUsed: number) => {
    if (!user) return { error: new Error('No user found') };

    // Check daily and monthly limits for free users
    if (user.subscription_tier === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const currentDay = new Date().getDate();
      
      // Reset daily credits if it's a new day
      if (user.last_credit_reset !== today) {
        const maxDailyCredits = Math.min(2, 30 - user.monthly_credits_used);
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
            credits_remaining: 2,
            daily_credits_used: 0
          })
          .eq('id', user.id);
        
        setUser({ 
          ...user, 
          monthly_credits_used: 0,
          credits_remaining: 2,
          daily_credits_used: 0
        });
      }

      // Check if user has exceeded monthly limit
      if (user.monthly_credits_used >= 30) {
        return { error: new Error('Monthly credit limit reached (30 credits)') };
      }

      // Check if user has exceeded daily limit
      if (user.daily_credits_used >= 2) {
        return { error: new Error('Daily credit limit reached (2 credits)') };
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
  };
};