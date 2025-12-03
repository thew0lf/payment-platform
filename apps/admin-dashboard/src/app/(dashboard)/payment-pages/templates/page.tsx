'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ArrowLeft,
  Eye,
  Plus,
  Sparkles,
  CreditCard,
  RefreshCw,
  Heart,
  ShoppingCart,
  CheckCircle,
  X,
  Users,
  Gift,
  Calendar,
  Ticket,
  Download,
  Target,
  FileText,
  Check,
  Star,
  Clock,
  Shield,
  Zap,
  Lock,
  ChevronRight,
  ArrowRight,
  Play,
  Image as ImageIcon,
  Crown,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  paymentPagesApi,
  CreatePaymentPageInput,
  PaymentPageType,
} from '@/lib/api/payment-pages';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type TemplateCategory =
  | 'product'
  | 'subscription'
  | 'donation'
  | 'digital'
  | 'service'
  | 'event'
  | 'invoice'
  | 'creator';

interface PaymentPageTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  type: PaymentPageType;
  popular?: boolean;
  new?: boolean;
  config: Partial<CreatePaymentPageInput>;
}

const CATEGORIES: Record<TemplateCategory, { label: string; icon: React.ReactNode; description: string }> = {
  product: { label: 'Products', icon: <ShoppingCart className="w-4 h-4" />, description: 'Physical & digital products' },
  subscription: { label: 'Subscriptions', icon: <RefreshCw className="w-4 h-4" />, description: 'Recurring plans' },
  donation: { label: 'Donations', icon: <Heart className="w-4 h-4" />, description: 'Nonprofit & fundraising' },
  digital: { label: 'Digital', icon: <Download className="w-4 h-4" />, description: 'Downloads & courses' },
  service: { label: 'Services', icon: <Calendar className="w-4 h-4" />, description: 'Bookings & appointments' },
  event: { label: 'Events', icon: <Ticket className="w-4 h-4" />, description: 'Tickets & registration' },
  invoice: { label: 'Invoices', icon: <FileText className="w-4 h-4" />, description: 'B2B payments' },
  creator: { label: 'Creators', icon: <Gift className="w-4 h-4" />, description: 'Tips & memberships' },
};

// ═══════════════════════════════════════════════════════════════
// HIGH-FIDELITY PREVIEW COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Modern Product Checkout Preview
function ProductCheckoutPreview() {
  return (
    <div className="w-full h-full bg-white flex overflow-hidden font-['Inter',system-ui,sans-serif]">
      {/* Product Side */}
      <div className="w-[45%] bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex flex-col">
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">A</span>
          </div>
          <span className="text-[9px] font-medium text-white/80">Acme Store</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-white/10 flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-white/60" />
          </div>
        </div>
        <div className="mt-auto">
          <p className="text-[8px] text-white/50 mb-0.5">Premium Package</p>
          <p className="text-sm font-semibold text-white">$99.00</p>
        </div>
      </div>
      {/* Form Side */}
      <div className="flex-1 p-4 flex flex-col">
        <p className="text-[10px] font-semibold text-slate-900 mb-3">Pay with card</p>
        <div className="space-y-2 flex-1">
          <div className="h-7 bg-slate-100 rounded-md border border-slate-200 px-2 flex items-center">
            <span className="text-[8px] text-slate-400">Email</span>
          </div>
          <div className="h-7 bg-slate-100 rounded-md border border-slate-200 px-2 flex items-center">
            <span className="text-[8px] text-slate-400">Card number</span>
            <div className="ml-auto flex gap-0.5">
              <div className="w-4 h-2.5 bg-gradient-to-r from-blue-600 to-blue-500 rounded-[2px]" />
              <div className="w-4 h-2.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-[2px]" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-7 bg-slate-100 rounded-md border border-slate-200 px-2 flex items-center">
              <span className="text-[8px] text-slate-400">MM / YY</span>
            </div>
            <div className="flex-1 h-7 bg-slate-100 rounded-md border border-slate-200 px-2 flex items-center">
              <span className="text-[8px] text-slate-400">CVC</span>
            </div>
          </div>
        </div>
        <button className="w-full h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[10px] font-medium mt-3 transition-colors">
          Pay $99.00
        </button>
        <div className="flex items-center justify-center gap-1 mt-2">
          <Lock className="w-2.5 h-2.5 text-slate-400" />
          <span className="text-[7px] text-slate-400">Secured by Stripe</span>
        </div>
      </div>
    </div>
  );
}

