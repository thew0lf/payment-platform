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
