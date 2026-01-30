'use client';

import { useState } from 'react';
import { ShoppingCartIcon, XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useFunnel } from '@/contexts/funnel-context';

export function CartSummary() {
  const [isOpen, setIsOpen] = useState(false);
  const { cart, cartTotal, cartCount, updateCartItem, removeFromCart } = useFunnel();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <ShoppingCartIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        {cartCount > 0 && (
          <span className="flex items-center justify-center h-5 w-5 bg-[var(--primary-color,#6366f1)] text-white text-xs font-medium rounded-full">
            {cartCount}
          </span>
        )}
      </button>

      {/* Cart dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Cart</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCartIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="mt-2 text-gray-500 dark:text-gray-400">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="max-h-80 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.variantId || ''}`} className="p-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex gap-3">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">${item.price.toFixed(2)}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              <MinusIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </button>
                            <span className="text-sm font-medium w-8 text-center text-gray-900 dark:text-gray-100">{item.quantity}</span>
                            <button
                              onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              <PlusIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">${cartTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Shipping and taxes calculated at checkout</p>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
