import React, { useState } from 'react';
import { User, LogOut, Settings, Zap, Crown, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface UserMenuProps {
  onOpenSettings?: () => void;
  onManageSubscription?: () => void;
  onOpenPricing?: () => void;
  onOpenAdmin?: () => void; // NEW: Admin panel trigger
}

export default function UserMenu({ onOpenSettings, onManageSubscription, onOpenPricing, onOpenAdmin }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { user, signOut } = useAuth();

  if (!user) return null;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks
    
    setIsSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
        alert('Failed to sign out. Please try again.');
      } else {
        setIsOpen(false);
        // User state will be cleared by the auth hook
      }
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    onOpenSettings?.();
  };

  const handleSubscriptionClick = () => {
    setIsOpen(false);
    onManageSubscription?.();
  };

  const handleUpgradeClick = () => {
    setIsOpen(false);
    onOpenPricing?.();
  };

  const handleAdminClick = () => {
    setIsOpen(false);
    onOpenAdmin?.();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'text-blue-600';
      case 'premium': return 'text-amber-600';
      default: return 'text-gray-500';
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'pro': return 'Pro';
      case 'premium': return 'Premium';
      default: return 'Free';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/80 hover:bg-white/90 transition-all border border-gray-200"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-gray-800 text-sm font-medium truncate max-w-32">
            {user.email}
          </div>
          <div className={`text-xs ${getTierColor(user.subscription_tier)}`}>
            {getTierBadge(user.subscription_tier)}
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-xl border border-gray-200 shadow-2xl z-20">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-800 font-medium truncate">
                    {user.email}
                  </div>
                  <div className={`text-sm ${getTierColor(user.subscription_tier)}`}>
                    {getTierBadge(user.subscription_tier)} Plan
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-gray-700">
                  {formatTokens(user.tokens_remaining)} tokens remaining
                </span>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={handleSettingsClick}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>

              <button
                onClick={handleSubscriptionClick}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <Crown className="w-4 h-4" />
                Manage Subscription
              </button>

              {user.subscription_tier === 'free' && (
                <button
                  onClick={handleUpgradeClick}
                  className="w-full flex items-center gap-3 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-left"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade Plan
                </button>
              )}

              {/* Admin Panel Button - Testing Mode */}
              <button
                onClick={handleAdminClick}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-left"
              >
                <Shield className="w-4 h-4" />
                Admin Panel (Testing)
              </button>
              
              <hr className="my-2 border-gray-200" />
              
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4" />
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}