import React, { useState } from 'react';
import { 
  CreditCard, 
  Building2, 
  Users, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Command,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Receipt,
  Wallet,
  GitBranch,
  Shield,
  Zap,
  MoreHorizontal,
  Check,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

// Modern Payment Platform Dashboard - avnz.io
// Stripe/Linear inspired with multi-tenant hierarchy

export default function PaymentDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('Velocity Agency');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Sample hierarchy data
  const organizations = [
    { 
      name: 'Velocity Agency', 
      companies: ['CoffeeCo', 'FitBox', 'PetPals'],
      revenue: 127832,
      transactions: 4234
    },
    { 
      name: 'Digital First', 
      companies: ['SaaSly', 'CloudNine'],
      revenue: 89420,
      transactions: 2891
    }
  ];

  const currentOrg = organizations.find(o => o.name === selectedOrg);

  const transactions = [
    { id: 'txn_1N2k3L', customer: 'sarah@coffeeco.com', amount: 26.95, status: 'succeeded', method: 'Visa •••• 4242', time: '2 min ago', company: 'CoffeeCo' },
    { id: 'txn_1N2k3M', customer: 'mike@fitbox.io', amount: 49.99, status: 'succeeded', method: 'Mastercard •••• 8888', time: '5 min ago', company: 'FitBox' },
    { id: 'txn_1N2k3N', customer: 'jen@petpals.com', amount: 34.95, status: 'pending', method: 'Amex •••• 1234', time: '8 min ago', company: 'PetPals' },
    { id: 'txn_1N2k3O', customer: 'alex@coffeeco.com', amount: 26.95, status: 'succeeded', method: 'Visa •••• 9876', time: '12 min ago', company: 'CoffeeCo' },
    { id: 'txn_1N2k3P', customer: 'chris@fitbox.io', amount: 99.99, status: 'failed', method: 'Visa •••• 5555', time: '15 min ago', company: 'FitBox' },
    { id: 'txn_1N2k3Q', customer: 'dana@petpals.com', amount: 24.95, status: 'succeeded', method: 'Mastercard •••• 3333', time: '18 min ago', company: 'PetPals' },
  ];

  const filteredTransactions = selectedCompany 
    ? transactions.filter(t => t.company === selectedCompany)
    : transactions;

  const StatusBadge = ({ status }) => {
    const styles = {
      succeeded: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      failed: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    const icons = {
      succeeded: <Check className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const MetricCard = ({ title, value, change, changeType, icon: Icon, subtitle }) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all hover:bg-zinc-900/80">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-500 text-sm font-medium">{title}</p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          {subtitle && <p className="text-zinc-600 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 bg-zinc-800 rounded-lg">
          <Icon className="w-5 h-5 text-zinc-400" />
        </div>
      </div>
      {change && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${changeType === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {changeType === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{change}</span>
          <span className="text-zinc-600">vs last month</span>
        </div>
      )}
    </div>
  );

  const NavItem = ({ icon: Icon, label, id, badge }) => (
    <button
      onClick={() => setActiveNav(id)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        activeNav === id 
          ? 'bg-zinc-800 text-white' 
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {!sidebarCollapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {badge && (
            <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Command Palette Overlay */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-32" onClick={() => setShowCommandPalette(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
              <Search className="w-5 h-5 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search transactions, companies, or commands..." 
                className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500"
                autoFocus
              />
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500">ESC</kbd>
            </div>
            <div className="p-2">
              <p className="px-3 py-2 text-xs text-zinc-600 font-medium">QUICK ACTIONS</p>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800">
                <Plus className="w-4 h-4" /> Create new company
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800">
                <CreditCard className="w-4 h-4" /> Add payment provider
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800">
                <Download className="w-4 h-4" /> Export transactions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-zinc-900/50 border-r border-zinc-800 flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                avnz.io
              </span>
            )}
          </div>
        </div>

        {/* Org Switcher */}
        <div className="p-3 border-b border-zinc-800">
          <button 
            onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
            className="w-full flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">
              {selectedOrg.charAt(0)}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">{selectedOrg}</p>
                  <p className="text-xs text-zinc-500">{currentOrg?.companies.length} companies</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showOrgSwitcher ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
          
          {/* Org Dropdown */}
          {showOrgSwitcher && !sidebarCollapsed && (
            <div className="mt-2 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
              {organizations.map(org => (
                <button
                  key={org.name}
                  onClick={() => { setSelectedOrg(org.name); setShowOrgSwitcher(false); setSelectedCompany(null); }}
                  className={`w-full flex items-center gap-2 p-2 text-sm hover:bg-zinc-700 ${selectedOrg === org.name ? 'bg-zinc-700' : ''}`}
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center text-xs font-bold">
                    {org.name.charAt(0)}
                  </div>
                  <span className="text-zinc-300">{org.name}</span>
                  {selectedOrg === org.name && <Check className="w-4 h-4 text-cyan-400 ml-auto" />}
                </button>
              ))}
              <div className="border-t border-zinc-700">
                <button className="w-full flex items-center gap-2 p-2 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white">
                  <Plus className="w-4 h-4" /> Add organization
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Company Filter */}
        {!sidebarCollapsed && (
          <div className="px-3 py-2">
            <p className="text-xs text-zinc-600 font-medium mb-2 px-2">COMPANIES</p>
            <button
              onClick={() => setSelectedCompany(null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                !selectedCompany ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              All Companies
            </button>
            {currentOrg?.companies.map(company => (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  selectedCompany === company ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <div className="w-4 h-4 rounded bg-zinc-700 flex items-center justify-center text-[10px]">
                  {company.charAt(0)}
                </div>
                {company}
              </button>
            ))}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
          <NavItem icon={Receipt} label="Transactions" id="transactions" badge="12" />
          <NavItem icon={CreditCard} label="Payment Methods" id="payments" />
          <NavItem icon={Users} label="Customers" id="customers" />
          <NavItem icon={GitBranch} label="Routing Rules" id="routing" />
          <NavItem icon={Wallet} label="Payouts" id="payouts" />
          
          <div className="pt-4">
            <p className="text-xs text-zinc-600 font-medium mb-2 px-3">SETTINGS</p>
            <NavItem icon={Building2} label="Team" id="team" />
            <NavItem icon={Shield} label="Security" id="security" />
            <NavItem icon={Settings} label="Settings" id="settings" />
          </div>
        </nav>

        {/* Value Metric - NCI: Continuous value reminder */}
        {!sidebarCollapsed && (
          <div className="p-3 mx-3 mb-3 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-xs text-emerald-400 font-medium">TIME SAVED THIS MONTH</p>
            <p className="text-2xl font-bold text-white mt-1">18.5 hrs</p>
            <p className="text-xs text-zinc-500 mt-1">≈ $1,110 in labor costs</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <div className="flex items-center gap-1 ml-4">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">⌘</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">K</kbd>
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
              B
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <span>{selectedOrg}</span>
                {selectedCompany && (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-zinc-300">{selectedCompany}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors">
                <RefreshCw className="w-4 h-4" />
                Sync
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-cyan-500 hover:bg-cyan-400 rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                New Transaction
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard 
              title="Total Revenue" 
              value={`$${(selectedCompany ? Math.floor(currentOrg.revenue / 3) : currentOrg.revenue).toLocaleString()}`}
              change="12.5%"
              changeType="up"
              icon={TrendingUp}
              subtitle="This month"
            />
            <MetricCard 
              title="Transactions" 
              value={(selectedCompany ? Math.floor(currentOrg.transactions / 3) : currentOrg.transactions).toLocaleString()}
              change="8.2%"
              changeType="up"
              icon={Receipt}
              subtitle="This month"
            />
            <MetricCard 
              title="Active Subscriptions" 
              value={selectedCompany ? "487" : "1,423"}
              change="3.1%"
              changeType="up"
              icon={Users}
              subtitle="Current"
            />
            <MetricCard 
              title="Failed Payments" 
              value={selectedCompany ? "12" : "34"}
              change="2.3%"
              changeType="down"
              icon={AlertCircle}
              subtitle="Needs attention"
            />
          </div>

          {/* Gateway Status - NCI: Shows value of multi-provider setup */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Payment Providers</h2>
                <button className="text-sm text-cyan-400 hover:text-cyan-300">Manage</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: 'PayPal Payflow', status: 'healthy', volume: '$47,832', rate: '2.4%' },
                  { name: 'Stripe', status: 'healthy', volume: '$62,450', rate: '2.9%' },
                  { name: 'NMI', status: 'degraded', volume: '$17,550', rate: '2.1%' }
                ].map(provider => (
                  <div key={provider.name} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{provider.name}</span>
                      <span className={`w-2 h-2 rounded-full ${provider.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    </div>
                    <p className="text-lg font-semibold text-white">{provider.volume}</p>
                    <p className="text-xs text-zinc-500">Avg rate: {provider.rate}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Routing Savings - NCI: Value proof */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-medium text-white">Smart Routing</h2>
              </div>
              <p className="text-3xl font-bold text-white mb-1">$234</p>
              <p className="text-sm text-zinc-400 mb-4">Saved in fees this month</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">High-value → NMI</span>
                  <span className="text-emerald-400">-$156</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Intl → PayPal</span>
                  <span className="text-emerald-400">-$78</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-lg font-medium text-white">Recent Transactions</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Transaction</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Customer</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Company</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Method</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Time</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn, i) => (
                    <tr key={txn.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-sm font-mono text-zinc-300">{txn.id}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-zinc-300">{txn.customer}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
                          <span className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center text-[10px] font-medium">
                            {txn.company.charAt(0)}
                          </span>
                          {txn.company}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-white">${txn.amount.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={txn.status} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-zinc-400">{txn.method}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-zinc-500">{txn.time}</span>
                      </td>
                      <td className="px-5 py-4">
                        <button className="p-1 text-zinc-500 hover:text-white rounded transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
              <span className="text-sm text-zinc-500">Showing {filteredTransactions.length} transactions</span>
              <button className="text-sm text-cyan-400 hover:text-cyan-300">View all →</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
