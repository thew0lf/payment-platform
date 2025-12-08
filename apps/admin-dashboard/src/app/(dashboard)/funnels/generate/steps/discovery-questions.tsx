'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  QuestionMarkCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type { MarketingMethodology, DiscoveryQuestion } from '@/lib/api/ai-funnel';

interface DiscoveryQuestionsStepProps {
  methodology: MarketingMethodology;
  questions: DiscoveryQuestion[];
  answers: Record<string, string>;
  onSubmit: (answers: Record<string, string>) => void;
  onBack: () => void;
}

export function DiscoveryQuestionsStep({
  methodology,
  questions,
  answers: initialAnswers,
  onSubmit,
  onBack,
}: DiscoveryQuestionsStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [showHelp, setShowHelp] = useState<string | null>(null);

  const handleChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    // Validate required questions
    const unansweredRequired = questions.filter(
      q => q.required && !answers[q.id]?.trim()
    );

    if (unansweredRequired.length > 0) {
      toast.error(`Please answer all required questions (${unansweredRequired.length} remaining)`);
      return;
    }

    onSubmit(answers);
  };

  const answeredCount = questions.filter(q => answers[q.id]?.trim()).length;
  const requiredCount = questions.filter(q => q.required).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tell Us About Your Product
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Your answers help the AI create more targeted, effective copy.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {answeredCount} of {questions.length} questions answered
        </span>
        <span className="text-sm text-purple-600 dark:text-purple-400">
          {requiredCount} required
        </span>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
          >
            {/* Question header */}
            <div className="flex items-start justify-between mb-3">
              <label className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {question.question}
                  {question.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </span>
              </label>
              {question.helpText && (
                <button
                  onClick={() => setShowHelp(showHelp === question.id ? null : question.id)}
                  className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  <QuestionMarkCircleIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Help text */}
            {showHelp === question.id && question.helpText && (
              <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-start gap-2">
                <InformationCircleIcon className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {question.helpText}
                </p>
              </div>
            )}

            {/* Input field */}
            {question.type === 'text' && (
              <input
                type="text"
                value={answers[question.id] || ''}
                onChange={e => handleChange(question.id, e.target.value)}
                placeholder={question.placeholder}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            )}

            {question.type === 'textarea' && (
              <textarea
                value={answers[question.id] || ''}
                onChange={e => handleChange(question.id, e.target.value)}
                placeholder={question.placeholder}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            )}

            {question.type === 'select' && question.options && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {question.options.map(option => (
                  <button
                    key={option}
                    onClick={() => handleChange(question.id, option)}
                    className={`
                      p-3 rounded-lg border-2 text-sm font-medium transition-colors
                      ${answers[question.id] === option
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-300'}
                    `}
                  >
                    {option.split(' - ')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Generate Funnel
        </button>
      </div>
    </div>
  );
}
