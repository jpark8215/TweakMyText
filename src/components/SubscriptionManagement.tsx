import React, { useState } from 'react';
import { ArrowLeft, Crown, Calendar, CreditCard, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SubscriptionManagementProps {
  onBack: () => void;
}

export default function SubscriptionManagement({ onBack }: SubscriptionManagementProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      // In a real app, this would call your backend to cancel the subscription
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      alert('Subscription cancelled successfully. You will retain access until the end of your billing period.');
      setShowCancelConfirm(false);
    } catch (error) {
      alert('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgrade = () => {
    // In a real app, this would redirect to payment flow
    alert('Upgrade flow would be implemented here');
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'pro':
        return {
          name: 'Pro',
          price: '$9.99/month',
          credits: '500 credits/month',
          color: 'from-cyan-400 to-blue-500'
        };
      case 'premium':
        return {
          name: 'Premium',
          price: '$19.99/month',
          credits: '2000 credits/month',
          color: 'from-yellow-400 to-orange-500'
        };
      default:
        return {
          name: 'Free',
          price: 'Free',
          credits: '30 credits/month max',
          color: 'from-gray-400 to-gray-500'
        };
    }
  };

  const tierInfo = getTierInfo(user.subscription_tier);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors hover:bg-white/10 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Settings
        </button>
        <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
      </div>

      {/* Current Plan */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sm:p-8 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 bg-gradient-to-br ${tierInfo.color} rounded-xl flex items-center justify-center`}>
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{tierInfo.name} Plan</h2>
            <p className="text-gray-300">{tierInfo.price}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-medium">Credits</span>
            </div>
            <p className="text-gray-300 text-sm">{tierInfo.credits}</p>
            <p className="text-cyan-400 text-lg font-bold">{user.credits_remaining} remaining</p>
          </div>

          {user.subscription_expires_at && (
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">Next Billing</span>
              </div>
              <p className="text-gray-300 text-sm">
                {user.subscription_expires_at.toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-white font-medium">Status</span>
            </div>
            <p className="text-emerald-400 font-medium">Active</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {user.subscription_tier === 'free' ? (
            <button
              onClick={handleUpgrade}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              Upgrade Plan
            </button>
          ) : (
            <>
              <button
                onClick={handleUpgrade}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/25"
              >
                Change Plan
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-all border border-red-500/30"
              >
                Cancel Subscription
              </button>
            </>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sm:p-8">
        <h3 className="text-lg font-bold text-white mb-6">Billing History</h3>
        <div className="space-y-4">
          {/* Mock billing history */}
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <div>
              <p className="text-white font-medium">{tierInfo.name} Plan</p>
              <p className="text-gray-400 text-sm">December 1, 2024</p>
            </div>
            <div className="text-right">
              <p className="text-white font-medium">{tierInfo.price}</p>
              <p className="text-emerald-400 text-sm">Paid</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <div>
              <p className="text-white font-medium">{tierInfo.name} Plan</p>
              <p className="text-gray-400 text-sm">November 1, 2024</p>
            </div>
            <div className="text-right">
              <p className="text-white font-medium">{tierInfo.price}</p>
              <p className="text-emerald-400 text-sm">Paid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl border border-white/20 p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Cancel Subscription</h3>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessing}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? 'Cancelling...' : 'Cancel Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}