// SaaS Pricing Table Preview
function PricingTablePreview() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-50 to-white p-3 font-['Inter',system-ui,sans-serif]">
      <div className="text-center mb-3">
        <p className="text-[10px] font-bold text-slate-900">Choose your plan</p>
        <p className="text-[7px] text-slate-500">Start free, upgrade anytime</p>
      </div>
      <div className="flex gap-2 justify-center">
        {/* Basic Plan */}
        <div className="w-[30%] bg-white rounded-lg border border-slate-200 p-2 shadow-sm">
          <p className="text-[8px] font-medium text-slate-600 mb-1">Starter</p>
          <p className="text-[12px] font-bold text-slate-900">$9<span className="text-[7px] font-normal text-slate-500">/mo</span></p>
          <div className="space-y-1 my-2">
            <div className="flex items-center gap-1">
              <Check className="w-2 h-2 text-emerald-500" />
              <span className="text-[6px] text-slate-600">5 projects</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-2 h-2 text-emerald-500" />
              <span className="text-[6px] text-slate-600">Basic analytics</span>
            </div>
          </div>
          <button className="w-full h-5 bg-slate-100 text-slate-700 rounded text-[7px] font-medium">
            Get Started
          </button>
        </div>
        {/* Pro Plan - Featured */}
        <div className="w-[34%] bg-slate-900 rounded-lg p-2 shadow-lg relative -mt-1 scale-105">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-violet-500 rounded text-[5px] font-medium text-white">
            POPULAR
          </div>
          <p className="text-[8px] font-medium text-slate-400 mb-1 mt-1">Pro</p>
          <p className="text-[12px] font-bold text-white">$29<span className="text-[7px] font-normal text-slate-400">/mo</span></p>
          <div className="space-y-1 my-2">
            <div className="flex items-center gap-1">
              <Check className="w-2 h-2 text-emerald-400" />
              <span className="text-[6px] text-slate-300">Unlimited projects</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-2 h-2 text-emerald-400" />
              <span className="text-[6px] text-slate-300">Advanced analytics</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-2 h-2 text-emerald-400" />
              <span className="text-[6px] text-slate-300">Priority support</span>
            </div>
          </div>
          <button className="w-full h-5 bg-violet-500 hover:bg-violet-600 text-white rounded text-[7px] font-medium transition-colors">
            Start Free Trial
          </button>
        </div>
        {/* Enterprise */}
        <div className="w-[30%] bg-white rounded-lg border border-slate-200 p-2 shadow-sm">
          <p className="text-[8px] font-medium text-slate-600 mb-1">Enterprise</p>
          <p className="text-[12px] font-bold text-slate-900">$99<span className="text-[7px] font-normal text-slate-500">/mo</span></p>
          <div className="space-y-1 my-2">
            <div className="flex items-center gap-1">
              <Check className="w-2 h-2 text-emerald-500" />
              <span className="text-[6px] text-slate-600">Everything in Pro</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-2 h-2 text-emerald-500" />
              <span className="text-[6px] text-slate-600">SSO & SAML</span>
            </div>
          </div>
          <button className="w-full h-5 bg-slate-100 text-slate-700 rounded text-[7px] font-medium">
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
}

// Donation Page Preview
function DonationPreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-rose-50 via-white to-orange-50 p-4 font-['Inter',system-ui,sans-serif]">
      <div className="text-center mb-3">
        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
          <Heart className="w-5 h-5 text-white" />
        </div>
        <p className="text-[10px] font-bold text-slate-900">Help us make a difference</p>
        <p className="text-[7px] text-slate-500">Every donation counts</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {['$25', '$50', '$100'].map((amount, i) => (
          <button
            key={amount}
            className={cn(
              "h-7 rounded-lg text-[9px] font-semibold transition-all",
              i === 1
                ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md"
                : "bg-white border border-slate-200 text-slate-700 hover:border-rose-300"
            )}
          >
            {amount}
          </button>
        ))}
      </div>
      <div className="h-7 bg-white rounded-lg border border-slate-200 px-2 flex items-center mb-3">
        <span className="text-[8px] text-slate-400">$ Custom amount</span>
      </div>
      <button className="w-full h-8 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-lg text-[9px] font-semibold transition-all shadow-md">
        Donate Now
      </button>
      <p className="text-[6px] text-slate-400 text-center mt-2">
        Your donation is tax-deductible
      </p>
    </div>
  );
}

