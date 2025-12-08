'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  Crown,
  LayoutGrid,
  CheckCircle,
  Star,
  Zap,
  Palette,
  Smartphone,
  MessageSquare,
  Users,
  TrendingUp,
  Quote,
  Coffee,
  Heart,
  Shield,
  Clock,
  Award,
  Target,
  Rocket,
  Gem,
  ArrowRight,
  Play,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemplateDetail, TemplateGalleryItem } from '@/lib/api/landing-pages';

const THEME_COLORS: Record<string, { bg: string; text: string; accent: string; border: string }> = {
  STARTER: { bg: 'bg-blue-600', text: 'text-blue-600', accent: 'bg-blue-100', border: 'border-blue-600' },
  ARTISAN: { bg: 'bg-amber-600', text: 'text-amber-600', accent: 'bg-amber-100', border: 'border-amber-600' },
  VELOCITY: { bg: 'bg-red-600', text: 'text-red-600', accent: 'bg-red-100', border: 'border-red-600' },
  LUXE: { bg: 'bg-purple-600', text: 'text-purple-600', accent: 'bg-purple-100', border: 'border-purple-600' },
};

const THEME_GRADIENTS: Record<string, string> = {
  STARTER: 'from-blue-600 to-blue-800',
  ARTISAN: 'from-amber-600 to-orange-700',
  VELOCITY: 'from-red-600 to-pink-600',
  LUXE: 'from-purple-600 to-indigo-700',
};

