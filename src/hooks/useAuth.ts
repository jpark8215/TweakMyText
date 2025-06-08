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
    return { error };
  };

  const updateCredits = async (creditsUsed: number) => {
    if (!user) return;

    const newCredits = Math.max(0, user.credits_remaining - creditsUsed);
    
    const { error } = await supabase
      .from('users')
      .update({ credits_remaining: newCredits })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, credits_remaining: newCredits });
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