# Implementation Part 6: All Page Routes

## File: apps/admin-dashboard/src/app/(dashboard)/transactions/page.tsx

```typescript
'use client';

import React, { useState } from 'react';
import { Filter, Download, Plus, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

// Mock data
const mockTransactions = [
  { id: 'txn_1', number: 'txn_1N2k3L', email: 'sarah@example.com', company: 'CoffeeCo', companyId: 'company_1', amount: 26.95, status: 'COMPLETED', provider: 'PayPal', createdAt: new Date(Date.now() - 2 * 60000) },
  { id: 'txn_2', number: 'txn_1N2k3M', email: 'mike@example.com', company: 'FitBox', companyId: 'company_2', amount: 49.99, status: 'COMPLETED', provider: 'Stripe', createdAt: new Date(Date.now() - 5 * 60000) },
  { id: 'txn_3', number: 'txn_1N2k3N', email: 'jen@example.com', company: 'PetPals', companyId: 'company_3', amount: 34.95, status: 'PENDING', provider: 'NMI', createdAt: new Date(Date.now() - 8 * 60000) },
  { id: 'txn_4', number: 'txn_1N2k3O', email: 'alex@example.com', company: 'CoffeeCo', companyId: 'company_1', amount: 26.95, status: 'COMPLETED', provider: 'PayPal', createdAt: new Date(Date.now() - 12 * 60000) },
  { id: 'txn_5', number: 'txn_1N2k3P', email: 'chris@example.com', company: 'FitBox', companyId: 'company_2', amount: 99.99, status: 'FAILED', provider: 'Stripe', createdAt: new Date(Date.now() - 15 * 60000) },
  { id: 'txn_6', number: 'txn_1N2k3Q', email: 'dana@example.com', company: 'PetPals', companyId: 'company_3', amount: 24.95, status: 'COMPLETED', provider: 'NMI', createdAt: new Date(Date.now() - 18 * 60000) },
  { id: 'txn_7', number: 'txn_1N2k3R', email: 'evan@example.com', company: 'CoffeeCo', companyId: 'company_1', amount: 53.90, status: 'COMPLETED', provider: 'PayPal', createdAt: new Date(Date.now() - 25 * 60000) },
  { id: 'txn_8', number: 'txn_1N2k3S', email: 'fiona@example.com', company: 'FitBox', companyId: 'company_2', amount: 149.99, status: 'REFUNDED', provider: 'Stripe', createdAt: new Date(Date.now() - 45 * 60000) },
];

export default function TransactionsPage() {
  const { selectedCompanyId, selectedClientId, availableCompanies } = useHierarchy();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Filter transactions
  const filteredTransactions = React.useMemo(() => {
    let result = [...mockTransactions];
    
    // Hierarchy filter
    if (selectedCompanyId) {
      result = result.filter(t => t.companyId === selectedCompanyId);
    } else if (selectedClientId) {
      const clientCompanyIds = availableCompanies
        .filter(c => c.clientId === selectedClientId)
        .map(c => c.id);
      result = result.filter(t => clientCompanyIds.includes(t.companyId));
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t => 
        t.number.toLowerCase().includes(searchLower) ||
        t.email.toLowerCase().includes(searchLower)
      );
    }
    
    // Status filter
    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    }
    
    return result;
  }, [selectedCompanyId, selectedClientId, availableCompanies, search, statusFilter]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
      COMPLETED: 'success',
      PENDING: 'warning',
      FAILED: 'destructive',
      REFUNDED: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toLowerCase()}</Badge>;
  };

  return (
    <>
      <Header
        title="Transactions"
        subtitle={`${filteredTransactions.length} transactions`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            {['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              >
                {status.toLowerCase()}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Customer</TableHead>
                {!selectedCompanyId && <TableHead>Company</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map(txn => (
                <TableRow key={txn.id}>
                  <TableCell className="font-mono text-sm">{txn.number}</TableCell>
                  <TableCell>{txn.email}</TableCell>
                  {!selectedCompanyId && <TableCell>{txn.company}</TableCell>}
                  <TableCell className="font-medium">{formatCurrency(txn.amount)}</TableCell>
                  <TableCell>{getStatusBadge(txn.status)}</TableCell>
                  <TableCell className="text-zinc-400">{txn.provider}</TableCell>
                  <TableCell className="text-zinc-500">{formatRelativeTime(txn.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
```

---

## File: apps/admin-dashboard/src/app/(dashboard)/customers/page.tsx

