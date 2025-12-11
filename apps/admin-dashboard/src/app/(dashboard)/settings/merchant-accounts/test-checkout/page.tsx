'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  TestTube,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Clock,
  Receipt,
  ExternalLink,
  Copy,
  Info,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  merchantAccountsApi,
  MerchantAccount,
  AccountStatus,
  TestCard,
  TestCheckoutResponse,
} from '@/lib/api/merchant-accounts';

interface CardInputState {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

function formatCardNumber(value: string): string {
  const numbers = value.replace(/\D/g, '');
  const groups = numbers.match(/.{1,4}/g) || [];
  return groups.join(' ').substring(0, 19);
}

function getCardBrand(number: string): string {
  const num = number.replace(/\D/g, '');
  if (num.startsWith('4')) return 'Visa';
  if (num.startsWith('5') || num.startsWith('2')) return 'MasterCard';
  if (num.startsWith('3')) return 'Amex';
  if (num.startsWith('6')) return 'Discover';
  return 'Card';
}

function isCardExpired(month: string, year: string): boolean {
  if (!month || !year || year.length < 4) return false;
  const now = new Date();
  const expiry = new Date(parseInt(year), parseInt(month), 0); // Last day of expiry month
  return expiry < now;
}

function EnvironmentBadge({ environment }: { environment: 'sandbox' | 'production' }) {
  const isSandbox = environment === 'sandbox';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isSandbox ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
    }`}>
      {isSandbox ? <TestTube className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
      {isSandbox ? 'Sandbox' : 'Production'}
    </span>
  );
}

export default function TestCheckoutPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<MerchantAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [testCards, setTestCards] = useState<TestCard[]>([]);
  const [amount, setAmount] = useState<string>('1.00');
  const [description, setDescription] = useState<string>('Test transaction');
  const [createOrder, setCreateOrder] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<TestCheckoutResponse | null>(null);
  const [card, setCard] = useState<CardInputState>({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Load merchant accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load test cards when account changes and clear previous result
  useEffect(() => {
    if (selectedAccountId) {
      loadTestCards(selectedAccountId);
      setResult(null); // Clear result when switching accounts
    }
  }, [selectedAccountId]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await merchantAccountsApi.list({ status: AccountStatus.ACTIVE });
      setAccounts(data.accounts);
      if (data.accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data.accounts[0].id);
      }
    } catch (error) {
      toast.error('Failed to load merchant accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadTestCards = async (accountId: string) => {
    try {
      const { data } = await merchantAccountsApi.getTestCards(accountId);
      setTestCards(data.testCards);
    } catch (error) {
      console.error('Failed to load test cards:', error);
      setTestCards([]);
    }
  };

  const selectTestCard = (testCard: TestCard) => {
    setCard({
      number: testCard.number,
      expiryMonth: testCard.expiryMonth,
      expiryYear: testCard.expiryYear,
      cvv: testCard.cvv,
      cardholderName: 'Test User',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccountId) {
      toast.error('Please select a merchant account');
      return;
    }

    const cardNumber = card.number.replace(/\D/g, '');
    if (cardNumber.length < 13) {
      toast.error('Please enter a valid card number');
      return;
    }

    if (!card.expiryMonth || !card.expiryYear) {
      toast.error('Please enter card expiry date');
      return;
    }

    if (card.expiryYear.length < 4) {
      toast.error('Please enter a 4-digit year');
      return;
    }

    if (isCardExpired(card.expiryMonth, card.expiryYear)) {
      toast.error('Card has expired');
      return;
    }

    if (!card.cvv) {
      toast.error('Please enter CVV');
      return;
    }

    if (card.cvv.length < 3) {
      toast.error('CVV must be at least 3 digits');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue < 0.01) {
      toast.error('Amount must be at least $0.01');
      return;
    }

    if (amountValue > 99999.99) {
      toast.error('Amount cannot exceed $99,999.99');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const { data } = await merchantAccountsApi.processTestCheckout({
        merchantAccountId: selectedAccountId,
        amount: amountValue,
        currency: 'USD',
        card: {
          number: cardNumber,
          expiryMonth: card.expiryMonth.padStart(2, '0'),
          expiryYear: card.expiryYear,
          cvv: card.cvv,
          cardholderName: card.cardholderName || undefined,
        },
        description,
        createOrder,
      });

      setResult(data);

      if (data.success) {
        toast.success('Transaction completed successfully!');
      } else {
        toast.error(data.errorMessage || 'Transaction failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Transaction failed');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <>
        <Header title="Run Transaction" />
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Run Transaction"
        actions={
          <Button variant="outline" size="sm" onClick={loadAccounts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium text-foreground">Process transactions on any merchant account</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Run transactions against sandbox or production merchant accounts. Sandbox accounts use test cards
              with no real charges. Production accounts process live transactions. All orders and transactions
              are recorded with the appropriate environment flag.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Merchant Account Selection */}
            <div className="bg-card/50 border border-border rounded-lg p-4">
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Select Merchant Account
              </h3>

              {accounts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No active merchant accounts found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push('/settings/merchant-accounts')}
                  >
                    Set up Merchant Accounts
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedAccountId(account.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedAccountId === account.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center"
                            style={{ backgroundColor: account.color || '#6366f1' }}
                          >
                            <CreditCard className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{account.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {account.providerType} - {account.merchantId}
                            </p>
                          </div>
                        </div>
                        <EnvironmentBadge environment={account.environment} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Test Cards (only for sandbox) */}
            {selectedAccount?.environment === 'sandbox' && testCards.length > 0 && (
              <div className="bg-card/50 border border-border rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  Quick Fill - Test Cards
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {testCards.map((testCard, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectTestCard(testCard)}
                      className="p-2 rounded border border-border hover:border-primary hover:bg-primary/5 text-left transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground">{testCard.brand}</p>
                      <p className="text-xs text-muted-foreground">
                        •••• {testCard.number.slice(-4)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{testCard.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card Input Form */}
            <form onSubmit={handleSubmit} className="bg-card/50 border border-border rounded-lg p-4">
              <h3 className="font-medium text-foreground mb-4">Payment Details</h3>

              <div className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                      placeholder="1.00"
                    />
                  </div>
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatCardNumber(card.number)}
                      onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                    />
                    {card.number && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {getCardBrand(card.number)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Month</label>
                    <input
                      type="text"
                      value={card.expiryMonth}
                      onChange={(e) => setCard({ ...card, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                      placeholder="MM"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Year</label>
                    <input
                      type="text"
                      value={card.expiryYear}
                      onChange={(e) => setCard({ ...card, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                      placeholder="YYYY"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">CVV</label>
                    <input
                      type="text"
                      value={card.cvv}
                      onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>

                {/* Cardholder Name */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Cardholder Name (optional)</label>
                  <input
                    type="text"
                    value={card.cardholderName}
                    onChange={(e) => setCard({ ...card, cardholderName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                    placeholder="John Doe"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                    placeholder="Test transaction"
                  />
                </div>

                {/* Create Order */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createOrder"
                    checked={createOrder}
                    onChange={(e) => setCreateOrder(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="createOrder" className="text-sm text-muted-foreground">
                    Create order record
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={processing || !selectedAccountId}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Process ${amount || '0.00'} Transaction
                    </>
                  )}
                </Button>

                {/* Production Warning */}
                {selectedAccount?.environment === 'production' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-yellow-400">
                      This is a production account. Real charges will be processed.
                    </p>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Right Column - Results */}
          <div>
            <div className="bg-card/50 border border-border rounded-lg p-4 sticky top-6">
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Transaction Result
              </h3>

              {!result ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Process a transaction to see results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {result.success ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                    <div>
                      <p className={`font-semibold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                        {result.success ? 'Transaction Approved' : 'Transaction Failed'}
                      </p>
                      {result.errorMessage && (
                        <p className="text-sm text-red-300">{result.errorMessage}</p>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="font-medium text-foreground">${result.amount.toFixed(2)} {result.currency}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Environment</span>
                      <EnvironmentBadge environment={result.environment} />
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Processing Time</span>
                      <span className="flex items-center gap-1 text-foreground">
                        <Clock className="w-3 h-3" />
                        {result.processingTimeMs}ms
                      </span>
                    </div>

                    {result.transactionNumber && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Transaction #</span>
                        <span className="flex items-center gap-2 text-foreground">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">{result.transactionNumber}</code>
                          <button onClick={() => copyToClipboard(result.transactionNumber!)}>
                            <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </span>
                      </div>
                    )}

                    {result.orderNumber && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Order #</span>
                        <span className="flex items-center gap-2 text-foreground">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">{result.orderNumber}</code>
                          <a
                            href={`/orders/${result.orderId}`}
                            className="text-primary hover:text-primary/80"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </span>
                      </div>
                    )}

                    {result.providerTransactionId && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Provider Transaction ID</span>
                        <span className="flex items-center gap-2 text-foreground">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded max-w-[120px] truncate">
                            {result.providerTransactionId}
                          </code>
                          <button onClick={() => copyToClipboard(result.providerTransactionId!)}>
                            <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </span>
                      </div>
                    )}

                    {result.avsResult && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">AVS Result</span>
                        <span className="text-foreground">{result.avsResult}</span>
                      </div>
                    )}

                    {result.cvvResult && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">CVV Result</span>
                        <span className="text-foreground">{result.cvvResult}</span>
                      </div>
                    )}

                    {result.errorCode && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Error Code</span>
                        <span className="text-red-400">{result.errorCode}</span>
                      </div>
                    )}
                  </div>

                  {/* View Links */}
                  <div className="flex gap-2 pt-2">
                    {result.transactionId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`/transactions`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Transactions
                      </Button>
                    )}
                    {result.orderId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`/orders/${result.orderId}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Order
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
