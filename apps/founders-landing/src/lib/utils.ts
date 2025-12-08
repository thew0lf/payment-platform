import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFounderNumber(num: number): string {
  return `FND-${num.toString().padStart(4, '0')}`;
}

export function parseFounderNumber(founderNumber: string): number | null {
  const match = founderNumber.match(/^FND-(\d{4})$/);
  return match ? parseInt(match[1], 10) : null;
}

export function generateReferralLink(referralCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://founders.avnz.io';
  return `${baseUrl}/?ref=${referralCode}`;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  // Basic international phone validation
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}
