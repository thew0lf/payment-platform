'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import type { MarketingMethodology, DiscoveryQuestion } from '@/lib/api/ai-funnel';

interface DiscoveryQuestionsStepProps {
  methodology: MarketingMethodology;
  questions: DiscoveryQuestion[];
  answers: Record<string, string>;
  miSuggestions?: Record<string, string>;
  onSubmit: (answers: Record<string, string>) => void;
  onSaveDraft?: (answers: Record<string, string>) => void;
  onBack: () => void;
  isSavingDraft?: boolean;
}

export function DiscoveryQuestionsStep({
  methodology,
  questions,
  answers: initialAnswers,
  miSuggestions = {},
  onSubmit,
  onSaveDraft,
  onBack,
  isSavingDraft = false,
}: DiscoveryQuestionsStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [showHelp, setShowHelp] = useState<string | null>(null);

  // Check if answer is using MI suggestion
  const isUsingMISuggestion = (questionId: string) => {
    return miSuggestions[questionId] && answers[questionId] === miSuggestions[questionId];
  };

  // Check if MI has a suggestion for this question
  const hasMISuggestion = (questionId: string) => {
    return !!miSuggestions[questionId];
  };

  // Apply MI suggestion to a question
  const applyMISuggestion = (questionId: string) => {
    if (miSuggestions[questionId]) {
      setAnswers(prev => ({ ...prev, [questionId]: miSuggestions[questionId] }));
    }
  };

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

      {/* MI Suggestions Banner */}
      {Object.keys(miSuggestions).length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
              MI has pre-filled {Object.keys(miSuggestions).length} answers based on your products
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Review and customize as needed — look for the <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 dark:bg-purple-800 rounded text-purple-700 dark:text-purple-300 text-xs font-medium"><SparklesIcon className="h-3 w-3 mr-0.5" />MI</span> badge
            </p>
          </div>
        </div>
      )}

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
        {questions.map((question, index) => {
          const hasSuggestion = hasMISuggestion(question.id);
          const isUsingSuggestion = isUsingMISuggestion(question.id);
          const hasModified = hasSuggestion && !isUsingSuggestion && answers[question.id];

          return (
          <div
            key={question.id}
            className={`p-5 bg-white dark:bg-gray-800 rounded-xl border transition-colors ${
              isUsingSuggestion
                ? 'border-purple-300 dark:border-purple-700 ring-1 ring-purple-200 dark:ring-purple-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
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
              <div className="flex items-center gap-2">
                {/* MI Badge */}
                {hasSuggestion && isUsingSuggestion && (
                  <span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300">
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    MI Suggested
                  </span>
                )}
                {/* Use MI Suggestion button (when modified) */}
                {hasModified && (
                  <button
                    onClick={() => applyMISuggestion(question.id)}
                    className="inline-flex items-center px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded text-xs font-medium text-purple-600 dark:text-purple-400 transition-colors"
                  >
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    Use MI
                  </button>
                )}
                {question.helpText && (
                  <button
                    onClick={() => setShowHelp(showHelp === question.id ? null : question.id)}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <QuestionMarkCircleIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
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
                className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  isUsingSuggestion
                    ? 'border-purple-300 dark:border-purple-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            )}

            {question.type === 'textarea' && (
              <textarea
                value={answers[question.id] || ''}
                onChange={e => handleChange(question.id, e.target.value)}
                placeholder={question.placeholder}
                rows={3}
                className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${
                  isUsingSuggestion
                    ? 'border-purple-300 dark:border-purple-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            )}

            {question.type === 'select' && question.options && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {question.options.map(option => {
                  const isSelected = answers[question.id] === option;
                  const isMISuggested = miSuggestions[question.id] === option;

                  return (
                  <button
                    key={option}
                    onClick={() => handleChange(question.id, option)}
                    className={`
                      relative p-3 rounded-lg border-2 text-sm font-medium transition-colors
                      ${isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-300'}
                    `}
                  >
                    {isMISuggested && !isSelected && (
                      <span className="absolute -top-1 -right-1 p-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                        <SparklesIcon className="h-3 w-3 text-white" />
                      </span>
                    )}
                    {option.split(' - ')[0]}
                  </button>
                  );
                })}
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Back
        </button>
        <div className="flex gap-3">
          {onSaveDraft && (
            <button
              onClick={() => onSaveDraft(answers)}
              disabled={isSavingDraft}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              {isSavingDraft ? 'Saving...' : 'Save Draft'}
            </button>
          )}
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Generate Funnel
          </button>
        </div>
      </div>
    </div>
  );
}
