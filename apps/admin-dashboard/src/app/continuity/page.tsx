'use client';

import { useState } from 'react';

interface ContinuityConfig {
  momentum: {
    enableMicroConfirmations: boolean;
    progressIndicatorStyle: 'steps' | 'progress' | 'minimal';
    autoAdvanceDelay: number;
  };
  trust: {
    showSecurityIndicators: boolean;
    displaySocialProof: boolean;
    transactionCountThreshold: number;
    showComplianceBadges: string[];
  };
  friction: {
    oneClickThreshold: number;
    confirmationRequired: number;
    stepUpAuthThreshold: number;
  };
  cognitive: {
    maxDecisionPoints: number;
    progressiveDisclosure: boolean;
    inlineValidation: boolean;
  };
}

interface Metrics {
  flowCompletionRate: number;
  averageTimeToPayment: number;
  abandonmentRate: number;
  trustScoreImpact: number;
  frictionEfficiency: number;
}

const defaultConfig: ContinuityConfig = {
  momentum: {
    enableMicroConfirmations: true,
    progressIndicatorStyle: 'steps',
    autoAdvanceDelay: 500,
  },
  trust: {
    showSecurityIndicators: true,
    displaySocialProof: true,
    transactionCountThreshold: 100,
    showComplianceBadges: ['PCI-DSS', 'SOC2', 'GDPR'],
  },
  friction: {
    oneClickThreshold: 100,
    confirmationRequired: 500,
    stepUpAuthThreshold: 1000,
  },
  cognitive: {
    maxDecisionPoints: 3,
    progressiveDisclosure: true,
    inlineValidation: true,
  },
};

const defaultMetrics: Metrics = {
  flowCompletionRate: 87.5,
  averageTimeToPayment: 45,
  abandonmentRate: 12.5,
  trustScoreImpact: 0.23,
  frictionEfficiency: 96.2,
};

