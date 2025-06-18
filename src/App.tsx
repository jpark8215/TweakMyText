import React, { useState } from 'react';
import { PenTool, Sparkles, LogIn } from 'lucide-react';
import StyleCapture from './components/StyleCapture';
import TextRewriter from './components/TextRewriter';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import PricingModal from './components/PricingModal';
import SubscriptionManagement from './components/SubscriptionManagement';
import UserMenu from './components/UserMenu';
import { WritingSample } from './types';
import { useAuth } from './hooks/useAuth';

type AppView = 'capture' | 'rewrite' | 'subscription';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('capture');
  const [writingSamples, setWritingSamples] = useState<WritingSample[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const { user, loading } = useAuth();

  const handleSamplesChange = (samples: WritingSample[]) => {
    setWritingSamples(samples);
  };

  const handleNext = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView('rewrite');
  };

  const handleBack = () => {
    setCurrentView('capture');
  };

  const handleManageSubscription = () => {
    setCurrentView('subscription');
    setShowSettingsModal(false);
  };

  const handleOpenPricing = () => {
    setShowPricingModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  TweakMyText
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">AI-Powered Writing Style Rewriter</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Progress Indicators */}
              {currentView !== 'subscription' && (
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                      currentView === 'capture' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-400/50' 
                        : 'bg-gray-300'
                    }`} />
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">Capture</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                      currentView === 'rewrite' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-400/50' 
                        : 'bg-gray-300'
                    }`} />
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">Rewrite</span>
                  </div>
                </div>
              )}

              {/* Auth/User Section */}
              {user ? (
                <UserMenu 
                  onOpenSettings={() => setShowSettingsModal(true)}
                  onManageSubscription={handleManageSubscription}
                  onOpenPricing={handleOpenPricing}
                />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all text-sm shadow-md hover:shadow-lg"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-4 sm:py-6 lg:py-8">
        {currentView === 'capture' ? (
          <StyleCapture
            samples={writingSamples}
            onSamplesChange={handleSamplesChange}
            onNext={handleNext}
          />
        ) : currentView === 'rewrite' ? (
          <TextRewriter
            samples={writingSamples}
            onBack={handleBack}
            onOpenPricing={handleOpenPricing}
          />
        ) : (
          <SubscriptionManagement
            onBack={() => setCurrentView('capture')}
            onOpenPricing={handleOpenPricing}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-xl border-t border-gray-200/50 mt-8 sm:mt-12 lg:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-center gap-3 text-gray-600">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <span className="text-xs sm:text-sm text-center">Transform any text to match your unique writing style</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onManageSubscription={handleManageSubscription}
      />

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />
    </div>
  );
}

export default App;