```typescript
'use client';

import React, { useState } from 'react';
import { Search, Plus, Mail, MoreHorizontal } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { formatCurrency, formatDate } from '@/lib/utils';

const mockCustomers = [
  { id: 'c1', email: 'sarah.chen@example.com', name: 'Sarah Chen', company: 'CoffeeCo', companyId: 'company_1', status: 'ACTIVE', totalSpent: 324.75, orders: 12, createdAt: new Date('2024-01-15') },
  { id: 'c2', email: 'mike.torres@example.com', name: 'Mike Torres', company: 'FitBox', companyId: 'company_2', status: 'ACTIVE', totalSpent: 899.99, orders: 8, createdAt: new Date('2024-02-20') },
  { id: 'c3', email: 'jen.lee@example.com', name: 'Jen Lee', company: 'PetPals', companyId: 'company_3', status: 'ACTIVE', totalSpent: 156.80, orders: 5, createdAt: new Date('2024-03-10') },
  { id: 'c4', email: 'alex.kim@example.com', name: 'Alex Kim', company: 'CoffeeCo', companyId: 'company_1', status: 'INACTIVE', totalSpent: 89.85, orders: 3, createdAt: new Date('2024-01-25') },
  { id: 'c5', email: 'chris.wong@example.com', name: 'Chris Wong', company: 'FitBox', companyId: 'company_2', status: 'ACTIVE', totalSpent: 549.95, orders: 6, createdAt: new Date('2024-02-05') },
];

export default function CustomersPage() {
  const { selectedCompanyId, selectedClientId, availableCompanies } = useHierarchy();
  const [search, setSearch] = useState('');

  const filteredCustomers = React.useMemo(() => {
    let result = [...mockCustomers];
    
    if (selectedCompanyId) {
      result = result.filter(c => c.companyId === selectedCompanyId);
    } else if (selectedClientId) {
      const clientCompanyIds = availableCompanies
        .filter(c => c.clientId === selectedClientId)
        .map(c => c.id);
      result = result.filter(c => clientCompanyIds.includes(c.companyId));
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [selectedCompanyId, selectedClientId, availableCompanies, search]);

  return (
    <>
      <Header
        title="Customers"
        subtitle={`${filteredCustomers.length} customers`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                {!selectedCompanyId && <TableHead>Company</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-white">{customer.name}</p>
                      <p className="text-sm text-zinc-500">{customer.email}</p>
                    </div>
                  </TableCell>
                  {!selectedCompanyId && <TableCell>{customer.company}</TableCell>}
                  <TableCell>
                    <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'default'}>
                      {customer.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(customer.totalSpent)}</TableCell>
                  <TableCell>{customer.orders}</TableCell>
                  <TableCell className="text-zinc-500">{formatDate(customer.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-zinc-500 hover:text-white rounded">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-zinc-500 hover:text-white rounded">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
```

---

## File: apps/admin-dashboard/src/app/(dashboard)/routing/page.tsx

```typescript
'use client';

import React from 'react';
import { Plus, GitBranch, ArrowRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mockRules = [
  {
    id: 'rule_1',
    name: 'High-Value to NMI',
    description: 'Route transactions over $500 to NMI for lower fees',
    condition: 'amount > 500',
    action: 'route_to_nmi',
    provider: 'NMI',
    isActive: true,
    savings: 156,
    transactions: 234,
  },
  {
    id: 'rule_2',
    name: 'International to PayPal',
    description: 'Route international transactions to PayPal',
    condition: 'currency != USD',
    action: 'route_to_paypal',
    provider: 'PayPal Payflow',
    isActive: true,
    savings: 78,
    transactions: 89,
  },
  {
    id: 'rule_3',
    name: 'Subscription Renewal',
    description: 'Route subscription renewals to Stripe',
    condition: 'type == subscription',
    action: 'route_to_stripe',
    provider: 'Stripe',
    isActive: false,
    savings: 0,
    transactions: 0,
  },
];

export default function RoutingPage() {
  return (
    <>
      <Header
        title="Routing Rules"
        subtitle="Configure intelligent payment routing"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Active Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">
                {mockRules.filter(r => r.isActive).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Total Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-400">
                ${mockRules.reduce((acc, r) => acc + r.savings, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Routed Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">
                {mockRules.reduce((acc, r) => acc + r.transactions, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          {mockRules.map(rule => (
            <Card key={rule.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-zinc-800 rounded-lg">
                      <GitBranch className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white">{rule.name}</h3>
                        <Badge variant={rule.isActive ? 'success' : 'default'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">{rule.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <code className="px-2 py-1 bg-zinc-800 rounded text-cyan-400">
                          {rule.condition}
                        </code>
                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                        <span className="text-zinc-300">{rule.provider}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {rule.isActive && (
                      <div className="text-right">
                        <p className="text-sm text-zinc-400">Saved</p>
                        <p className="text-lg font-semibold text-emerald-400">${rule.savings}</p>
                      </div>
                    )}
                    <button className="p-2 text-zinc-400 hover:text-white">
                      {rule.isActive ? (
                        <ToggleRight className="w-6 h-6 text-cyan-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
```

