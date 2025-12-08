'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X, Search } from 'lucide-react';
import { COUNTRIES, getCountryByCode, type Region } from '@/lib/address-data';

interface AddressPrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface ParsedAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: ParsedAddress) => void;
  companyId: string; // Required for API billing
  placeholder?: string;
  countries?: string[]; // Restrict to specific countries, e.g., ['us', 'ca']
  disabled?: boolean;
  className?: string;
  selectedCountry?: string; // Current country in the form
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  companyId,
  placeholder = 'Start typing your address...',
  countries = ['us', 'ca', 'gb', 'au', 'mx'],
  disabled = false,
  className = '',
  selectedCountry = 'US',
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Generate a new session token
  const getOrCreateSessionToken = useCallback(() => {
    if (!sessionToken) {
      const token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      setSessionToken(token);
      return token;
    }
    return sessionToken;
  }, [sessionToken]);

  // Fetch autocomplete predictions
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = getOrCreateSessionToken();
      const params = new URLSearchParams({
        input,
        sessionToken: token,
        companyId,
        countries: countries.join(','),
      });

      const response = await fetch(`${API_BASE}/api/address/autocomplete?${params}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setPredictions([]);
      } else {
        setPredictions(data.predictions || []);
        setIsOpen(data.predictions?.length > 0);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
      setError('Failed to fetch suggestions');
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [countries, companyId, getOrCreateSessionToken]);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setHighlightedIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  };

  // Handle prediction selection
  const handleSelect = async (prediction: AddressPrediction) => {
    setIsLoading(true);
    setIsOpen(false);

    try {
      const token = getOrCreateSessionToken();
      const params = new URLSearchParams({
        placeId: prediction.placeId,
        sessionToken: token,
        companyId,
      });

      const response = await fetch(`${API_BASE}/api/address/details?${params}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        onChange(prediction.mainText);
      } else {
        onChange(data.address.street1);
        onAddressSelect(data.address);
        // Reset session token after successful selection
        setSessionToken(null);
      }
    } catch (err) {
      console.error('Place details error:', err);
      setError('Failed to get address details');
      onChange(prediction.mainText);
    } finally {
      setIsLoading(false);
      setPredictions([]);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && predictions[highlightedIndex]) {
          handleSelect(predictions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear input
  const handleClear = () => {
    onChange('');
    setPredictions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const country = getCountryByCode(selectedCountry);

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 pr-10 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-zinc-900 bg-white disabled:bg-zinc-100 disabled:cursor-not-allowed ${className}`}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="address-suggestions"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Predictions dropdown */}
      {isOpen && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          id="address-suggestions"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={() => handleSelect(prediction)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${
                index === highlightedIndex
                  ? 'bg-blue-50'
                  : 'hover:bg-zinc-50'
              }`}
            >
              <MapPin className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-zinc-900">
                  {prediction.mainText}
                </div>
                <div className="text-xs text-zinc-500">
                  {prediction.secondaryText}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Hint text */}
      <p className="mt-1 text-xs text-zinc-500">
        Start typing to search, or enter address manually
      </p>
    </div>
  );
}

export default AddressAutocomplete;
