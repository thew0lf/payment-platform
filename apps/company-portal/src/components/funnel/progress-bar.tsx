'use client';

import { CheckIcon } from '@heroicons/react/24/solid';
import { FunnelStage } from '@/lib/api';

interface ProgressBarProps {
  progress: number;
  stages: FunnelStage[];
  currentIndex: number;
}

export function ProgressBar({ stages, currentIndex }: ProgressBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 py-4">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {stages.map((stage, index) => (
              <li
                key={stage.id}
                className={`flex items-center ${index !== stages.length - 1 ? 'flex-1' : ''}`}
              >
                <div className="flex items-center">
                  <span
                    className={`
                      relative flex h-8 w-8 items-center justify-center rounded-full
                      ${index < currentIndex
                        ? 'bg-[var(--primary-color)]'
                        : index === currentIndex
                        ? 'border-2 border-[var(--primary-color)] bg-white'
                        : 'border-2 border-gray-300 bg-white'
                      }
                    `}
                  >
                    {index < currentIndex ? (
                      <CheckIcon className="h-5 w-5 text-white" />
                    ) : (
                      <span
                        className={`
                          h-2.5 w-2.5 rounded-full
                          ${index === currentIndex ? 'bg-[var(--primary-color)]' : 'bg-transparent'}
                        `}
                      />
                    )}
                  </span>
                  <span
                    className={`
                      ml-3 text-sm font-medium
                      ${index <= currentIndex ? 'text-gray-900' : 'text-gray-500'}
                      hidden sm:block
                    `}
                  >
                    {stage.name}
                  </span>
                </div>

                {index !== stages.length - 1 && (
                  <div className="flex-1 ml-4 mr-4">
                    <div className="h-0.5 w-full bg-gray-200">
                      <div
                        className="h-0.5 bg-[var(--primary-color)] transition-all duration-300"
                        style={{ width: index < currentIndex ? '100%' : '0%' }}
                      />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}
