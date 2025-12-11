'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Search,
  User,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ordersApi, CreateOrderInput, CreateOrderItemInput, Address } from '@/lib/api/orders';
import { customersApi, Customer } from '@/lib/api/customers';
import { useHierarchy } from '@/contexts/hierarchy-context';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface OrderItemForm {
  id: string;
  sku: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

// Simple ID generator that works on both server and client
let idCounter = 0;
const generateId = () => `item-${Date.now()}-${++idCounter}`;

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function NewOrderPage() {
  const router = useRouter();
  const { selectedCompanyId, accessLevel } = useHierarchy();
  const [loading, setLoading] = useState(false);

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Order items
  const [items, setItems] = useState<OrderItemForm[]>([
    { id: generateId(), sku: '', name: '', description: '', quantity: 1, unitPrice: 0 },
  ]);

  // Shipping address
  const [shippingAddress, setShippingAddress] = useState<Address>({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
  });

  // Order details
  const [shippingAmount, setShippingAmount] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Search customers
  const searchCustomers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setCustomers([]);
      return;
    }

    setSearchingCustomers(true);
    try {
      const result = await customersApi.list({ search: query, limit: 10 });
      setCustomers(result.items);
    } catch (err) {
      console.error('Failed to search customers:', err);
    } finally {
      setSearchingCustomers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch) {
        searchCustomers(customerSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal + shippingAmount;

  // Handle item changes
  const updateItem = (id: string, field: keyof OrderItemForm, value: string | number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { id: generateId(), sku: '', name: '', description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error('Order must have at least one item');
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Handle shipping address changes
  const updateShippingAddress = (field: keyof Address, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
    if (errors[`shipping_${field}`]) {
      setErrors(prev => ({ ...prev, [`shipping_${field}`]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedCustomer) {
      newErrors.customer = 'Please select a customer';
    }

    if (!selectedCompanyId && accessLevel !== 'COMPANY') {
      newErrors.company = 'Please select a company from the header';
    }

    // Validate items
    let hasValidItem = false;
    items.forEach((item, index) => {
      if (item.sku && item.name && item.quantity > 0 && item.unitPrice >= 0) {
        hasValidItem = true;
      } else if (item.sku || item.name || item.unitPrice > 0) {
        // Partially filled item
        if (!item.sku) newErrors[`item_${index}_sku`] = 'SKU is required';
        if (!item.name) newErrors[`item_${index}_name`] = 'Name is required';
        if (item.quantity <= 0) newErrors[`item_${index}_quantity`] = 'Quantity must be positive';
      }
    });

    if (!hasValidItem) {
      newErrors.items = 'At least one complete item is required';
    }

    // Validate shipping address
    if (!shippingAddress.firstName) newErrors.shipping_firstName = 'First name is required';
    if (!shippingAddress.lastName) newErrors.shipping_lastName = 'Last name is required';
    if (!shippingAddress.address1) newErrors.shipping_address1 = 'Address is required';
    if (!shippingAddress.city) newErrors.shipping_city = 'City is required';
    if (!shippingAddress.state) newErrors.shipping_state = 'State is required';
    if (!shippingAddress.postalCode) newErrors.shipping_postalCode = 'Postal code is required';
    if (!shippingAddress.country) newErrors.shipping_country = 'Country is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setLoading(true);
    try {
      // Filter out empty items and prepare order items
      const orderItems: CreateOrderItemInput[] = items
        .filter(item => item.sku && item.name && item.quantity > 0)
        .map(item => ({
          sku: item.sku,
          name: item.name,
          description: item.description || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));

      const orderData: CreateOrderInput = {
        customerId: selectedCustomer!.id,
        shippingAddress,
        items: orderItems,
        shippingAmount,
        currency,
        customerNotes: customerNotes || undefined,
        internalNotes: internalNotes || undefined,
      };

      const order = await ordersApi.create(orderData);
      toast.success('Order created successfully');
      router.push(`/orders/${order.id}`);
    } catch (err) {
      console.error('Failed to create order:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <>
      <Header
        title="New Order"
        subtitle="Create a new order"
        actions={
          <Link href="/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
        }
      />

      <div className="p-6 max-w-4xl">
        {!selectedCompanyId && accessLevel !== 'COMPANY' && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
            Please select a company from the header to create an order.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="bg-card/50 border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Customer</h2>
            </div>

            {selectedCustomer ? (
              <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search customers by name or email..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className={`pl-10 ${errors.customer ? 'border-red-500' : ''}`}
                  />
                  {searchingCustomers && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {errors.customer && <p className="text-xs text-red-400 mt-1">{errors.customer}</p>}

                {/* Customer dropdown */}
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerDropdown(false);
                          setCustomerSearch('');
                          // Pre-fill shipping address if customer has one
                          if (customer.addresses && customer.addresses.length > 0) {
                            const addr = customer.addresses[0];
                            setShippingAddress({
                              firstName: addr.firstName || customer.firstName || '',
                              lastName: addr.lastName || customer.lastName || '',
                              address1: addr.address1,
                              address2: addr.address2 || '',
                              city: addr.city,
                              state: addr.state,
                              postalCode: addr.postalCode,
                              country: addr.country,
                              phone: addr.phone || customer.phone || '',
                            });
                          } else {
                            setShippingAddress(prev => ({
                              ...prev,
                              firstName: customer.firstName || '',
                              lastName: customer.lastName || '',
                              phone: customer.phone || '',
                            }));
                          }
                        }}
                      >
                        <p className="font-medium text-foreground">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-card/50 border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Order Items</h2>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            {errors.items && (
              <p className="text-xs text-red-400 mb-4">{errors.items}</p>
            )}

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 bg-muted/30 border border-border rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">SKU</label>
                        <Input
                          type="text"
                          placeholder="SKU-001"
                          value={item.sku}
                          onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                          className={errors[`item_${index}_sku`] ? 'border-red-500' : ''}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Name</label>
                        <Input
                          type="text"
                          placeholder="Product Name"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className={errors[`item_${index}_name`] ? 'border-red-500' : ''}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Quantity</label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Unit Price</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground">Description (optional)</label>
                    <Input
                      type="text"
                      placeholder="Item description..."
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="mt-2 text-right text-sm text-muted-foreground">
                    Line total: {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-card/50 border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Shipping Address</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">First Name *</label>
                <Input
                  type="text"
                  placeholder="John"
                  value={shippingAddress.firstName}
                  onChange={(e) => updateShippingAddress('firstName', e.target.value)}
                  className={errors.shipping_firstName ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Last Name *</label>
                <Input
                  type="text"
                  placeholder="Doe"
                  value={shippingAddress.lastName}
                  onChange={(e) => updateShippingAddress('lastName', e.target.value)}
                  className={errors.shipping_lastName ? 'border-red-500' : ''}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">Address Line 1 *</label>
                <Input
                  type="text"
                  placeholder="123 Main Street"
                  value={shippingAddress.address1}
                  onChange={(e) => updateShippingAddress('address1', e.target.value)}
                  className={errors.shipping_address1 ? 'border-red-500' : ''}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">Address Line 2</label>
                <Input
                  type="text"
                  placeholder="Apt, Suite, etc. (optional)"
                  value={shippingAddress.address2 || ''}
                  onChange={(e) => updateShippingAddress('address2', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">City *</label>
                <Input
                  type="text"
                  placeholder="San Francisco"
                  value={shippingAddress.city}
                  onChange={(e) => updateShippingAddress('city', e.target.value)}
                  className={errors.shipping_city ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">State *</label>
                <Input
                  type="text"
                  placeholder="CA"
                  value={shippingAddress.state}
                  onChange={(e) => updateShippingAddress('state', e.target.value)}
                  className={errors.shipping_state ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Postal Code *</label>
                <Input
                  type="text"
                  placeholder="94105"
                  value={shippingAddress.postalCode}
                  onChange={(e) => updateShippingAddress('postalCode', e.target.value)}
                  className={errors.shipping_postalCode ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Country *</label>
                <select
                  value={shippingAddress.country}
                  onChange={(e) => updateShippingAddress('country', e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={shippingAddress.phone || ''}
                  onChange={(e) => updateShippingAddress('phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-card/50 border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Order Summary</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Shipping Amount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={shippingAmount || ''}
                  onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">{formatCurrency(shippingAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card/50 border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Customer Notes</label>
                <textarea
                  placeholder="Notes visible to the customer..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Internal Notes</label>
                <textarea
                  placeholder="Internal notes (not visible to customer)..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/orders">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || (!selectedCompanyId && accessLevel !== 'COMPANY')}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Order...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Order
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
