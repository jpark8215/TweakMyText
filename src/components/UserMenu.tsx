import React, { useState } from 'react';
import { User, LogOut, CreditCard, Settings, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface UserMenuProps {
  onOpenSubscription?: () => void;
}

export default function UserMenu({ onOpenSubscription }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const handleSubscriptionClick = () => {
    setIsOpen(false);
    onOpenSubscription?.();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'text-cyan-400';
      case 'premium': return 'text-yellow-400';
      default: return 'text-gray-400';
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
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/20"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-white text-sm font-medium truncate max-w-32">
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
          <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-20">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {user.email}
                  </div>
                  <div className={`text-sm ${getTierColor(user.subscription_tier)}`}>
                    {getTierBadge(user.subscription_tier)} Plan
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300">
                  {user.credits_remaining} credits remaining
                </span>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={handleSubscriptionClick}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
              >
                <CreditCard className="w-4 h-4" />
                Manage Subscription
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              
              <hr className="my-2 border-white/10" />
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}