---

## File: apps/admin-dashboard/src/app/(dashboard)/admin/clients/page.tsx

```typescript
'use client';

import React from 'react';
import { Plus, Building, Users, CreditCard, MoreHorizontal } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminClientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { availableClients, availableCompanies } = useHierarchy();

  // Redirect if not org level
  useEffect(() => {
    if (user && user.scopeType !== 'ORGANIZATION') {
      router.push('/');
    }
  }, [user, router]);

  if (user?.scopeType !== 'ORGANIZATION') {
    return null;
  }

  return (
    <>
      <Header
        title="All Clients"
        subtitle={`${availableClients.length} agencies on the platform`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableClients.map(client => {
            const clientCompanies = availableCompanies.filter(c => c.clientId === client.id);
            const totalTransactions = clientCompanies.reduce(
              (acc, c) => acc + (c._count?.transactions || 0),
              0
            );
            const totalCustomers = clientCompanies.reduce(
              (acc, c) => acc + (c._count?.customers || 0),
              0
            );

            return (
              <Card key={client.id} className="hover:border-zinc-700 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-lg font-bold text-white">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{client.name}</h3>
                        <p className="text-sm text-zinc-500">{client.contactEmail}</p>
                      </div>
                    </div>
                    <button className="p-1 text-zinc-500 hover:text-white">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant={client.status === 'ACTIVE' ? 'success' : 'default'}>
                      {client.status.toLowerCase()}
                    </Badge>
                    <Badge variant="outline">{client.plan}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                        <Building className="w-3 h-3" />
                      </div>
                      <p className="text-lg font-semibold text-white">{clientCompanies.length}</p>
                      <p className="text-xs text-zinc-500">Companies</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                        <Users className="w-3 h-3" />
                      </div>
                      <p className="text-lg font-semibold text-white">{totalCustomers}</p>
                      <p className="text-xs text-zinc-500">Customers</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                        <CreditCard className="w-3 h-3" />
                      </div>
                      <p className="text-lg font-semibold text-white">{totalTransactions}</p>
                      <p className="text-xs text-zinc-500">Transactions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
```

---

## File: apps/admin-dashboard/src/app/(dashboard)/settings/page.tsx

```typescript
'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <Header title="Settings" subtitle="Manage your account and preferences" />

      <div className="p-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">First Name</label>
                <Input defaultValue={user?.firstName || ''} />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Last Name</label>
                <Input defaultValue={user?.lastName || ''} />
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Email</label>
              <Input defaultValue={user?.email || ''} disabled />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Current Password</label>
              <Input type="password" />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">New Password</label>
              <Input type="password" />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Confirm New Password</label>
              <Input type="password" />
            </div>
            <Button variant="outline">Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

---

## File: apps/admin-dashboard/src/app/(auth)/login/page.tsx

```typescript
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      // Error handled by context
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            avnz.io
          </span>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h1 className="text-xl font-semibold text-white text-center mb-2">
            Welcome back
          </h1>
          <p className="text-zinc-400 text-center text-sm mb-6">
            Sign in to your account
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 text-center mb-3">Demo accounts (password: demo123)</p>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Organization:</span>
                <code className="text-cyan-400">admin@avnz.io</code>
              </div>
              <div className="flex justify-between">
                <span>Client:</span>
                <code className="text-cyan-400">owner@velocityagency.com</code>
              </div>
              <div className="flex justify-between">
                <span>Company:</span>
                <code className="text-cyan-400">manager@coffeeco.com</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File: apps/admin-dashboard/src/app/(auth)/layout.tsx

```typescript
import { AuthProvider } from '@/contexts/auth-context';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

---

## File: apps/admin-dashboard/src/app/layout.tsx

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'avnz.io - Payment Platform',
  description: 'Multi-tenant payment orchestration platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

---

Continue to IMPLEMENTATION_07_API.md for backend API updates...
