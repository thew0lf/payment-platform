import React, { useState } from 'react';

// Modern Payment Platform Dashboard - avnz.io
// Stripe/Linear inspired with multi-tenant hierarchy

export default function PaymentDashboard() {
  const [selectedOrg, setSelectedOrg] = useState('Velocity Agency');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const organizations = [
    { name: 'Velocity Agency', companies: ['CoffeeCo', 'FitBox', 'PetPals'], revenue: 127832, transactions: 4234 },
    { name: 'Digital First', companies: ['SaaSly', 'CloudNine'], revenue: 89420, transactions: 2891 }
  ];

  const currentOrg = organizations.find(o => o.name === selectedOrg);

  const transactions = [
    { id: 'txn_1N2k3L', customer: 'sarah@coffeeco.com', amount: 26.95, status: 'succeeded', method: 'Visa •••• 4242', time: '2 min ago', company: 'CoffeeCo' },
    { id: 'txn_1N2k3M', customer: 'mike@fitbox.io', amount: 49.99, status: 'succeeded', method: 'Mastercard •••• 8888', time: '5 min ago', company: 'FitBox' },
    { id: 'txn_1N2k3N', customer: 'jen@petpals.com', amount: 34.95, status: 'pending', method: 'Amex •••• 1234', time: '8 min ago', company: 'PetPals' },
    { id: 'txn_1N2k3O', customer: 'alex@coffeeco.com', amount: 26.95, status: 'succeeded', method: 'Visa •••• 9876', time: '12 min ago', company: 'CoffeeCo' },
    { id: 'txn_1N2k3P', customer: 'chris@fitbox.io', amount: 99.99, status: 'failed', method: 'Visa •••• 5555', time: '15 min ago', company: 'FitBox' },
  ];

  const filteredTransactions = selectedCompany 
    ? transactions.filter(t => t.company === selectedCompany)
    : transactions;

  const StatusBadge = ({ status }) => {
    const styles = {
      succeeded: 'bg-emerald-500/20 text-emerald-400',
      pending: 'bg-amber-500/20 text-amber-400',
      failed: 'bg-red-500/20 text-red-400'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24" onClick={() => setShowCommandPalette(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search transactions, companies..." className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500" autoFocus />
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500">ESC</kbd>
            </div>
            <div className="p-2">
              <p className="px-3 py-2 text-xs text-zinc-600 font-medium">QUICK ACTIONS</p>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800">
                <span className="w-4 h-4">+</span> Create new company
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800">
                <span className="w-4 h-4">💳</span> Add payment provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">⚡</span>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">avnz.io</span>
          </div>
        </div>

        {/* Org Switcher */}
        <div className="p-3 border-b border-zinc-800">
          <button onClick={() => setShowOrgSwitcher(!showOrgSwitcher)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">
              {selectedOrg.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white truncate">{selectedOrg}</p>
              <p className="text-xs text-zinc-500">{currentOrg?.companies.length} companies</p>
            </div>
            <span className={`text-zinc-500 transition-transform ${showOrgSwitcher ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {showOrgSwitcher && (
            <div className="mt-2 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
              {organizations.map(org => (
                <button key={org.name} onClick={() => { setSelectedOrg(org.name); setShowOrgSwitcher(false); setSelectedCompany(null); }}
                  className={`w-full flex items-center gap-2 p-2 text-sm hover:bg-zinc-700 ${selectedOrg === org.name ? 'bg-zinc-700' : ''}`}>
                  <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center text-xs font-bold">{org.name.charAt(0)}</div>
                  <span className="text-zinc-300">{org.name}</span>
                  {selectedOrg === org.name && <span className="ml-auto text-cyan-400">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Company Filter */}
        <div className="px-3 py-2">
          <p className="text-xs text-zinc-600 font-medium mb-2 px-2">COMPANIES</p>
          <button onClick={() => setSelectedCompany(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${!selectedCompany ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
            🏢 All Companies
          </button>
          {currentOrg?.companies.map(company => (
            <button key={company} onClick={() => setSelectedCompany(company)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${selectedCompany === company ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
              <span className="w-4 h-4 rounded bg-zinc-700 flex items-center justify-center text-[10px]">{company.charAt(0)}</span>
              {company}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'transactions', icon: '📋', label: 'Transactions', badge: '12' },
            { id: 'payments', icon: '💳', label: 'Payment Methods' },
            { id: 'customers', icon: '👥', label: 'Customers' },
            { id: 'routing', icon: '🔀', label: 'Routing Rules' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeNav === item.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
              <span>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">{item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Value Metric */}
        <div className="p-3 mx-3 mb-3 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl">
          <p className="text-xs text-emerald-400 font-medium">TIME SAVED THIS MONTH</p>
          <p className="text-2xl font-bold text-white mt-1">18.5 hrs</p>
          <p className="text-xs text-zinc-500 mt-1">≈ $1,110 in labor costs</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
          <button onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:border-zinc-700">
            🔍 Search...
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs ml-4">⌘K</kbd>
          </button>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
              🔔 <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">B</div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <span>{selectedOrg}</span>
                {selectedCompany && <><span>→</span><span className="text-zinc-300">{selectedCompany}</span></>}
              </div>
              <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-cyan-500 hover:bg-cyan-400 rounded-lg">
              + New Transaction
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { title: 'Total Revenue', value: `$${(selectedCompany ? Math.floor(currentOrg.revenue / 3) : currentOrg.revenue).toLocaleString()}`, change: '+12.5%', icon: '📈' },
              { title: 'Transactions', value: (selectedCompany ? Math.floor(currentOrg.transactions / 3) : currentOrg.transactions).toLocaleString(), change: '+8.2%', icon: '📋' },
              { title: 'Active Subscriptions', value: selectedCompany ? '487' : '1,423', change: '+3.1%', icon: '👥' },
              { title: 'Failed Payments', value: selectedCompany ? '12' : '34', change: '-2.3%', icon: '⚠️', negative: true },
            ].map((metric, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-zinc-500 text-sm">{metric.title}</p>
                    <p className="text-2xl font-semibold text-white mt-1">{metric.value}</p>
                  </div>
                  <span className="text-xl">{metric.icon}</span>
                </div>
                <p className={`text-sm mt-2 ${metric.negative ? 'text-emerald-400' : 'text-emerald-400'}`}>{metric.change} vs last month</p>
              </div>
            ))}
          </div>

          {/* Payment Providers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-lg font-medium text-white mb-4">Payment Providers</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'PayPal Payflow', status: 'healthy', volume: '$47,832' },
                  { name: 'Stripe', status: 'healthy', volume: '$62,450' },
                  { name: 'NMI', status: 'degraded', volume: '$17,550' }
                ].map(p => (
                  <div key={p.name} className="p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      <span className={`w-2 h-2 rounded-full ${p.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    </div>
                    <p className="text-lg font-semibold text-white">{p.volume}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-5">
              <h2 className="text-lg font-medium text-white mb-2">🔀 Smart Routing</h2>
              <p className="text-3xl font-bold text-white">$234</p>
              <p className="text-sm text-zinc-400 mb-4">Saved in fees this month</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">High-value → NMI</span><span className="text-emerald-400">-$156</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Intl → PayPal</span><span className="text-emerald-400">-$78</span></div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-medium text-white">Recent Transactions</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800">Filter</button>
                <button className="px-3 py-1.5 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800">Export</button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase">
                    <th className="text-left px-4 py-3 font-medium">Transaction</th>
                    <th className="text-left px-4 py-3 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 font-medium">Company</th>
                    <th className="text-left px-4 py-3 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(txn => (
                    <tr key={txn.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono text-sm text-zinc-300">{txn.id}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{txn.customer}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{txn.company}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white">${txn.amount.toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={txn.status} /></td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{txn.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <span className="text-sm text-zinc-500">Showing {filteredTransactions.length} transactions</span>
              <button className="text-sm text-cyan-400 hover:text-cyan-300">View all →</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
