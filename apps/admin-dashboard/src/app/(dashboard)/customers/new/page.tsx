'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { customersApi } from '@/lib/api/customers';
import { useHierarchy } from '@/contexts/hierarchy-context';

export default function NewCustomerPage() {
  const router = useRouter();
  const { selectedCompanyId, accessLevel } = useHierarchy();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!selectedCompanyId && accessLevel !== 'COMPANY') {
      newErrors.company = 'Please select a company first';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const customer = await customersApi.create({
        ...formData,
        companyId: selectedCompanyId!,
      });
      toast.success('Customer created successfully');
      router.push(`/customers/${customer.id}`);
    } catch (error) {
      console.error('Failed to create customer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <>
      <Header
        title="New Customer"
        subtitle="Add a new customer to your database"
        actions={
          <Link href="/customers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
        }
      />

      <div className="p-6 max-w-2xl">
        {!selectedCompanyId && accessLevel !== 'COMPANY' && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
            Please select a company from the header to create a customer.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card/50 border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Customer Information</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email Address <span className="text-red-400">*</span>
              </label>
              <Input
                type="email"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">First Name</label>
                <Input
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Last Name</label>
                <Input
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link href="/customers">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || (!selectedCompanyId && accessLevel !== 'COMPANY')}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Customer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
