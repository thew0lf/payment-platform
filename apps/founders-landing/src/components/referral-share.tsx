'use client';

import { useState } from 'react';
import { Copy, Twitter, Mail, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReferralShareProps {
  referralCode: string;
  referralLink: string;
}

export function ReferralShare({ referralCode, referralLink }: ReferralShareProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      `I just joined as Founder ${referralCode} at @avnz_io! Join me and let's build the future of intelligent commerce together. 🚀`
    );
    const url = encodeURIComponent(referralLink);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank'
    );
  };

  const shareByEmail = () => {
    const subject = encodeURIComponent('Join me as a founder at avnz.io');
    const body = encodeURIComponent(
      `Hey!\n\nI just claimed my founder number (${referralCode}) at avnz.io and thought you might be interested.\n\nThey're building something really cool - an intelligent commerce platform powered by AI.\n\nUse my link to join: ${referralLink}\n\nLet's build something great together!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join avnz.io Founders',
          text: `Join me as a founder at avnz.io! I'm Founder ${referralCode}.`,
          url: referralLink,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Referral Link Input */}
      <div className="relative">
        <input
          type="text"
          value={referralLink}
          readOnly
          className="w-full px-4 py-3 pr-24 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-mono"
        />
        <button
          onClick={copyToClipboard}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            copied
              ? 'bg-green-500 text-white'
              : 'bg-brand-600 hover:bg-brand-500 text-white'
          )}
        >
          {copied ? (
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4" />
              Copied
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Copy className="w-4 h-4" />
              Copy
            </span>
          )}
        </button>
      </div>

      {/* Share Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={shareOnTwitter}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-medium transition-colors"
        >
          <Twitter className="w-5 h-5" />
          <span>Twitter</span>
        </button>

        <button
          onClick={shareByEmail}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium transition-colors"
        >
          <Mail className="w-5 h-5" />
          <span>Email</span>
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={shareNative}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        )}
      </div>

      {/* Referral Info */}
      <div className="p-4 rounded-lg bg-brand-500/10 border border-brand-500/20">
        <p className="text-sm text-brand-700 dark:text-brand-300">
          <strong>+10 positions</strong> for each friend who joins with your link!
          Move up the waitlist and unlock exclusive benefits faster.
        </p>
      </div>
    </div>
  );
}
