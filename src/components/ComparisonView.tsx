import React from 'react';
import { ArrowRight, Target, Award, Tag, Zap } from 'lucide-react';
import { RewriteResult } from '../types';

interface ComparisonViewProps {
  result: RewriteResult;
}

export default function ComparisonView({ result }: ComparisonViewProps) {
  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Confidence and Style Tags */}
      <div className="bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-xl rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-base sm:text-lg lg:text-xl">Style Match Analysis</h3>
              <p className="text-gray-600 text-sm sm:text-base">Confidence: {Math.round(result.confidence)}%</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <div className="w-full sm:w-16 lg:w-20 h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-500 rounded-full transition-all duration-1000"
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <Tag className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-500" />
            <span className="text-gray-700 font-medium text-xs sm:text-sm lg:text-base">Detected style:</span>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {result.styleTags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-xs sm:text-sm font-medium rounded-full border border-blue-200 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Original Text */}
        <div className="bg-white/80 backdrop-blur-xl rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 p-4 sm:p-6 lg:p-8 shadow-lg">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800">Original</h3>
          </div>
          <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{result.original}</p>
          </div>
          <div className="mt-3 sm:mt-4 lg:mt-6 flex items-center gap-2 text-xs sm:text-sm text-gray-500">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
            {result.original.split(' ').length} words
          </div>
        </div>

        {/* Arrow - Hidden on mobile, shown on large screens */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/25">
            <ArrowRight className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
          </div>
        </div>

        {/* Mobile Arrow */}
        <div className="lg:hidden flex items-center justify-center py-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/25 rotate-90">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Rewritten Text */}
        <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 backdrop-blur-xl rounded-lg sm:rounded-xl lg:rounded-2xl border border-emerald-200 p-4 sm:p-6 lg:p-8 shadow-lg">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800">Your Style</h3>
          </div>
          <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{result.rewritten}</p>
          </div>
          <div className="mt-3 sm:mt-4 lg:mt-6 flex items-center gap-2 text-xs sm:text-sm text-gray-500">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
            {result.rewritten.split(' ').length} words
          </div>
        </div>
      </div>
    </div>
  );
}