// Digital Download Preview
function DigitalDownloadPreview() {
  return (
    <div className="w-full h-full bg-slate-900 p-4 font-['Inter',system-ui,sans-serif]">
      <div className="flex gap-3">
        {/* Product Preview */}
        <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
          <Download className="w-6 h-6 text-white" />
        </div>
        {/* Info */}
        <div className="flex-1">
          <p className="text-[10px] font-bold text-white mb-0.5">Design System Pro</p>
          <p className="text-[7px] text-slate-400 mb-2">Complete UI kit with 500+ components</p>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-4 h-4 rounded-full bg-slate-700 border border-slate-800" />
              ))}
            </div>
            <span className="text-[6px] text-slate-500">2.4k+ downloads</span>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-slate-400">Personal License</span>
          <span className="text-[9px] font-semibold text-white">$49</span>
        </div>
        <div className="flex items-center justify-between p-1.5 bg-slate-800 rounded-md border border-cyan-500/30">
          <span className="text-[8px] text-cyan-400">Team License</span>
          <span className="text-[9px] font-semibold text-white">$149</span>
        </div>
      </div>
      <button className="w-full h-8 mt-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg text-[9px] font-semibold transition-all">
        Get Instant Access
      </button>
    </div>
  );
}

// Service Booking Preview
function ServiceBookingPreview() {
  return (
    <div className="w-full h-full bg-white p-3 font-['Inter',system-ui,sans-serif]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">JD</span>
        </div>
        <div>
          <p className="text-[9px] font-semibold text-slate-900">Dr. Jane Doe</p>
          <p className="text-[6px] text-slate-500">60 min consultation • $150</p>
        </div>
      </div>
      {/* Calendar Mini */}
      <div className="bg-slate-50 rounded-lg p-2 mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[7px] font-medium text-slate-700">December 2024</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded bg-slate-200" />
            <div className="w-3 h-3 rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-[5px] text-center text-slate-400">{d}</div>
          ))}
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded text-[5px] flex items-center justify-center",
                i === 9 ? "bg-emerald-500 text-white" : "text-slate-600"
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      {/* Time Slots */}
      <div className="flex gap-1 mb-2">
        {['9:00 AM', '10:30 AM', '2:00 PM'].map((time, i) => (
          <div
            key={time}
            className={cn(
              "flex-1 h-5 rounded text-[6px] flex items-center justify-center font-medium",
              i === 1 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
            )}
          >
            {time}
          </div>
        ))}
      </div>
      <button className="w-full h-7 bg-slate-900 text-white rounded-lg text-[8px] font-semibold">
        Book Appointment
      </button>
    </div>
  );
}

// Event Ticket Preview
function EventTicketPreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 p-3 font-['Inter',system-ui,sans-serif] relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-500/30 to-transparent rounded-full blur-xl" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-violet-500/30 to-transparent rounded-full blur-xl" />

      <div className="relative">
        <div className="flex items-center gap-1 mb-2">
          <Ticket className="w-3 h-3 text-pink-400" />
          <span className="text-[6px] font-medium text-pink-300 uppercase tracking-wider">Live Event</span>
        </div>
        <p className="text-[11px] font-bold text-white mb-0.5">Tech Summit 2024</p>
        <p className="text-[7px] text-purple-200">Dec 15-17 • San Francisco, CA</p>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between p-2 bg-white/10 backdrop-blur rounded-lg border border-white/10">
            <div>
              <p className="text-[7px] font-medium text-white">General Admission</p>
              <p className="text-[5px] text-purple-300">Access to all sessions</p>
            </div>
            <span className="text-[9px] font-bold text-white">$299</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gradient-to-r from-pink-500/20 to-violet-500/20 backdrop-blur rounded-lg border border-pink-400/30">
            <div>
              <p className="text-[7px] font-medium text-white flex items-center gap-1">
                VIP Pass <Crown className="w-2 h-2 text-yellow-400" />
              </p>
              <p className="text-[5px] text-purple-300">Front row + After party</p>
            </div>
            <span className="text-[9px] font-bold text-white">$599</span>
          </div>
        </div>

        <button className="w-full h-7 mt-3 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white rounded-lg text-[8px] font-semibold transition-all shadow-lg">
          Get Tickets
        </button>
      </div>
    </div>
  );
}

