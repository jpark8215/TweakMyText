import React from 'react';
import { ArrowRight, Target, Award, Tag, Zap } from 'lucide-react';
import { RewriteResult } from '../types';

interface ComparisonViewProps {
  result: RewriteResult;
}

export default function ComparisonView({ result }: ComparisonViewProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Confidence and Style Tags */}
      <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-white/20 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg sm:text-xl">Style Match Analysis</h3>
              <p className="text-gray-300 text-sm sm:text-base">Confidence: {Math.round(result.confidence)}%</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <div className="w-full sm:w-20 h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <span className="text-gray-300 font-medium text-sm sm:text-base">Detected style:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.styleTags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 text-xs sm:text-sm font-medium rounded-full border border-cyan-400/30 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Original Text */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Original</h3>
          </div>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{result.original}</p>
          </div>
          <div className="mt-4 sm:mt-6 flex items-center gap-2 text-xs sm:text-sm text-gray-400">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
            {result.original.split(' ').length} words
          </div>
        </div>

        {/* Arrow - Hidden on mobile, shown on large screens */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-12 h-12 xl:w-16 xl:h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl shadow-cyan-500/25">
            <ArrowRight className="w-6 h-6 xl:w-8 xl:h-8 text-white" />
          </div>
        </div>

        {/* Mobile Arrow */}
        <div className="lg:hidden flex items-center justify-center py-2">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center shadow-xl shadow-cyan-500/25 rotate-90">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Rewritten Text */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-emerald-400/30 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Your Style</h3>
          </div>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{result.rewritten}</p>
          </div>
          <div className="mt-4 sm:mt-6 flex items-center gap-2 text-xs sm:text-sm text-gray-400">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
            {result.rewritten.split(' ').length} words
          </div>
        </div>
      </div>
    </div>
  );
}