import React from 'react';
import { FileText, Zap, CheckCircle, Info } from 'lucide-react';

interface StyleFormattingDisplayProps {
  formattingInstructions: string[];
  detectedStyles: string[];
  analysisLevel: string;
  confidence: number;
}

export default function StyleFormattingDisplay({ 
  formattingInstructions, 
  detectedStyles, 
  analysisLevel,
  confidence 
}: StyleFormattingDisplayProps) {
  if (formattingInstructions.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Style Formatting Applied</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Analysis: {analysisLevel}</span>
            <span>•</span>
            <span>Confidence: {confidence}%</span>
            <span>•</span>
            <span>Styles: {detectedStyles.join(', ')}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3">
          {formattingInstructions.map((instruction, index) => (
            <div key={index} className="flex items-start gap-3">
              {instruction.startsWith('**') ? (
                // Section header
                <div className="w-full">
                  <h4 className="font-medium text-blue-800 text-sm">
                    {instruction.replace(/\*\*/g, '')}
                  </h4>
                </div>
              ) : instruction.startsWith('•') ? (
                // Bullet point
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm leading-relaxed">
                    {instruction.replace('• ', '')}
                  </span>
                </>
              ) : (
                // Regular instruction
                <>
                  <Zap className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm leading-relaxed">
                    {instruction}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-blue-800 text-sm">
              <p className="font-medium mb-1">Formatting Consistency</p>
              <p>These formatting rules have been applied consistently throughout the entire rewritten text to maintain your unique writing style and voice.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}