// Invoice Payment Preview
function InvoicePreview() {
  return (
    <div className="w-full h-full bg-slate-50 p-3 font-['Inter',system-ui,sans-serif]">
      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
              <span className="text-[7px] font-bold text-white">AB</span>
            </div>
            <div>
              <p className="text-[8px] font-semibold text-slate-900">Acme Business</p>
              <p className="text-[6px] text-slate-500">Invoice #INV-2024-001</p>
            </div>
          </div>
          <div className="px-1.5 py-0.5 bg-amber-100 rounded text-[6px] font-medium text-amber-700">
            Due Dec 15
          </div>
        </div>

        <div className="space-y-1.5 border-t border-slate-100 pt-2 mb-3">
          <div className="flex justify-between text-[7px]">
            <span className="text-slate-500">Web Development</span>
            <span className="text-slate-900 font-medium">$2,500.00</span>
          </div>
          <div className="flex justify-between text-[7px]">
            <span className="text-slate-500">UI/UX Design</span>
            <span className="text-slate-900 font-medium">$1,200.00</span>
          </div>
          <div className="flex justify-between text-[8px] font-semibold pt-1.5 border-t border-slate-100">
            <span className="text-slate-900">Total Due</span>
            <span className="text-slate-900">$3,700.00</span>
          </div>
        </div>

        <button className="w-full h-7 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[8px] font-semibold transition-colors">
          Pay Invoice
        </button>
      </div>
    </div>
  );
}

// Creator Tip Jar Preview
function TipJarPreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-50 p-3 font-['Inter',system-ui,sans-serif]">
      <div className="text-center mb-3">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
          <span className="text-sm font-bold text-white">☕</span>
        </div>
        <p className="text-[10px] font-bold text-slate-900">Buy me a coffee</p>
        <p className="text-[7px] text-slate-500">Support my creative work</p>
      </div>

      <div className="flex gap-1.5 mb-3">
        {[
          { emoji: '☕', label: '1 Coffee', price: '$5' },
          { emoji: '🍕', label: 'Pizza', price: '$10' },
          { emoji: '🎉', label: 'Party!', price: '$25' },
        ].map((item, i) => (
          <button
            key={i}
            className={cn(
              "flex-1 p-1.5 rounded-lg border transition-all",
              i === 0
                ? "bg-amber-500 border-amber-500 text-white shadow-md"
                : "bg-white border-slate-200 hover:border-amber-300"
            )}
          >
            <span className="text-sm block mb-0.5">{item.emoji}</span>
            <span className="text-[6px] block text-current opacity-80">{item.label}</span>
            <span className="text-[7px] font-semibold">{item.price}</span>
          </button>
        ))}
      </div>

      <div className="h-7 bg-white rounded-lg border border-slate-200 px-2 flex items-center mb-2">
        <span className="text-[8px] text-slate-400">Leave a message (optional)</span>
      </div>

      <button className="w-full h-7 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-[8px] font-semibold shadow-md">
        Support $5
      </button>
    </div>
  );
}

