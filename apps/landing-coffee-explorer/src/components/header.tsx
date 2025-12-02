'use client';

import { useState } from 'react';
import { Menu, X, Coffee } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream-50/95 backdrop-blur-sm border-b border-coffee-200">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Coffee className="h-8 w-8 text-coffee-600" />
            <span className="text-xl font-bold text-coffee-900">
              Coffee Explorer
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-coffee-700 hover:text-coffee-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-coffee-700 hover:text-coffee-900 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#plans"
              className="text-coffee-700 hover:text-coffee-900 transition-colors"
            >
              Plans
            </a>
            <a
              href="#reviews"
              className="text-coffee-700 hover:text-coffee-900 transition-colors"
            >
              Reviews
            </a>
            <a
              href="#faq"
              className="text-coffee-700 hover:text-coffee-900 transition-colors"
            >
              FAQ
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="/login"
              className="text-coffee-700 hover:text-coffee-900 transition-colors"
            >
              Sign In
            </a>
            <a
              href="#plans"
              className="bg-coffee-600 hover:bg-coffee-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Get Started
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-coffee-700" />
            ) : (
              <Menu className="h-6 w-6 text-coffee-700" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-coffee-200">
            <div className="flex flex-col gap-4">
              <a
                href="#features"
                className="text-coffee-700 hover:text-coffee-900 transition-colors px-2 py-1"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-coffee-700 hover:text-coffee-900 transition-colors px-2 py-1"
              >
                How It Works
              </a>
              <a
                href="#plans"
                className="text-coffee-700 hover:text-coffee-900 transition-colors px-2 py-1"
              >
                Plans
              </a>
              <a
                href="#reviews"
                className="text-coffee-700 hover:text-coffee-900 transition-colors px-2 py-1"
              >
                Reviews
              </a>
              <a
                href="#faq"
                className="text-coffee-700 hover:text-coffee-900 transition-colors px-2 py-1"
              >
                FAQ
              </a>
              <hr className="border-coffee-200" />
              <a
                href="/login"
                className="text-coffee-700 hover:text-coffee-900 transition-colors px-2 py-1"
              >
                Sign In
              </a>
              <a
                href="#plans"
                className="bg-coffee-600 hover:bg-coffee-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-center"
              >
                Get Started
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
