import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = {
  title: 'Terms of Service | avnz.io',
  description: 'Terms of Service for avnz.io',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-xl text-zinc-900 dark:text-white">
              avnz<span className="text-brand-600">.io</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto prose dark:prose-invert prose-zinc">
          <h1>Terms of Service</h1>
          <p className="lead text-zinc-500">Effective Date: December 6, 2025</p>

          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the website,
            products, and services (collectively, the &quot;Services&quot;) provided by Avanzado Technologies LLC
            (&quot;avnz.io,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using our Services, you agree
            to be bound by these Terms. If you do not agree, do not use the Services.
          </p>

          <h2>1. Eligibility</h2>
          <p>
            You must be at least 18 years old and have the legal capacity to enter into a binding
            agreement to use our Services. By using the Services, you represent and warrant that you
            meet these requirements. If you are using the Services on behalf of an organization, you
            represent that you have the authority to bind that organization to these Terms.
          </p>

          <h2>2. Account Registration</h2>
          <p>
            To access certain features of our Services, you may be required to create an account.
            You agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information</li>
            <li>Keep your login credentials confidential and secure</li>
            <li>Accept responsibility for all activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized access or use of your account</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that contain inaccurate information
            or violate these Terms.
          </p>

          <h2>3. Founders Program</h2>
          <p>
            The avnz.io Founders Program is a limited early access initiative. Participation is subject
            to the following conditions:
          </p>
          <ul>
            <li>Founder numbers and positions are assigned based on registration order and referral activity</li>
            <li>Benefits associated with founder status are provided at our sole discretion and may be modified, suspended, or terminated at any time</li>
            <li>The referral program is subject to anti-fraud measures; we reserve the right to disqualify referrals and adjust positions if abuse is detected</li>
            <li>Creating multiple accounts, using automated systems, or engaging in fraudulent referral activity will result in immediate disqualification</li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to use the Services to:</p>
          <ul>
            <li>Violate any applicable law, regulation, or third-party rights</li>
            <li>Transmit any malicious code, viruses, or harmful software</li>
            <li>Interfere with or disrupt the integrity or performance of the Services</li>
            <li>Attempt to gain unauthorized access to any systems or networks</li>
            <li>Engage in any activity that could damage, disable, or impair the Services</li>
            <li>Use the Services for any fraudulent or deceptive purpose</li>
            <li>Harvest or collect information about other users without consent</li>
            <li>Impersonate any person or entity or misrepresent your affiliation</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            All content, features, functionality, software, and materials available through the Services,
            including but not limited to text, graphics, logos, icons, images, audio, video, and data
            compilations, are owned by avnz.io or its licensors and are protected by United States and
            international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>
          <p>
            You are granted a limited, non-exclusive, non-transferable, revocable license to access and
            use the Services for their intended purpose. This license does not include the right to:
          </p>
          <ul>
            <li>Modify, copy, or create derivative works of the Services</li>
            <li>Reverse engineer, decompile, or disassemble any software</li>
            <li>Remove any copyright, trademark, or proprietary notices</li>
            <li>Use any data mining, robots, or similar data gathering methods</li>
            <li>Sublicense, sell, or transfer your rights under this license</li>
          </ul>

          <h2>6. User Content</h2>
          <p>
            You retain ownership of any content you submit, post, or display through the Services
            (&quot;User Content&quot;). By submitting User Content, you grant us a worldwide, non-exclusive,
            royalty-free license to use, reproduce, modify, adapt, publish, and display such content
            in connection with operating and improving the Services.
          </p>
          <p>
            You represent and warrant that you own or have the necessary rights to submit User Content
            and that such content does not violate any third-party rights or applicable laws.
          </p>

          <h2>7. Third-Party Services</h2>
          <p>
            The Services may contain links to or integrate with third-party websites, applications, or
            services. We do not control and are not responsible for the content, privacy policies, or
            practices of any third-party services. Your use of third-party services is at your own risk
            and subject to their respective terms.
          </p>

          <h2>8. Payment Terms</h2>
          <p>
            If you purchase any paid Services, you agree to pay all applicable fees as described at the
            time of purchase. All payments are non-refundable unless otherwise specified or required by
            law. We reserve the right to change our pricing at any time, with notice provided to existing
            customers before any price increase takes effect.
          </p>

          <h2>9. Disclaimer of Warranties</h2>
          <p>
            THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
            SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL
            COMPONENTS.
          </p>
          <p>
            SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES, SO SOME OF THE ABOVE
            EXCLUSIONS MAY NOT APPLY TO YOU.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL AVNZ.IO, ITS OFFICERS, DIRECTORS,
            EMPLOYEES, AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE,
            GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
          </p>
          <ul>
            <li>Your access to or use of (or inability to access or use) the Services</li>
            <li>Any conduct or content of any third party on the Services</li>
            <li>Any content obtained from the Services</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content</li>
          </ul>
          <p>
            IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE GREATER OF ONE HUNDRED DOLLARS ($100) OR
            THE AMOUNT YOU PAID US, IF ANY, IN THE PAST SIX MONTHS FOR THE SERVICES GIVING RISE TO THE CLAIM.
          </p>

          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless avnz.io and its officers, directors,
            employees, agents, and affiliates from and against any and all claims, damages, losses,
            costs, and expenses (including reasonable attorneys&apos; fees) arising from or related to:
          </p>
          <ul>
            <li>Your use of the Services</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another party</li>
            <li>Your User Content</li>
          </ul>

          <h2>12. Termination</h2>
          <p>
            We may suspend or terminate your access to the Services at any time, with or without cause
            or notice, including for violation of these Terms. Upon termination, your right to use the
            Services will immediately cease. All provisions of these Terms that by their nature should
            survive termination shall survive, including ownership provisions, warranty disclaimers,
            indemnification, and limitations of liability.
          </p>

          <h2>13. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of
            Delaware, United States, without regard to its conflict of law principles. Any dispute arising
            from or relating to these Terms or the Services shall be resolved exclusively in the state or
            federal courts located in Delaware, and you consent to the personal jurisdiction of such courts.
          </p>

          <h2>14. Arbitration Agreement</h2>
          <p>
            PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO
            FILE A LAWSUIT IN COURT.
          </p>
          <p>
            You and avnz.io agree that any dispute, claim, or controversy arising out of or relating to
            these Terms or the Services shall be resolved through binding arbitration, rather than in court,
            except that either party may seek injunctive or other equitable relief in court for infringement
            or misappropriation of intellectual property rights.
          </p>
          <p>
            YOU AND AVNZ.IO AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS
            INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR
            REPRESENTATIVE PROCEEDING.
          </p>

          <h2>15. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. If we make material changes, we will
            notify you by email or by posting a notice on our website prior to the changes taking effect.
            Your continued use of the Services after the effective date of any changes constitutes your
            acceptance of the modified Terms.
          </p>

          <h2>16. Severability</h2>
          <p>
            If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining
            provisions shall continue in full force and effect. The invalid provision shall be modified to
            the minimum extent necessary to make it valid and enforceable while preserving its intent.
          </p>

          <h2>17. Entire Agreement</h2>
          <p>
            These Terms, together with our Privacy Policy and any other agreements expressly incorporated
            by reference, constitute the entire agreement between you and avnz.io regarding the Services
            and supersede all prior agreements and understandings.
          </p>

          <h2>18. Waiver</h2>
          <p>
            Our failure to enforce any right or provision of these Terms shall not be deemed a waiver of
            such right or provision. Any waiver must be in writing and signed by an authorized representative
            of avnz.io.
          </p>

          <h2>19. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p>
            <strong>Avanzado Technologies LLC</strong><br />
            Email: <a href="mailto:legal@avnz.io">legal@avnz.io</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            &copy; {new Date().getFullYear()} avnz.io. All rights reserved.
          </span>
          <div className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/privacy" className="hover:text-brand-600 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-brand-600 transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-brand-600 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