// Membership Preview
function MembershipPreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 font-['Inter',system-ui,sans-serif]">
      <div className="text-center mb-3">
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <p className="text-[10px] font-bold text-white">Become a Member</p>
        <p className="text-[7px] text-slate-400">Unlock exclusive content</p>
      </div>

      <div className="space-y-1.5 mb-3">
        {[
          { icon: <Play className="w-2.5 h-2.5" />, text: 'Exclusive videos' },
          { icon: <Lock className="w-2.5 h-2.5" />, text: 'Members-only posts' },
          { icon: <Zap className="w-2.5 h-2.5" />, text: 'Early access' },
          { icon: <Users className="w-2.5 h-2.5" />, text: 'Private community' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-slate-300">
            <div className="w-4 h-4 rounded bg-violet-500/20 flex items-center justify-center text-violet-400">
              {item.icon}
            </div>
            <span className="text-[7px]">{item.text}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg border border-violet-500/30 mb-2">
        <div>
          <p className="text-[7px] text-violet-400 font-medium">Premium</p>
          <p className="text-[9px] font-bold text-white">$9.99<span className="text-[6px] text-slate-400 font-normal">/month</span></p>
        </div>
        <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      <button className="w-full h-7 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg text-[8px] font-semibold shadow-lg">
        Join Now
      </button>
    </div>
  );
}

// Multi-step Checkout Preview
function MultiStepCheckoutPreview() {
  return (
    <div className="w-full h-full bg-white p-3 font-['Inter',system-ui,sans-serif]">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-4">
        {['Details', 'Shipping', 'Payment'].map((step, i) => (
          <div key={step} className="flex items-center">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-semibold",
              i === 0 ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
            )}>
              {i === 0 ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            {i < 2 && (
              <div className={cn(
                "w-8 h-0.5 mx-1",
                i === 0 ? "bg-slate-900" : "bg-slate-200"
              )} />
            )}
          </div>
        ))}
      </div>

      <p className="text-[9px] font-semibold text-slate-900 mb-2">Your Information</p>

      <div className="space-y-1.5">
        <div className="flex gap-1.5">
          <div className="flex-1 h-6 bg-slate-100 rounded-md border border-slate-200 px-2 flex items-center">
            <span className="text-[7px] text-slate-400">First name</span>
          </div>
          <div className="flex-1 h-6 bg-slate-100 rounded-md border border-slate-200 px-2 flex items-center">
            <span className="text-[7px] text-slate-400">Last name</span>
          </div>
        </div>
        <div className="h-6 bg-slate-100 rounded-md border border-slate-200 px-2 flex items-center">
          <span className="text-[7px] text-slate-400">Email address</span>
        </div>
        <div className="h-6 bg-slate-100 rounded-md border border-slate-200 px-2 flex items-center">
          <span className="text-[7px] text-slate-400">Phone number</span>
        </div>
      </div>

      <button className="w-full h-7 bg-slate-900 text-white rounded-lg text-[8px] font-semibold mt-3 flex items-center justify-center gap-1">
        Continue <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// Urgency/Flash Sale Preview
function FlashSalePreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-red-600 to-orange-600 p-3 font-['Inter',system-ui,sans-serif] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyMHYySDE0di0yaDIyek0zNiAzNnYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="relative">
        {/* Timer */}
        <div className="flex items-center justify-center gap-1 mb-2">
          <Clock className="w-3 h-3 text-white" />
          <div className="flex gap-0.5">
            {['02', '14', '37'].map((n, i) => (
              <div key={i} className="flex items-center">
                <div className="bg-white/20 backdrop-blur px-1 py-0.5 rounded text-[10px] font-mono font-bold text-white">
                  {n}
                </div>
                {i < 2 && <span className="text-white mx-0.5 text-[10px]">:</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-3">
          <p className="text-[6px] font-medium text-white/80 uppercase tracking-wider mb-0.5">Flash Sale</p>
          <p className="text-[12px] font-bold text-white">50% OFF</p>
          <p className="text-[7px] text-white/80">Limited time offer</p>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-lg p-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-white/20" />
            <div className="flex-1">
              <p className="text-[8px] font-semibold text-white">Premium Bundle</p>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-white/60 line-through">$199</span>
                <span className="text-[10px] font-bold text-white">$99</span>
              </div>
            </div>
          </div>
        </div>

        <button className="w-full h-8 bg-white hover:bg-white/90 text-red-600 rounded-lg text-[9px] font-bold transition-colors shadow-lg">
          Claim Deal Now
        </button>

        <p className="text-[6px] text-white/60 text-center mt-1.5">
          Only 12 left at this price
        </p>
      </div>
    </div>
  );
}

// Crowdfunding Preview
function CrowdfundingPreview() {
  return (
    <div className="w-full h-full bg-white p-3 font-['Inter',system-ui,sans-serif]">
      <div className="flex gap-2 mb-3">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-bold text-slate-900 mb-0.5">Smart Water Bottle</p>
          <p className="text-[6px] text-slate-500 mb-1.5">Track hydration, stay healthy</p>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-semibold text-emerald-600">$47,230</span>
            <span className="text-[6px] text-slate-400">of $50,000 goal</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full mb-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" style={{ width: '94%' }} />
      </div>

      <div className="flex items-center justify-between text-[6px] text-slate-500 mb-3">
        <span>847 backers</span>
        <span>6 days left</span>
      </div>

      {/* Reward Tier */}
      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] font-semibold text-slate-900">Early Bird</span>
          <span className="text-[8px] font-bold text-emerald-600">$49</span>
        </div>
        <p className="text-[6px] text-slate-500">1 Smart Bottle + Free shipping</p>
      </div>

      <button className="w-full h-7 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg text-[8px] font-semibold">
        Back This Project
      </button>
    </div>
  );
}

// Luxury / Premium Checkout Preview
function LuxuryCheckoutPreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 font-['Inter',system-ui,sans-serif] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(217,176,116,0.08),transparent_40%)]" />

      <div className="relative">
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <span className="text-[7px] font-serif text-slate-900">L</span>
          </div>
          <span className="text-[8px] font-light tracking-[0.2em] text-amber-200/80 uppercase">Luxe</span>
        </div>

        <p className="text-[11px] font-light text-white tracking-wide mb-0.5">The Heritage Watch</p>
        <p className="text-[7px] text-slate-400 mb-4">Swiss automatic movement</p>

        <div className="space-y-2 mb-4">
          <div className="h-7 bg-white/5 backdrop-blur rounded-md border border-white/10 px-2 flex items-center">
            <span className="text-[7px] text-white/40">Email</span>
          </div>
          <div className="h-7 bg-white/5 backdrop-blur rounded-md border border-white/10 px-2 flex items-center justify-between">
            <span className="text-[7px] text-white/40">Card details</span>
            <div className="flex gap-0.5">
              <div className="w-4 h-2.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-[2px]" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-[7px] text-slate-400">Total</span>
          <span className="text-[12px] font-light text-white">$12,500</span>
        </div>

        <button className="w-full h-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 rounded-md text-[8px] font-semibold transition-all">
          Complete Purchase
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Shield className="w-2.5 h-2.5 text-amber-500/60" />
          <span className="text-[6px] text-slate-500">Secured & Insured Shipping</span>
        </div>
      </div>
    </div>
  );
}

