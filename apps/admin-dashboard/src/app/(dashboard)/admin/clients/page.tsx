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
