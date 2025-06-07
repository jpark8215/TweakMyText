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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white bg-opacity-80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TweakMyText</h1>
                <p className="text-sm text-gray-600">AI-Powered Writing Style Rewriter</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${currentView === 'capture' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">Capture</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${currentView === 'rewrite' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">Rewrite</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
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
      <footer className="bg-white bg-opacity-80 backdrop-blur-sm border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">Transform any text to match your unique writing style</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