// ============================================================================
// STARTER TEMPLATE - Clean, minimal SaaS layout
// ============================================================================
function StarterTemplate({ template, colors, gradient }: { template: TemplateGalleryItem; colors: typeof THEME_COLORS.STARTER; gradient: string }) {
  return (
    <>
      {/* Header - Simple centered */}
      <header className="bg-white border-b border-zinc-200 py-4 sticky top-14 z-40">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="text-zinc-900 font-bold text-xl">YourBrand</div>
          <nav className="hidden md:flex items-center gap-8 text-zinc-600">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
            <a href="#about" className="hover:text-zinc-900 transition-colors">About</a>
          </nav>
          <button className={cn('px-4 py-2 text-white rounded-lg transition-colors', colors.bg)}>
            Get Started
          </button>
        </div>
      </header>

      {/* Hero - Centered with illustration placeholder */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {template.isNew && (
                <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full mb-6', colors.accent, colors.text)}>
                  <Sparkles className="h-4 w-4" />
                  New Template
                </span>
              )}
              <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6 leading-tight">
                Simple tools for modern teams
              </h1>
              <p className="text-lg text-zinc-600 mb-8">
                {template.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className={cn('px-6 py-3 text-white rounded-lg font-medium', colors.bg)}>
                  Start Free Trial
                </button>
                <button className="px-6 py-3 border border-zinc-300 text-zinc-700 rounded-lg font-medium hover:bg-zinc-100 transition-colors">
                  Watch Demo
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-2xl flex items-center justify-center">
                <div className={cn('w-32 h-32 rounded-xl flex items-center justify-center', colors.bg)}>
                  <LayoutGrid className="h-16 w-16 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Simple 3-column grid */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Everything you need</h2>
            <p className="text-lg text-zinc-600">Simple, powerful features for your business.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {template.features.slice(0, 6).map((feature, idx) => {
              const icons = [Zap, Shield, Clock, CheckCircle, Star, Users];
              const Icon = icons[idx % icons.length];
              return (
                <div key={idx} className="text-center p-6">
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4', colors.accent)}>
                    <Icon className={cn('h-6 w-6', colors.text)} />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">{feature}</h3>
                  <p className="text-zinc-600">
                    Simple and effective solution for your needs.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA - Simple centered */}
      <section className={cn('py-16 bg-gradient-to-r', gradient)}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-white/80 mb-8">Join thousands of happy customers today.</p>
          <button className="px-8 py-4 bg-white text-zinc-900 rounded-lg font-semibold hover:bg-zinc-100 transition-colors">
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="py-8 bg-zinc-900 text-zinc-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white font-bold">YourBrand</div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
          <div className="text-sm">&copy; 2024 YourBrand</div>
        </div>
      </footer>
    </>
  );
}

// ============================================================================
// ARTISAN TEMPLATE - Warm, craft-focused layout with editorial feel
// ============================================================================
function ArtisanTemplate({ template, colors, gradient }: { template: TemplateGalleryItem; colors: typeof THEME_COLORS.ARTISAN; gradient: string }) {
  return (
    <>
      {/* Header - Centered logo with side nav */}
      <header className="bg-stone-50 border-b border-stone-200 py-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <nav className="hidden md:flex items-center gap-6 text-stone-600 text-sm uppercase tracking-wide">
              <a href="#story" className="hover:text-amber-700 transition-colors">Our Story</a>
              <a href="#products" className="hover:text-amber-700 transition-colors">Products</a>
            </nav>
            <div className="text-2xl font-serif text-stone-900">Artisan Co.</div>
            <nav className="hidden md:flex items-center gap-6 text-stone-600 text-sm uppercase tracking-wide">
              <a href="#process" className="hover:text-amber-700 transition-colors">Process</a>
              <a href="#contact" className="hover:text-amber-700 transition-colors">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero - Full-width image style with overlay */}
      <section className="relative bg-stone-900 py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <span className="inline-block text-amber-400 text-sm uppercase tracking-[0.3em] mb-6">
            Handcrafted with care
          </span>
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-6 leading-tight">
            Tradition Meets<br />Modern Craft
          </h1>
          <p className="text-lg text-stone-300 mb-10 max-w-2xl mx-auto">
            {template.description}
          </p>
          <button className="px-8 py-4 bg-amber-600 text-white rounded-none font-medium uppercase tracking-wide hover:bg-amber-700 transition-colors">
            Explore Our Collection
          </button>
        </div>
      </section>

      {/* Story Section - Editorial layout */}
      <section id="story" className="py-20 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="aspect-[4/5] bg-stone-200 rounded-sm flex items-center justify-center">
              <Coffee className="h-24 w-24 text-stone-400" />
            </div>
            <div>
              <span className="text-amber-600 text-sm uppercase tracking-[0.2em] mb-4 block">Our Story</span>
              <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-6">
                Crafted by hand, perfected over generations
              </h2>
              <p className="text-stone-600 mb-6 leading-relaxed">
                Every piece tells a story. From sourcing the finest materials to the final touches,
                we pour our heart into every creation. Our artisans bring decades of experience
                and an unwavering commitment to quality.
              </p>
              <a href="#" className="inline-flex items-center gap-2 text-amber-700 font-medium hover:gap-3 transition-all">
                Learn more about us <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Alternating layout */}
      <section id="products" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm uppercase tracking-[0.2em] mb-4 block">What We Offer</span>
            <h2 className="text-3xl md:text-4xl font-serif text-stone-900">Our Craftsmanship</h2>
          </div>
          <div className="space-y-16">
            {template.features.slice(0, 3).map((feature, idx) => {
              const icons = [Heart, Award, Palette];
              const Icon = icons[idx % icons.length];
              const isEven = idx % 2 === 0;
              return (
                <div key={idx} className={cn('grid lg:grid-cols-2 gap-12 items-center', !isEven && 'lg:flex-row-reverse')}>
                  <div className={cn('aspect-video bg-stone-100 rounded-sm flex items-center justify-center', !isEven && 'lg:order-2')}>
                    <Icon className="h-16 w-16 text-stone-300" />
                  </div>
                  <div className={!isEven ? 'lg:order-1' : ''}>
                    <h3 className="text-2xl font-serif text-stone-900 mb-4">{feature}</h3>
                    <p className="text-stone-600 leading-relaxed">
                      We believe in the beauty of simplicity and the power of tradition.
                      Each element is carefully considered and thoughtfully executed.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial - Large quote */}
      <section className="py-20 bg-stone-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Quote className="h-12 w-12 text-amber-500 mx-auto mb-8" />
          <blockquote className="text-2xl md:text-3xl font-serif mb-8 leading-relaxed">
            &ldquo;The attention to detail is remarkable. You can feel the passion and care
            that goes into every piece.&rdquo;
          </blockquote>
          <div className="text-stone-400">
            <span className="text-white font-medium">Emma Williams</span> &mdash; Interior Designer
          </div>
        </div>
      </section>

      {/* Footer - Elegant with newsletter */}
      <footer className="py-16 bg-stone-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="text-2xl font-serif text-stone-900 mb-4">Artisan Co.</div>
              <p className="text-stone-600 text-sm">Handcrafted goods made with love and tradition.</p>
            </div>
            <div>
              <div className="text-sm uppercase tracking-wide text-stone-900 mb-4">Visit Us</div>
              <p className="text-stone-600 text-sm">
                123 Craft Street<br />
                Portland, OR 97201
              </p>
            </div>
            <div>
              <div className="text-sm uppercase tracking-wide text-stone-900 mb-4">Newsletter</div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-4 py-2 border border-stone-300 rounded-none text-sm"
                />
                <button className="px-4 py-2 bg-amber-600 text-white text-sm">Join</button>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-300 pt-8 text-center text-stone-500 text-sm">
            &copy; 2024 Artisan Co. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}

// ============================================================================
// VELOCITY TEMPLATE - Bold, dynamic layout for high-energy brands
// ============================================================================
function VelocityTemplate({ template, colors, gradient }: { template: TemplateGalleryItem; colors: typeof THEME_COLORS.VELOCITY; gradient: string }) {
  return (
    <>
      {/* Header - Bold with accent line */}
      <header className="bg-zinc-950 border-b-4 border-red-600 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="text-white font-black text-2xl tracking-tight">VELOCITY</div>
          <nav className="hidden md:flex items-center gap-8 text-zinc-400 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#speed" className="hover:text-white transition-colors">Speed</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <button className="px-6 py-2 bg-red-600 text-white font-bold uppercase tracking-wide hover:bg-red-700 transition-colors">
            Launch Now
          </button>
        </div>
      </header>

      {/* Hero - Split diagonal design */}
      <section className="relative bg-zinc-950 py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-red-600 transform skew-x-12 translate-x-1/3"></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="max-w-2xl">
            {template.isNew && (
              <span className="inline-flex items-center gap-2 px-4 py-1 bg-red-600 text-white text-sm font-bold uppercase mb-6">
                <Zap className="h-4 w-4" />
                New Release
              </span>
            )}
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-none tracking-tight">
              MOVE<br />
              <span className="text-red-500">FASTER</span>
            </h1>
            <p className="text-xl text-zinc-400 mb-8">
              {template.description}
            </p>
            <div className="flex gap-4">
              <button className="px-8 py-4 bg-red-600 text-white font-bold uppercase tracking-wide hover:bg-red-700 transition-colors flex items-center gap-2">
                Get Started <ArrowRight className="h-5 w-5" />
              </button>
              <button className="px-8 py-4 border-2 border-zinc-700 text-white font-bold uppercase tracking-wide hover:border-zinc-500 transition-colors flex items-center gap-2">
                <Play className="h-5 w-5" /> Watch Video
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats - Bold numbers */}
      <section className="bg-red-600 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10x', label: 'Faster' },
              { value: '99.9%', label: 'Uptime' },
              { value: '50K+', label: 'Users' },
              { value: '<1s', label: 'Load Time' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl md:text-5xl font-black text-white mb-2">{stat.value}</div>
                <div className="text-red-200 uppercase tracking-wide text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Card grid with hover effects */}
      <section id="features" className="py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">BUILT FOR SPEED</h2>
            <p className="text-zinc-400 text-lg">Everything you need to outpace the competition.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {template.features.slice(0, 6).map((feature, idx) => {
              const icons = [Rocket, Target, Zap, Shield, TrendingUp, Clock];
              const Icon = icons[idx % icons.length];
              return (
                <div
                  key={idx}
                  className="bg-zinc-900 p-6 border border-zinc-800 hover:border-red-600 transition-colors group"
                >
                  <div className="w-14 h-14 bg-red-600/20 flex items-center justify-center mb-4 group-hover:bg-red-600 transition-colors">
                    <Icon className="h-7 w-7 text-red-500 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature}</h3>
                  <p className="text-zinc-500">
                    Push the limits of what&apos;s possible with cutting-edge technology.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA - Bold split design */}
      <section className="relative bg-zinc-950 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 transform -skew-y-3"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative py-8">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            READY TO ACCELERATE?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join the fastest-growing platform in the industry.
          </p>
          <button className="px-10 py-5 bg-zinc-950 text-white font-black uppercase tracking-wide hover:bg-zinc-900 transition-colors">
            Launch Now
          </button>
        </div>
      </section>

      {/* Footer - Minimal dark */}
      <footer className="py-8 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white font-black text-xl">VELOCITY</div>
          <div className="flex gap-8 text-zinc-500 text-sm font-medium">
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Support</a>
          </div>
          <div className="text-zinc-600 text-sm">&copy; 2024 Velocity Inc.</div>
        </div>
      </footer>
    </>
  );
}

// ============================================================================
// LUXE TEMPLATE - Premium, elegant layout for luxury brands
// ============================================================================
function LuxeTemplate({ template, colors, gradient }: { template: TemplateGalleryItem; colors: typeof THEME_COLORS.LUXE; gradient: string }) {
  return (
    <>
      {/* Header - Elegant with gold accents */}
      <header className="bg-zinc-950 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="text-2xl font-light tracking-[0.3em] text-white">LUXE</div>
          <nav className="hidden md:flex items-center gap-10 text-zinc-400 text-sm tracking-widest uppercase">
            <a href="#collection" className="hover:text-amber-400 transition-colors">Collection</a>
            <a href="#craftsmanship" className="hover:text-amber-400 transition-colors">Craftsmanship</a>
            <a href="#boutique" className="hover:text-amber-400 transition-colors">Boutique</a>
          </nav>
          <button className="text-amber-400 text-sm tracking-widest uppercase hover:text-amber-300 transition-colors">
            Reserve
          </button>
        </div>
      </header>

      {/* Hero - Full screen elegant */}
      <section className="relative min-h-[80vh] bg-zinc-950 flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"></div>
        <div className="max-w-6xl mx-auto px-6 text-center relative">
          {template.isPremium && (
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px w-12 bg-amber-400"></div>
              <Crown className="h-5 w-5 text-amber-400" />
              <div className="h-px w-12 bg-amber-400"></div>
            </div>
          )}
          <h1 className="text-5xl md:text-7xl font-light text-white mb-8 tracking-wider">
            Exceptional<br />
            <span className="font-normal italic text-amber-400">by Design</span>
          </h1>
          <p className="text-lg text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            {template.description}
          </p>
          <button className="px-12 py-4 border border-amber-400 text-amber-400 text-sm tracking-[0.2em] uppercase hover:bg-amber-400 hover:text-zinc-950 transition-all">
            Discover More
          </button>
        </div>
      </section>

      {/* Divider */}
      <div className="bg-zinc-950 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-center gap-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-800"></div>
          <Gem className="h-5 w-5 text-amber-400" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-800"></div>
        </div>
      </div>

      {/* Features - Elegant vertical list */}
      <section id="collection" className="py-24 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-amber-400 text-xs tracking-[0.3em] uppercase mb-4 block">The Collection</span>
            <h2 className="text-4xl font-light text-white tracking-wide">Curated Excellence</h2>
          </div>
          <div className="space-y-16">
            {template.features.slice(0, 4).map((feature, idx) => {
              const icons = [Gem, Star, Crown, Award];
              const Icon = icons[idx % icons.length];
              return (
                <div key={idx} className="flex items-start gap-8 group">
                  <div className="w-16 h-16 border border-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:border-amber-400 transition-colors">
                    <Icon className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl text-white mb-3 tracking-wide">{feature}</h3>
                    <p className="text-zinc-500 leading-relaxed">
                      Meticulously crafted to meet the highest standards of excellence.
                      Every detail considered, every element perfected.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Image section with quote */}
      <section className="bg-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2">
            <div className="aspect-square lg:aspect-auto bg-gradient-to-br from-purple-900/30 to-zinc-900 flex items-center justify-center">
              <div className="w-48 h-48 border border-amber-400/30 flex items-center justify-center">
                <Gem className="h-20 w-20 text-amber-400/50" />
              </div>
            </div>
            <div className="p-12 lg:p-20 flex flex-col justify-center">
              <Quote className="h-10 w-10 text-amber-400/30 mb-8" />
              <blockquote className="text-2xl md:text-3xl text-white font-light leading-relaxed mb-8">
                &ldquo;True luxury is not about price. It&apos;s about the experience,
                the attention to detail, and the pursuit of perfection.&rdquo;
              </blockquote>
              <div className="text-amber-400 text-sm tracking-[0.2em] uppercase">
                Master Craftsman
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact - Elegant form */}
      <section id="boutique" className="py-24 bg-zinc-950">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <span className="text-amber-400 text-xs tracking-[0.3em] uppercase mb-4 block">Private Consultation</span>
          <h2 className="text-4xl font-light text-white tracking-wide mb-6">Request an Appointment</h2>
          <p className="text-zinc-400 mb-12">
            Experience our collection in an exclusive private setting.
          </p>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              className="w-full px-6 py-4 bg-transparent border border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-400 outline-none transition-colors text-center"
            />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full px-6 py-4 bg-transparent border border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-400 outline-none transition-colors text-center"
            />
            <button className="w-full px-6 py-4 bg-amber-400 text-zinc-950 text-sm tracking-[0.2em] uppercase font-medium hover:bg-amber-300 transition-colors">
              Submit Request
            </button>
          </div>
        </div>
      </section>

      {/* Footer - Minimal elegant */}
      <footer className="py-12 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col items-center gap-8">
            <div className="text-2xl font-light tracking-[0.3em] text-white">LUXE</div>
            <div className="flex items-center gap-8 text-zinc-500 text-xs tracking-[0.2em] uppercase">
              <a href="#" className="hover:text-amber-400">Privacy</a>
              <span className="text-zinc-800">|</span>
              <a href="#" className="hover:text-amber-400">Terms</a>
              <span className="text-zinc-800">|</span>
              <a href="#" className="hover:text-amber-400">Contact</a>
            </div>
            <div className="text-zinc-700 text-xs tracking-widest">
              &copy; 2024 LUXE. ALL RIGHTS RESERVED.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TemplatePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateGalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const templateId = params?.template as string ?? '';

  useEffect(() => {
    async function loadTemplate() {
      setLoading(true);
      try {
        const data = await getTemplateDetail(templateId);
        setTemplate(data);
      } catch (err) {
        console.error('Failed to load template:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [templateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">Template Not Found</h1>
        <p className="text-zinc-400 mb-8">The template &quot;{templateId}&quot; does not exist.</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    );
  }

  const colors = THEME_COLORS[template.theme] || THEME_COLORS.STARTER;
  const gradient = THEME_GRADIENTS[template.theme] || THEME_GRADIENTS.STARTER;

  // Render the appropriate template based on theme
  const renderTemplate = () => {
    switch (template.theme) {
      case 'ARTISAN':
        return <ArtisanTemplate template={template} colors={colors} gradient={gradient} />;
      case 'VELOCITY':
        return <VelocityTemplate template={template} colors={colors} gradient={gradient} />;
      case 'LUXE':
        return <LuxeTemplate template={template} colors={colors} gradient={gradient} />;
      case 'STARTER':
      default:
        return <StarterTemplate template={template} colors={colors} gradient={gradient} />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Preview Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/landing-pages/templates')}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Templates</span>
            </button>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className={cn('px-2 py-1 rounded text-xs font-medium text-white', colors.bg)}>
                {template.theme}
              </span>
              <span className="text-white font-medium">{template.name}</span>
              {template.isPremium && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  <Crown className="h-3 w-3" />
                  Premium
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push('/landing-pages/templates')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Use This Template
          </button>
        </div>
      </div>

      {/* Template Content */}
      <div className="pt-14">
        {renderTemplate()}
      </div>
    </div>
  );
}
