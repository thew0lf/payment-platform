import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = {
  title: 'Privacy Policy | avnz.io',
  description: 'Privacy Policy for avnz.io',
};

export default function PrivacyPage() {
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
          <h1>Privacy Policy</h1>
          <p className="lead text-zinc-500">Effective Date: December 6, 2025</p>

          <p>
            Avanzado Technologies LLC (&quot;avnz.io,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting
            your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you visit our website and use our services (collectively, the &quot;Services&quot;).
            Please read this policy carefully. By using our Services, you consent to the practices described herein.
          </p>

          <h2>1. Information We Collect</h2>

          <h3>1.1 Information You Provide</h3>
          <p>We collect information you voluntarily provide when you:</p>
          <ul>
            <li><strong>Create an Account:</strong> Name, email address, phone number (optional), and password</li>
            <li><strong>Join the Founders Program:</strong> Registration details, founder number, and referral information</li>
            <li><strong>Contact Us:</strong> Any information you include in correspondence with us</li>
            <li><strong>Make a Purchase:</strong> Billing address, payment card information (processed by our payment processors), and transaction history</li>
            <li><strong>Participate in Surveys or Promotions:</strong> Responses and any information you choose to provide</li>
          </ul>

          <h3>1.2 Information Collected Automatically</h3>
          <p>When you access our Services, we automatically collect certain information, including:</p>
          <ul>
            <li><strong>Device Information:</strong> IP address, browser type and version, operating system, device identifiers, and mobile network information</li>
            <li><strong>Usage Data:</strong> Pages viewed, links clicked, time spent on pages, referring URL, and navigation patterns</li>
            <li><strong>Location Data:</strong> General geographic location based on IP address</li>
            <li><strong>Cookies and Similar Technologies:</strong> Information collected through cookies, pixel tags, and similar tracking technologies (see Section 6)</li>
          </ul>

          <h3>1.3 Information from Third Parties</h3>
          <p>We may receive information about you from third parties, including:</p>
          <ul>
            <li>Social media platforms if you choose to link your account</li>
            <li>Business partners and service providers</li>
            <li>Publicly available sources</li>
            <li>Other users who refer you to our Services</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect for various purposes, including to:</p>
          <ul>
            <li>Provide, maintain, and improve our Services</li>
            <li>Process transactions and send related information</li>
            <li>Create and manage your account</li>
            <li>Administer the Founders Program and referral system</li>
            <li>Send administrative information, updates, and security alerts</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Send promotional communications (with your consent where required)</li>
            <li>Monitor and analyze trends, usage, and activities</li>
            <li>Detect, investigate, and prevent fraudulent transactions and abuse</li>
            <li>Personalize and improve your experience</li>
            <li>Comply with legal obligations and enforce our terms</li>
          </ul>

          <h2>3. How We Share Your Information</h2>
          <p>We do not sell your personal information. We may share your information in the following circumstances:</p>

          <h3>3.1 Service Providers</h3>
          <p>
            We share information with third-party vendors, consultants, and service providers who perform
            services on our behalf, such as hosting, analytics, payment processing, email delivery, and
            customer support. These providers are contractually obligated to protect your information and
            use it only for the purposes for which it was disclosed.
          </p>

          <h3>3.2 Business Transfers</h3>
          <p>
            If we are involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale
            of assets, your information may be transferred as part of that transaction. We will notify
            you of any change in ownership or uses of your personal information.
          </p>

          <h3>3.3 Legal Requirements</h3>
          <p>We may disclose your information if required to do so by law or in response to:</p>
          <ul>
            <li>Subpoenas, court orders, or other legal processes</li>
            <li>Requests from law enforcement or government agencies</li>
            <li>To protect our rights, privacy, safety, or property</li>
            <li>To enforce our Terms of Service or other agreements</li>
            <li>To investigate potential violations or fraud</li>
          </ul>

          <h3>3.4 With Your Consent</h3>
          <p>We may share your information with third parties when you have given us your explicit consent to do so.</p>

          <h3>3.5 Aggregated or De-identified Data</h3>
          <p>
            We may share aggregated or de-identified information that cannot reasonably be used to identify
            you for research, marketing, analytics, and other purposes.
          </p>

          <h2>4. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to fulfill the purposes for which
            it was collected, including to satisfy legal, accounting, or reporting requirements. The retention
            period may vary depending on the context of our relationship with you and our legal obligations.
          </p>
          <p>When determining retention periods, we consider:</p>
          <ul>
            <li>The nature and sensitivity of the information</li>
            <li>The purposes for which we process the information</li>
            <li>Applicable legal requirements</li>
            <li>Whether the purpose can be achieved through other means</li>
          </ul>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures designed to protect
            your personal information from unauthorized access, alteration, disclosure, or destruction.
            These measures include:
          </p>
          <ul>
            <li>Encryption of data in transit using TLS/SSL</li>
            <li>Encryption of sensitive data at rest using AES-256</li>
            <li>Regular security assessments and penetration testing</li>
            <li>Access controls and authentication requirements</li>
            <li>Employee training on data protection practices</li>
            <li>Incident response procedures</li>
          </ul>
          <p>
            However, no method of transmission over the Internet or electronic storage is 100% secure.
            While we strive to protect your information, we cannot guarantee its absolute security.
          </p>

          <h2>6. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to collect information about your browsing
            activities and to distinguish you from other users. This helps us provide you with a better
            experience and allows us to improve our Services.
          </p>

          <h3>Types of Cookies We Use:</h3>
          <ul>
            <li><strong>Essential Cookies:</strong> Required for the operation of our Services. They enable core functionality such as security, network management, and account access.</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our Services by collecting information about pages visited, time spent, and errors encountered.</li>
            <li><strong>Functional Cookies:</strong> Enable enhanced functionality and personalization, such as remembering your preferences and settings.</li>
            <li><strong>Marketing Cookies:</strong> Used to track visitors across websites to display relevant advertisements (only with your consent where required).</li>
          </ul>

          <h3>Your Cookie Choices:</h3>
          <p>
            Most web browsers allow you to control cookies through their settings. You can set your browser
            to refuse cookies or alert you when cookies are being sent. However, some features of our Services
            may not function properly without cookies.
          </p>

          <h2>7. Your Rights and Choices</h2>
          <p>Depending on your location, you may have certain rights regarding your personal information:</p>

          <h3>7.1 Access and Portability</h3>
          <p>You may request access to the personal information we hold about you and receive a copy in a portable format.</p>

          <h3>7.2 Correction</h3>
          <p>You may request that we correct inaccurate or incomplete personal information.</p>

          <h3>7.3 Deletion</h3>
          <p>
            You may request that we delete your personal information, subject to certain exceptions
            (such as compliance with legal obligations).
          </p>

          <h3>7.4 Restriction and Objection</h3>
          <p>You may request that we restrict processing of your information or object to certain processing activities.</p>

          <h3>7.5 Withdrawal of Consent</h3>
          <p>Where we rely on consent to process your information, you may withdraw that consent at any time.</p>

          <h3>7.6 Marketing Communications</h3>
          <p>
            You may opt out of receiving promotional emails by clicking the &quot;unsubscribe&quot; link in any
            marketing email or by contacting us. Note that you may still receive transactional or
            administrative communications.
          </p>

          <p>
            To exercise any of these rights, please contact us at <a href="mailto:privacy@avnz.io">privacy@avnz.io</a>.
            We will respond to your request within the timeframe required by applicable law.
          </p>

          <h2>8. International Data Transfers</h2>
          <p>
            Your information may be transferred to, stored, and processed in countries other than your
            country of residence, including the United States. These countries may have data protection
            laws that differ from those in your country.
          </p>
          <p>
            When we transfer personal information internationally, we implement appropriate safeguards
            to ensure your information remains protected, including standard contractual clauses approved
            by relevant authorities and other legally recognized transfer mechanisms.
          </p>

          <h2>9. Children&apos;s Privacy</h2>
          <p>
            Our Services are not intended for children under the age of 13 (or 16 in certain jurisdictions).
            We do not knowingly collect personal information from children. If we become aware that we have
            collected personal information from a child without parental consent, we will take steps to
            delete that information. If you believe we have collected information from a child, please
            contact us immediately.
          </p>

          <h2>10. California Privacy Rights</h2>
          <p>
            If you are a California resident, you have additional rights under the California Consumer
            Privacy Act (CCPA) and California Privacy Rights Act (CPRA), including:
          </p>
          <ul>
            <li>The right to know what personal information we collect, use, and disclose</li>
            <li>The right to request deletion of your personal information</li>
            <li>The right to opt out of the &quot;sale&quot; or &quot;sharing&quot; of personal information</li>
            <li>The right to non-discrimination for exercising your privacy rights</li>
            <li>The right to correct inaccurate personal information</li>
            <li>The right to limit the use of sensitive personal information</li>
          </ul>
          <p>
            We do not sell personal information as defined under California law. To exercise your California
            privacy rights, contact us at <a href="mailto:privacy@avnz.io">privacy@avnz.io</a>.
          </p>

          <h2>11. European Privacy Rights (GDPR)</h2>
          <p>
            If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you
            have rights under the General Data Protection Regulation (GDPR), including the rights described
            in Section 7 above.
          </p>
          <p>Our legal bases for processing your information include:</p>
          <ul>
            <li><strong>Contract:</strong> Processing necessary to perform our contract with you</li>
            <li><strong>Legitimate Interests:</strong> Processing necessary for our legitimate business interests</li>
            <li><strong>Consent:</strong> Processing based on your consent, which you may withdraw</li>
            <li><strong>Legal Obligation:</strong> Processing necessary to comply with legal requirements</li>
          </ul>
          <p>
            You have the right to lodge a complaint with a supervisory authority if you believe our
            processing of your personal information violates applicable law.
          </p>

          <h2>12. Third-Party Links</h2>
          <p>
            Our Services may contain links to third-party websites, applications, or services. This Privacy
            Policy does not apply to those third parties. We encourage you to review the privacy policies
            of any third-party services you access.
          </p>

          <h2>13. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or
            applicable law. When we make material changes, we will notify you by updating the &quot;Effective
            Date&quot; at the top of this policy and, where appropriate, by email or prominent notice on our
            Services. We encourage you to review this policy periodically.
          </p>

          <h2>14. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data
            practices, please contact us at:
          </p>
          <p>
            <strong>Avanzado Technologies LLC</strong><br />
            Email: <a href="mailto:privacy@avnz.io">privacy@avnz.io</a><br />
            For general inquiries: <a href="mailto:hello@avnz.io">hello@avnz.io</a>
          </p>
          <p>
            For data protection inquiries in the EU, you may also contact our designated representative
            at the address above.
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