// Course/Education Preview
function CoursePreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-white p-3 font-['Inter',system-ui,sans-serif]">
      <div className="flex gap-2 mb-3">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
          <Play className="w-5 h-5 text-white ml-0.5" />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-bold text-slate-900">Master React</p>
          <p className="text-[6px] text-slate-500 mb-1">12 hours • 48 lessons</p>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-[6px] text-slate-500 ml-0.5">(2.4k)</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        {['Full lifetime access', 'Certificate of completion', '24/7 support'].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Check className="w-3 h-3 text-emerald-500" />
            <span className="text-[7px] text-slate-600">{item}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[14px] font-bold text-slate-900">$49</span>
        <span className="text-[9px] text-slate-400 line-through">$199</span>
        <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-[6px] font-medium">75% OFF</span>
      </div>

      <button className="w-full h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[8px] font-semibold transition-colors">
        Enroll Now
      </button>
    </div>
  );
}

// One-Click Checkout Preview
function OneClickPreview() {
  return (
    <div className="w-full h-full bg-white flex flex-col font-['Inter',system-ui,sans-serif]">
      <div className="bg-slate-50 p-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300" />
          <div className="flex-1">
            <p className="text-[9px] font-semibold text-slate-900">Wireless Earbuds Pro</p>
            <p className="text-[7px] text-slate-500">Black • Qty: 1</p>
          </div>
          <span className="text-[10px] font-semibold text-slate-900">$149</span>
        </div>
      </div>

      <div className="flex-1 p-3">
        <p className="text-[8px] font-semibold text-slate-900 mb-2">Express Checkout</p>

        <div className="space-y-1.5 mb-3">
          <button className="w-full h-8 bg-black hover:bg-black/90 text-white rounded-lg text-[8px] font-medium flex items-center justify-center gap-1.5 transition-colors">
            <div className="w-4 h-4 bg-white rounded flex items-center justify-center">
              <span className="text-black text-[8px]">🍎</span>
            </div>
            Apple Pay
          </button>
          <button className="w-full h-8 bg-[#5433FF] hover:bg-[#4428DD] text-white rounded-lg text-[8px] font-medium flex items-center justify-center gap-1.5 transition-colors">
            Shop Pay
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[7px] text-slate-400">or pay with card</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="h-7 bg-slate-100 rounded-lg border border-slate-200 px-2 flex items-center">
          <span className="text-[7px] text-slate-400">Card number</span>
        </div>
      </div>
    </div>
  );
}

