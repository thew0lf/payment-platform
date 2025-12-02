import { Coffee, Instagram, Twitter, Facebook, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-coffee-950 text-coffee-200 py-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Coffee className="h-8 w-8 text-coffee-400" />
              <span className="text-xl font-bold text-white">
                Coffee Explorer
              </span>
            </div>
            <p className="text-sm text-coffee-400 mb-4">
              Discover exceptional coffee from around the world, delivered fresh
              to your door.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-coffee-400 hover:text-coffee-200 transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-coffee-400 hover:text-coffee-200 transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-coffee-400 hover:text-coffee-200 transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-coffee-400 hover:text-coffee-200 transition-colors"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold text-white mb-4">Shop</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#plans"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Subscriptions
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Single Bags
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Gift Cards
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Equipment
                </a>
              </li>
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h4 className="font-semibold text-white mb-4">Learn</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Brewing Guides
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Coffee Origins
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Our Roasters
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Sustainability
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Shipping Info
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Returns
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-coffee-400 hover:text-coffee-200 transition-colors text-sm"
                >
                  Account
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-coffee-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-coffee-500">
            &copy; {new Date().getFullYear()} Coffee Explorer. All rights
            reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-sm text-coffee-500 hover:text-coffee-300 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-sm text-coffee-500 hover:text-coffee-300 transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-sm text-coffee-500 hover:text-coffee-300 transition-colors"
            >
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
