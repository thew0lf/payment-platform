'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  const content = type === 'terms' ? <TermsContent /> : <PrivacyContent />;
  const title = type === 'terms' ? 'Terms of Service' : 'Privacy Policy';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="prose dark:prose-invert prose-sm prose-zinc max-w-none">
            {content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-zinc-500 text-sm">Effective Date: December 6, 2025</p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the website,
        products, and services (collectively, the &quot;Services&quot;) provided by Avanzado Technologies LLC
        (&quot;avnz.io,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using our Services, you agree
        to be bound by these Terms.
      </p>

      <h3>1. Eligibility</h3>
      <p>
        You must be at least 18 years old and have the legal capacity to enter into a binding
        agreement to use our Services. By using the Services, you represent and warrant that you
        meet these requirements.
      </p>

      <h3>2. Account Registration</h3>
      <p>To access certain features of our Services, you may be required to create an account. You agree to:</p>
      <ul>
        <li>Provide accurate, current, and complete information during registration</li>
        <li>Maintain and promptly update your account information</li>
        <li>Keep your login credentials confidential and secure</li>
        <li>Accept responsibility for all activities that occur under your account</li>
      </ul>

      <h3>3. Founders Program</h3>
      <p>The avnz.io Founders Program is a limited early access initiative. Participation is subject to the following conditions:</p>
      <ul>
        <li>Founder numbers and positions are assigned based on registration order and referral activity</li>
        <li>Benefits associated with founder status are provided at our sole discretion and may be modified</li>
        <li>The referral program is subject to anti-fraud measures</li>
        <li>Creating multiple accounts or engaging in fraudulent referral activity will result in disqualification</li>
      </ul>

      <h3>4. Acceptable Use</h3>
      <p>You agree not to use the Services to:</p>
      <ul>
        <li>Violate any applicable law, regulation, or third-party rights</li>
        <li>Transmit any malicious code, viruses, or harmful software</li>
        <li>Interfere with or disrupt the integrity or performance of the Services</li>
        <li>Use the Services for any fraudulent or deceptive purpose</li>
      </ul>

      <h3>5. Intellectual Property</h3>
      <p>
        All content, features, functionality, software, and materials available through the Services
        are owned by avnz.io or its licensors and are protected by intellectual property laws.
      </p>

      <h3>6. Disclaimer of Warranties</h3>
      <p>
        THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
        EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
      </p>

      <h3>7. Limitation of Liability</h3>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, AVNZ.IO SHALL NOT BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES RESULTING FROM YOUR USE OF THE SERVICES.
      </p>

      <h3>8. Changes to Terms</h3>
      <p>
        We reserve the right to modify these Terms at any time. We will notify you of significant changes
        via email or by posting a notice on our website.
      </p>

      <h3>9. Contact</h3>
      <p>
        For questions about these Terms, please contact us at{' '}
        <a href="mailto:legal@avnz.io" className="text-brand-600">legal@avnz.io</a>.
      </p>

      <p className="text-sm text-zinc-500 mt-6">
        <a href="/terms" className="text-brand-600 hover:underline">View full Terms of Service</a>
      </p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-zinc-500 text-sm">Effective Date: December 6, 2025</p>

      <p>
        Avanzado Technologies LLC (&quot;avnz.io,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting
        your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
        information when you use our services.
      </p>

      <h3>1. Information We Collect</h3>
      <p><strong>Information You Provide:</strong></p>
      <ul>
        <li>Email address and optional phone number when you sign up</li>
        <li>Founder number, referral code, and position data</li>
        <li>Any information you include in correspondence with us</li>
      </ul>

      <p><strong>Information Collected Automatically:</strong></p>
      <ul>
        <li>IP address, browser type, operating system</li>
        <li>Pages viewed, links clicked, time spent on pages</li>
        <li>General geographic location based on IP address</li>
      </ul>

      <h3>2. How We Use Your Information</h3>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve our Services</li>
        <li>Create and manage your founder account</li>
        <li>Administer the Founders Program and referral system</li>
        <li>Send administrative information, updates, and security alerts</li>
        <li>Detect, investigate, and prevent fraudulent activity</li>
      </ul>

      <h3>3. Information Sharing</h3>
      <p>
        We do not sell your personal information. We may share your information with service providers
        who help us operate our platform, or when required by law.
      </p>

      <h3>4. Data Security</h3>
      <p>
        We implement appropriate technical and organizational security measures to protect your
        personal information, including encryption of data in transit and at rest.
      </p>

      <h3>5. Your Rights</h3>
      <p>Depending on your location, you may have rights to:</p>
      <ul>
        <li>Access and receive a copy of your personal information</li>
        <li>Request correction of inaccurate information</li>
        <li>Request deletion of your personal information</li>
        <li>Opt out of marketing communications</li>
      </ul>

      <h3>6. Cookies</h3>
      <p>
        We use essential cookies to operate the service. You can control cookie settings through
        your browser, though some features may not function properly without cookies.
      </p>

      <h3>7. Children&apos;s Privacy</h3>
      <p>
        Our Services are not intended for children under the age of 13. We do not knowingly collect
        personal information from children.
      </p>

      <h3>8. Changes to This Policy</h3>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes
        by email or prominent notice on our Services.
      </p>

      <h3>9. Contact Us</h3>
      <p>
        For privacy-related questions, contact us at{' '}
        <a href="mailto:privacy@avnz.io" className="text-brand-600">privacy@avnz.io</a>.
      </p>

      <p className="text-sm text-zinc-500 mt-6">
        <a href="/privacy" className="text-brand-600 hover:underline">View full Privacy Policy</a>
      </p>
    </>
  );
}