export default function ContinuityPage() {
  const [config, setConfig] = useState<ContinuityConfig>(defaultConfig);
  const [metrics] = useState<Metrics>(defaultMetrics);
  const [activeTab, setActiveTab] = useState<'overview' | 'momentum' | 'trust' | 'friction' | 'cognitive'>('overview');

  const updateConfig = (section: keyof ContinuityConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Continuity Framework</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            NCI-based behavioral optimization for payment flows
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Based on Chase Hughes&apos; Non-Verbal Communication Influence / Engineered Reality
          </p>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <MetricCard
            label="Flow Completion"
            value={`${metrics.flowCompletionRate}%`}
            trend="up"
          />
          <MetricCard
            label="Avg. Time to Payment"
            value={`${metrics.averageTimeToPayment}s`}
            trend="down"
          />
          <MetricCard
            label="Abandonment Rate"
            value={`${metrics.abandonmentRate}%`}
            trend="down"
          />
          <MetricCard
            label="Trust Impact"
            value={`+${(metrics.trustScoreImpact * 100).toFixed(0)}%`}
            trend="up"
          />
          <MetricCard
            label="Friction Efficiency"
            value={`${metrics.frictionEfficiency}%`}
            trend="up"
          />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {(['overview', 'momentum', 'trust', 'friction', 'cognitive'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'momentum' && (
            <MomentumTab config={config.momentum} updateConfig={(k, v) => updateConfig('momentum', k, v)} />
          )}
          {activeTab === 'trust' && (
            <TrustTab config={config.trust} updateConfig={(k, v) => updateConfig('trust', k, v)} />
          )}
          {activeTab === 'friction' && (
            <FrictionTab config={config.friction} updateConfig={(k, v) => updateConfig('friction', k, v)} />
          )}
          {activeTab === 'cognitive' && (
            <CognitiveTab config={config.cognitive} updateConfig={(k, v) => updateConfig('cognitive', k, v)} />
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend }: { label: string; value: string; trend: 'up' | 'down' }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-center mt-1">
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        <span className={`ml-2 text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {trend === 'up' ? '↑' : '↓'}
        </span>
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Engineered Reality Framework</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-indigo-600 dark:text-indigo-400 mb-2">PRIME</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Set context before payment. Prepare the user mentally for the transaction
            through environmental cues and expectations.
          </p>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-indigo-600 dark:text-indigo-400 mb-2">FRAME</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Shape perception of value. Position the transaction in terms of benefit
            rather than cost using anchoring techniques.
          </p>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-indigo-600 dark:text-indigo-400 mb-2">ANCHOR</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Establish reference points. Use previous purchases and market context
            to normalize transaction amounts.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Continuity Layer</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">COMMIT</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Micro-yes sequences that build commitment through small agreements
              before the final payment action.
            </p>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">CONFIRM</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Validate the decision with appropriate friction. Ensure user confidence
              without creating doubt.
            </p>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">CLOSE</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Secure completion with clear success signals and immediate value
              confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MomentumTab({
  config,
  updateConfig,
}: {
  config: ContinuityConfig['momentum'];
  updateConfig: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Behavioral Momentum</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Maintain psychological commitment flow through the payment process.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900 dark:text-gray-100">Micro-Confirmations</label>
            <p className="text-sm text-gray-500 dark:text-gray-400">Show small success indicators at each step</p>
          </div>
          <Toggle
            enabled={config.enableMicroConfirmations}
            onChange={v => updateConfig('enableMicroConfirmations', v)}
          />
        </div>

        <div>
          <label className="font-medium text-gray-900 dark:text-gray-100">Progress Indicator Style</label>
          <select
            value={config.progressIndicatorStyle}
            onChange={e => updateConfig('progressIndicatorStyle', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="steps">Steps (1, 2, 3...)</option>
            <option value="progress">Progress Bar</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>

        <div>
          <label className="font-medium text-gray-900 dark:text-gray-100">Auto-Advance Delay (ms)</label>
          <input
            type="number"
            value={config.autoAdvanceDelay}
            onChange={e => updateConfig('autoAdvanceDelay', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Time before auto-advancing to next step</p>
        </div>
      </div>
    </div>
  );
}

function TrustTab({
  config,
  updateConfig,
}: {
  config: ContinuityConfig['trust'];
  updateConfig: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Trust Architecture</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Build trust through environmental cues that signal safety and reliability.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900 dark:text-gray-100">Security Indicators</label>
            <p className="text-sm text-gray-500 dark:text-gray-400">Show SSL/encryption badges</p>
          </div>
          <Toggle
            enabled={config.showSecurityIndicators}
            onChange={v => updateConfig('showSecurityIndicators', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900 dark:text-gray-100">Social Proof</label>
            <p className="text-sm text-gray-500 dark:text-gray-400">Display transaction counts and ratings</p>
          </div>
          <Toggle
            enabled={config.displaySocialProof}
            onChange={v => updateConfig('displaySocialProof', v)}
          />
        </div>

        <div>
          <label className="font-medium text-gray-900 dark:text-gray-100">Transaction Count Threshold</label>
          <input
            type="number"
            value={config.transactionCountThreshold}
            onChange={e => updateConfig('transactionCountThreshold', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Minimum transactions before showing count</p>
        </div>

        <div>
          <label className="font-medium text-gray-900 dark:text-gray-100">Compliance Badges</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {['PCI-DSS', 'SOC2', 'GDPR', 'HIPAA', 'ISO27001'].map(badge => (
              <button
                key={badge}
                onClick={() => {
                  const current = config.showComplianceBadges;
                  const updated = current.includes(badge)
                    ? current.filter(b => b !== badge)
                    : [...current, badge];
                  updateConfig('showComplianceBadges', updated);
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  config.showComplianceBadges.includes(badge)
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {badge}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FrictionTab({
  config,
  updateConfig,
}: {
  config: ContinuityConfig['friction'];
  updateConfig: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Friction Calibration</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Strategic use of friction - reducing it for legitimate actions, adding it to prevent errors.
      </p>

      <div className="space-y-4">
        <div>
          <label className="font-medium text-gray-900 dark:text-gray-100">One-Click Threshold ($)</label>
          <input
            type="number"
            value={config.oneClickThreshold}
            onChange={e => updateConfig('oneClickThreshold', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Max amount eligible for one-click payment</p>
        </div>

        <div>
          <label className="font-medium text-gray-900 dark:text-gray-100">Confirmation Required ($)</label>
          <input
            type="number"
            value={config.confirmationRequired}
            onChange={e => updateConfig('confirmationRequired', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Min amount requiring explicit confirmation</p>
        </div>

        <div>
          <label className="font-medium text-gray-900 dark:text-gray-100">Step-Up Auth Threshold ($)</label>
          <input
            type="number"
            value={config.stepUpAuthThreshold}
            onChange={e => updateConfig('stepUpAuthThreshold', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Amount triggering additional authentication</p>
        </div>

        {/* Friction Visualization */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Friction Zones</h3>
          <div className="relative h-8 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 dark:from-green-800 dark:via-yellow-800 dark:to-red-800 rounded">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-green-600"
              style={{ left: `${(config.oneClickThreshold / config.stepUpAuthThreshold) * 100}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-yellow-600"
              style={{ left: `${(config.confirmationRequired / config.stepUpAuthThreshold) * 100}%` }}
            />
            <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-red-600" />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>$0 (One-Click)</span>
            <span>${config.oneClickThreshold}</span>
            <span>${config.confirmationRequired}</span>
            <span>${config.stepUpAuthThreshold}+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CognitiveTab({
  config,
  updateConfig,
}: {
  config: ContinuityConfig['cognitive'];
  updateConfig: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Cognitive Continuity</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Maintain consistent mental models and reduce cognitive load during payment.
      </p>

      <div className="space-y-4">
        <div>
          <label className="font-medium text-gray-900 dark:text-gray-100">Max Decision Points</label>
          <input
            type="number"
            min="1"
            max="10"
            value={config.maxDecisionPoints}
            onChange={e => updateConfig('maxDecisionPoints', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Maximum choices presented in a single view</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900 dark:text-gray-100">Progressive Disclosure</label>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reveal complexity gradually</p>
          </div>
          <Toggle
            enabled={config.progressiveDisclosure}
            onChange={v => updateConfig('progressiveDisclosure', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900 dark:text-gray-100">Inline Validation</label>
            <p className="text-sm text-gray-500 dark:text-gray-400">Validate input without page reloads</p>
          </div>
          <Toggle
            enabled={config.inlineValidation}
            onChange={v => updateConfig('inlineValidation', v)}
          />
        </div>
      </div>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
