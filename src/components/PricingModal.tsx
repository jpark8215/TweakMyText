import React, { useState } from 'react';
import { X, Check, Zap, Crown, Star } from 'lucide-react';
import { PricingTier } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 90,
    features: [
      '3 rewrites per day (90 per month)',
      '5 rewrites per month for export',
      'Basic style analysis',
      'Save up to 3 writing samples',
      'Export results (limited to 5 rewrites per month)'
    ],
    limits: {
      writingSamples: 3,
      dailyRewrites: 3,
      monthlyRewrites: 90,
      monthlyExports: 5,
      processingSpeed: 1,
      exportFormats: ['JSON'],
      historyAccess: false,
      bulkOperations: false,
      support: 'community'
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    credits: 200,
    features: [
      '200 rewrites per month',
      'Advanced style analysis',
      'Priority processing (2x faster)',
      'Save up to 25 writing samples',
      'Export results (up to 200 rewrites)',
      'Access to basic tone presets',
      'Rewrite history access',
      'Email support'
    ],
    popular: true,
    limits: {
      writingSamples: 25,
      dailyRewrites: -1, // No daily limit
      monthlyRewrites: 200,
      monthlyExports: 200,
      processingSpeed: 2,
      exportFormats: ['JSON', 'TXT'],
      historyAccess: true,
      bulkOperations: false,
      support: 'email'
    }
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 7.99,
    credits: 300,
    features: [
      '300 rewrites per month',
      'Extended style analysis with confidence scoring',
      'Fastest processing (3x speed)',
      'Save up to 100 writing samples',
      'Unlimited exports & rewrite history (up to 300 rewrites)',
      'Custom tone fine-tuning with advanced presets',
      'Full rewrite history with analytics',
      'Bulk rewrite operations',
      'Priority email support',
      'Early access to new features'
    ],
    limits: {
      writingSamples: 100,
      dailyRewrites: -1, // No daily limit
      monthlyRewrites: 300,
      monthlyExports: -1, // Unlimited
      processingSpeed: 3,
      exportFormats: ['JSON', 'TXT', 'DOCX'],
      historyAccess: true,
      bulkOperations: true,
      support: 'priority'
    }
  }
];

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [selectedTier, setSelectedTier] = useState<string>('pro');

  if (!isOpen) return null;

  const handleUpgrade = (tierId: string) => {
    // In a real app, this would integrate with Stripe or another payment processor
    console.log('Upgrading to:', tierId);
    alert('Payment integration would be implemented here');
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Choose Your Plan</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative bg-gray-50 rounded-xl border p-6 transition-all cursor-pointer ${
                tier.popular
                  ? 'border-blue-400 ring-2 ring-blue-400/20 scale-105'
                  : selectedTier === tier.id
                  ? 'border-indigo-400 ring-2 ring-indigo-400/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTier(tier.id)}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-gray-800">${tier.price}</span>
                  {tier.price > 0 && <span className="text-gray-500">/month</span>}
                </div>
                <div className="flex items-center justify-center gap-2 mt-2 text-blue-600">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">
                    {tier.id === 'free' ? '3/day (90 max)' : `${tier.credits} credits/month`}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3 text-gray-700">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={tier.id === 'free'}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  tier.id === 'free'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : tier.popular
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 shadow-lg shadow-blue-500/25'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                }`}
              >
                {tier.id === 'free' ? 'Current Plan' : `Upgrade to ${tier.name}`}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              All plans include secure payment processing and can be cancelled anytime.
            </p>
          </div>
          
          {/* Feature Comparison */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Feature Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">Writing Samples</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Free: Up to 3 samples</div>
                  <div>Pro: Up to 25 samples</div>
                  <div>Premium: Up to 100 samples</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-indigo-600">Processing Speed</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Free: Standard speed</div>
                  <div>Pro: 2x faster processing</div>
                  <div>Premium: 3x faster processing</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-purple-600">Export Options</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Free: Limited (5/month)</div>
                  <div>Pro: Up to 200/month (JSON & TXT)</div>
                  <div>Premium: Unlimited (All formats)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}