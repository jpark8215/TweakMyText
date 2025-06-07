import React from 'react';
import { ArrowRight, Target, Award, Tag } from 'lucide-react';
import { RewriteResult } from '../types';

interface ComparisonViewProps {
  result: RewriteResult;
}

export default function ComparisonView({ result }: ComparisonViewProps) {
  return (
    <div className="space-y-6">
      {/* Confidence and Style Tags */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Style Match Analysis</h3>
              <p className="text-sm text-gray-600">Confidence: {Math.round(result.confidence)}%</p>
            </div>
          </div>
          <div className="text-right">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Detected style:</span>
          {result.styleTags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 bg-white bg-opacity-60 text-xs font-medium text-blue-700 rounded-full border border-blue-200"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Original Text */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Original</h3>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.original}</p>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            {result.original.split(' ').length} words
          </div>
        </div>

        {/* Arrow */}
        <div className="hidden md:flex items-center justify-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Rewritten Text */}
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Your Style</h3>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.rewritten}</p>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            {result.rewritten.split(' ').length} words
          </div>
        </div>
      </div>
    </div>
  );
}