// Map template ID to preview component
const PREVIEW_COMPONENTS: Record<string, React.ComponentType> = {
  'product-modern': ProductCheckoutPreview,
  'product-multistep': MultiStepCheckoutPreview,
  'product-luxury': LuxuryCheckoutPreview,
  'product-flash': FlashSalePreview,
  'product-oneclick': OneClickPreview,
  'subscription-pricing': PricingTablePreview,
  'subscription-membership': MembershipPreview,
  'donation-impact': DonationPreview,
  'donation-crowdfund': CrowdfundingPreview,
  'digital-download': DigitalDownloadPreview,
  'digital-course': CoursePreview,
  'service-booking': ServiceBookingPreview,
  'event-ticket': EventTicketPreview,
  'invoice-payment': InvoicePreview,
  'creator-tipjar': TipJarPreview,
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATES DATA
// ═══════════════════════════════════════════════════════════════

const TEMPLATES: PaymentPageTemplate[] = [
  // Product
  {
    id: 'product-modern',
    name: 'Modern Split Checkout',
    description: 'Clean two-column layout with product showcase and streamlined payment form.',
    category: 'product',
    type: 'CHECKOUT',
    popular: true,
    config: {
      headline: 'Complete your purchase',
      acceptedGateways: { stripe: true, paypal: true },
    },
  },
  {
    id: 'product-multistep',
    name: 'Multi-Step Wizard',
    description: 'Guided checkout flow with progress indicator and step-by-step form.',
    category: 'product',
    type: 'CHECKOUT',
    config: {
      headline: 'Checkout',
      acceptedGateways: { stripe: true },
    },
  },
  {
    id: 'product-luxury',
    name: 'Luxury Premium',
    description: 'Elegant dark theme with gold accents for high-end products.',
    category: 'product',
    type: 'CHECKOUT',
    config: {
      headline: 'Exclusive Purchase',
      acceptedGateways: { stripe: true },
    },
  },
  {
    id: 'product-flash',
    name: 'Flash Sale',
    description: 'Urgency-driven design with countdown timer and limited stock.',
    category: 'product',
    type: 'CHECKOUT',
    new: true,
    config: {
      headline: 'Limited Time Offer',
      acceptedGateways: { stripe: true, paypal: true },
    },
  },
  {
    id: 'product-oneclick',
    name: 'One-Click Express',
    description: 'Optimized for speed with Apple Pay, Google Pay, and express checkout.',
    category: 'product',
    type: 'CHECKOUT',
    popular: true,
    config: {
      headline: 'Quick Checkout',
      acceptedGateways: { stripe: true, applePay: true, googlePay: true },
    },
  },

  // Subscription
  {
    id: 'subscription-pricing',
    name: 'SaaS Pricing Table',
    description: 'Three-tier pricing comparison with feature lists and highlighted plan.',
    category: 'subscription',
    type: 'SUBSCRIPTION',
    popular: true,
    config: {
      headline: 'Choose your plan',
      acceptedGateways: { stripe: true },
    },
  },
  {
    id: 'subscription-membership',
    name: 'Creator Membership',
    description: 'Exclusive membership page with benefits list and premium feel.',
    category: 'subscription',
    type: 'SUBSCRIPTION',
    config: {
      headline: 'Become a member',
      acceptedGateways: { stripe: true },
    },
  },

  // Donation
  {
    id: 'donation-impact',
    name: 'Impact Donation',
    description: 'Warm, inviting design with preset amounts and custom option.',
    category: 'donation',
    type: 'DONATION',
    popular: true,
    config: {
      headline: 'Make a difference',
      acceptedGateways: { stripe: true, paypal: true },
    },
  },
  {
    id: 'donation-crowdfund',
    name: 'Crowdfunding Campaign',
    description: 'Goal-oriented page with progress bar, backer count, and reward tiers.',
    category: 'donation',
    type: 'CHECKOUT',
    config: {
      headline: 'Back this project',
      acceptedGateways: { stripe: true },
    },
  },

  // Digital
  {
    id: 'digital-download',
    name: 'Digital Product',
    description: 'Dark, modern design for software, templates, and digital assets.',
    category: 'digital',
    type: 'CHECKOUT',
    popular: true,
    config: {
      headline: 'Get instant access',
      acceptedGateways: { stripe: true, paypal: true },
    },
  },
  {
    id: 'digital-course',
    name: 'Online Course',
    description: 'Educational checkout with course preview, ratings, and curriculum.',
    category: 'digital',
    type: 'CHECKOUT',
    config: {
      headline: 'Start learning today',
      acceptedGateways: { stripe: true },
    },
  },

  // Service
  {
    id: 'service-booking',
    name: 'Appointment Booking',
    description: 'Calendar integration with available time slots and confirmation.',
    category: 'service',
    type: 'CHECKOUT',
    popular: true,
    config: {
      headline: 'Book your appointment',
      acceptedGateways: { stripe: true },
    },
  },

  // Event
  {
    id: 'event-ticket',
    name: 'Event Tickets',
    description: 'Vibrant design with ticket tiers, event details, and seat selection.',
    category: 'event',
    type: 'CHECKOUT',
    popular: true,
    config: {
      headline: 'Get your tickets',
      acceptedGateways: { stripe: true, applePay: true },
    },
  },

  // Invoice
  {
    id: 'invoice-payment',
    name: 'Professional Invoice',
    description: 'Clean B2B invoice with line items, due date, and payment options.',
    category: 'invoice',
    type: 'INVOICE',
    config: {
      headline: 'Pay invoice',
      acceptedGateways: { stripe: true, paypal: true },
    },
  },

  // Creator
  {
    id: 'creator-tipjar',
    name: 'Tip Jar',
    description: 'Fun, friendly design for creators with emoji amounts and messages.',
    category: 'creator',
    type: 'DONATION',
    config: {
      headline: 'Support my work',
      acceptedGateways: { stripe: true, paypal: true },
    },
  },
];

// ═══════════════════════════════════════════════════════════════
// TEMPLATE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

interface TemplateCardProps {
  template: PaymentPageTemplate;
  onPreview: () => void;
  onUseTemplate: () => void;
}

function TemplateCard({ template, onPreview, onUseTemplate }: TemplateCardProps) {
  const PreviewComponent = PREVIEW_COMPONENTS[template.id];
  const categoryInfo = CATEGORIES[template.category];

  return (
    <div className="group relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-black/20">
      {/* Preview Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950">
        {/* Actual Preview */}
        <div className="absolute inset-3 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          {PreviewComponent ? (
            <PreviewComponent />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <span className="text-zinc-600 text-sm">Preview</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-1.5 z-10">
          {template.popular && (
            <span className="px-2 py-0.5 bg-amber-500 text-[10px] font-semibold text-white rounded-full shadow-lg">
              Popular
            </span>
          )}
          {template.new && (
            <span className="px-2 py-0.5 bg-emerald-500 text-[10px] font-semibold text-white rounded-full shadow-lg">
              New
            </span>
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
          <button
            onClick={onPreview}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-white/20"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={onUseTemplate}
            className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Use Template
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="text-sm font-semibold text-white mb-0.5">{template.name}</h3>
            <p className="text-xs text-zinc-500 line-clamp-2">{template.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-md text-[10px] font-medium text-zinc-400">
            {categoryInfo.icon}
            {categoryInfo.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PREVIEW MODAL
// ═══════════════════════════════════════════════════════════════

interface PreviewModalProps {
  template: PaymentPageTemplate;
  onClose: () => void;
  onUseTemplate: () => void;
}

function PreviewModal({ template, onClose, onUseTemplate }: PreviewModalProps) {
  const PreviewComponent = PREVIEW_COMPONENTS[template.id];
  const categoryInfo = CATEGORIES[template.category];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
              {categoryInfo.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{template.name}</h2>
              <p className="text-sm text-zinc-500">{template.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="p-8 bg-zinc-950">
          <div className="max-w-md mx-auto aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {PreviewComponent ? (
              <PreviewComponent />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <span className="text-zinc-600">Preview not available</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {template.popular && (
                <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium rounded-md">
                  Popular Choice
                </span>
              )}
              {template.new && (
                <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-md">
                  Just Added
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onUseTemplate}
              className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Use This Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function PaymentPageTemplatesPage() {
  const router = useRouter();
  const { selectedCompanyId } = useHierarchy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<PaymentPageTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = async (template: PaymentPageTemplate) => {
    if (!selectedCompanyId) {
      alert('Please select a company first');
      return;
    }

    setIsCreating(true);
    try {
      const slug = `${template.id}-${Date.now()}`;
      const page = await paymentPagesApi.create(
        {
          name: template.name,
          slug,
          type: template.type,
          ...template.config,
          paymentConfig: {},
          customerFieldsConfig: {
            email: { enabled: true, required: true },
            name: { enabled: true, required: true },
          },
          acceptedGateways: template.config.acceptedGateways || { stripe: true },
        },
        selectedCompanyId
      );
      router.push(`/payment-pages/${page.id}/edit`);
    } catch (error) {
      console.error('Failed to create page:', error);
      alert('Failed to create page. Please try again.');
    } finally {
      setIsCreating(false);
      setPreviewTemplate(null);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/payment-pages"
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-400" />
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Template Gallery
                  </h1>
                  <p className="text-sm text-zinc-500">Choose a starting point for your payment page</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  selectedCategory === 'all'
                    ? "bg-white text-zinc-900"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                )}
              >
                All Templates
              </button>
              {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as TemplateCategory)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all",
                    selectedCategory === key
                      ? "bg-white text-zinc-900"
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Section */}
          {selectedCategory === 'all' && !searchQuery && (
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                Most Popular
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {TEMPLATES.filter((t) => t.popular).map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onPreview={() => setPreviewTemplate(template)}
                    onUseTemplate={() => handleUseTemplate(template)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Templates */}
          <div>
            {selectedCategory === 'all' && !searchQuery && (
              <h2 className="text-lg font-semibold text-white mb-4">All Templates</h2>
            )}

            {filteredTemplates.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900 flex items-center justify-center">
                  <Search className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
                <p className="text-zinc-500">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(selectedCategory === 'all' && !searchQuery
                  ? filteredTemplates.filter((t) => !t.popular)
                  : filteredTemplates
                ).map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onPreview={() => setPreviewTemplate(template)}
                    onUseTemplate={() => handleUseTemplate(template)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUseTemplate={() => handleUseTemplate(previewTemplate)}
        />
      )}

      {/* Creating Overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center animate-pulse">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <p className="text-white font-medium">Creating your page...</p>
          </div>
        </div>
      )}
    </>
  );
}
