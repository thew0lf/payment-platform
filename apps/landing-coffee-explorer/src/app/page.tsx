import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { HowItWorks } from '@/components/how-it-works';
import { SubscriptionPlans } from '@/components/subscription-plans';
import { Testimonials } from '@/components/testimonials';
import { FAQ } from '@/components/faq';
import { CTA } from '@/components/cta';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <SubscriptionPlans />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
