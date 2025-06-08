import React, { useState } from 'react';
import { PenTool, Sparkles } from 'lucide-react';
import StyleCapture from './components/StyleCapture';
import TextRewriter from './components/TextRewriter';
import { WritingSample } from './types';

type AppView = 'capture' | 'rewrite';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('capture');
  const [writingSamples, setWritingSamples] = useState<WritingSample[]>([]);

  const handleSamplesChange = (samples: WritingSample[]) => {
    setWritingSamples(samples);
  };

  const handleNext = () => {
    setCurrentView('rewrite');
  };

  const handleBack = () => {
    setCurrentView('capture');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  TweakMyText
                </h1>
                <p className="text-xs sm:text-sm text-gray-300">AI-Powered Writing Style Rewriter</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  currentView === 'capture' 
                    ? 'bg-gradient-to-r from-cyan-400 to-purple-500 shadow-lg shadow-cyan-400/50' 
                    : 'bg-gray-600'
                }`} />
                <span className="text-xs sm:text-sm text-gray-300 font-medium">Capture</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  currentView === 'rewrite' 
                    ? 'bg-gradient-to-r from-cyan-400 to-purple-500 shadow-lg shadow-cyan-400/50' 
                    : 'bg-gray-600'
                }`} />
                <span className="text-xs sm:text-sm text-gray-300 font-medium">Rewrite</span>
              </div>
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
        ) : (
          <TextRewriter
            samples={writingSamples}
            onBack={handleBack}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/5 backdrop-blur-xl border-t border-white/10 mt-8 sm:mt-12 lg:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-center gap-3 text-gray-400">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            <span className="text-xs sm:text-sm text-center">Transform any text to match your unique writing style</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;