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
          price: '$4.99/month',
          credits: '200 credits/month',
          color: 'from-blue-500 to-indigo-500'
        };
      case 'premium':
        return {
          name: 'Premium',
          price: '$7.99/month',
          credits: '300 credits/month',
          color: 'from-amber-500 to-orange-500'
        };
      default:
        return {
          name: 'Free',
          price: 'Free',
          credits: '90 credits/month max',
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
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Subscription Management</h1>
      </div>

      {/* Current Plan */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 sm:p-8 mb-8 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 bg-gradient-to-br ${tierInfo.color} rounded-xl flex items-center justify-center`}>
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{tierInfo.name} Plan</h2>
            <p className="text-gray-600">{tierInfo.price}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span className="text-gray-800 font-medium">Credits</span>
            </div>
            <p className="text-gray-600 text-sm">{tierInfo.credits}</p>
            <p className="text-blue-600 text-lg font-bold">{user.credits_remaining} remaining</p>
          </div>

          {user.subscription_expires_at && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span className="text-gray-800 font-medium">Next Billing</span>
              </div>
              <p className="text-gray-600 text-sm">
                {user.subscription_expires_at.toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-800 font-medium">Status</span>
            </div>
            <p className="text-emerald-600 font-medium">Active</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {user.subscription_tier === 'free' ? (
            <button
              onClick={handleUpgrade}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              Upgrade Plan
            </button>
          ) : (
            <>
              <button
                onClick={handleUpgrade}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
              >
                Change Plan
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-all border border-red-200"
              >
                Cancel Subscription
              </button>
            </>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Billing History</h3>
        <div className="space-y-4">
          {/* Mock billing history */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="text-gray-800 font-medium">{tierInfo.name} Plan</p>
              <p className="text-gray-500 text-sm">December 1, 2024</p>
            </div>
            <div className="text-right">
              <p className="text-gray-800 font-medium">{tierInfo.price}</p>
              <p className="text-emerald-600 text-sm">Paid</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="text-gray-800 font-medium">{tierInfo.name} Plan</p>
              <p className="text-gray-500 text-sm">November 1, 2024</p>
            </div>
            <div className="text-right">
              <p className="text-gray-800 font-medium">{tierInfo.price}</p>
              <p className="text-emerald-600 text-sm">Paid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Cancel Subscription</h3>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
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