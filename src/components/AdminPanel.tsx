import React, { useState } from 'react';
import { Shield, Crown, Star, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  const handleTierChange = async (newTier: 'free' | 'pro' | 'premium') => {
    if (!user || isUpdating) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      // Update subscription tier using the database function
      const { error } = await supabase.rpc('update_subscription_tier', {
        p_user_id: user.id,
        p_new_tier: newTier,
        p_billing_start: new Date().toISOString()
      });

      if (error) {
        throw error;
      }

      // Create a billing record for testing
      if (newTier !== 'free') {
        const amount = newTier === 'pro' ? 10.00 : 18.00;
        const { error: billingError } = await supabase.rpc('create_billing_record', {
          p_user_id: user.id,
          p_amount: amount,
          p_currency: 'USD',
          p_status: 'paid',
          p_description: `${newTier.charAt(0).toUpperCase() + newTier.slice(1)} Monthly Subscription (Test)`,
          p_subscription_tier: newTier,
          p_stripe_payment_id: `test_${Date.now()}`
        });

        if (billingError) {
          console.warn('Failed to create billing record:', billingError);
        }
      }

      setMessage({
        type: 'success',
        text: `Successfully upgraded to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} tier!`
      });

      // Refresh the page to update user state
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error('Error updating subscription:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update subscription tier'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      icon: Shield,
      color: 'from-gray-500 to-gray-600',
      features: ['3 writing samples', '1M tokens/month', '100K daily limit', '5 exports/month']
    },
    {
      id: 'pro',
      name: 'Pro',
      icon: Crown,
      color: 'from-blue-500 to-indigo-500',
      features: ['25 writing samples', '5M tokens/month', 'No daily limit', '200 exports/month', 'Rewrite history', '6 tone controls']
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: Star,
      color: 'from-amber-500 to-orange-500',
      features: ['100 writing samples', '10M tokens/month', 'No daily limit', 'Unlimited exports', 'Full analytics', 'All 10 tone controls']
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Admin Panel - Testing Mode</h2>
              <p className="text-sm text-gray-600">Bypass payment for subscription testing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            ×
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-amber-800 font-medium">Testing Mode Active</h3>
              <p className="text-amber-700 text-sm">
                This panel bypasses payment processing for testing purposes. 
                Current tier: <strong>{user.subscription_tier}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Subscription Tiers */}
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrentTier = user.subscription_tier === tier.id;
            
            return (
              <div
                key={tier.id}
                className={`relative bg-gray-50 rounded-xl border p-6 transition-all ${
                  isCurrentTier
                    ? 'border-green-400 ring-2 ring-green-400/20 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Current
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`w-12 h-12 bg-gradient-to-br ${tier.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{tier.name}</h3>
                  <p className="text-gray-600 text-sm">Test all {tier.name.toLowerCase()} features</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleTierChange(tier.id as 'free' | 'pro' | 'premium')}
                  disabled={isUpdating || isCurrentTier}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    isCurrentTier
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : isUpdating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : `bg-gradient-to-r ${tier.color} text-white hover:opacity-90 transform hover:scale-105 shadow-lg`
                  }`}
                >
                  {isUpdating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </div>
                  ) : isCurrentTier ? (
                    'Current Tier'
                  ) : (
                    `Switch to ${tier.name}`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-blue-800 font-medium mb-2">Testing Instructions</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Switch between tiers to test different feature sets</li>
            <li>• All tier changes are immediate and bypass payment</li>
            <li>• Billing records are created for testing subscription management</li>
            <li>• Page will refresh automatically after tier change</li>
            <li>• Use this panel to test upgrade flows and feature restrictions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}