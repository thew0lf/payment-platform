import { Coffee, Settings, Package, Smile } from 'lucide-react';

const steps = [
  {
    icon: Settings,
    step: '1',
    title: 'Choose Your Preferences',
    description:
      "Tell us about your coffee taste - roast level, flavor notes, and brewing method. We'll use this to curate your perfect selection.",
  },
  {
    icon: Coffee,
    step: '2',
    title: 'We Curate Your Box',
    description:
      'Our expert roasters handpick beans that match your profile from our global network of specialty farms.',
  },
  {
    icon: Package,
    step: '3',
    title: 'Fresh Delivery',
    description:
      "Your coffee is roasted to order and shipped within 24 hours. It arrives fresh at your door, ready to brew.",
  },
  {
    icon: Smile,
    step: '4',
    title: 'Enjoy & Discover',
    description:
      'Brew, taste, and discover new favorites. Rate your coffees to help us refine your recommendations.',
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-coffee-50 to-cream-50"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-coffee-950 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-coffee-700 max-w-2xl mx-auto">
            Getting started with Coffee Explorer is simple. Here&apos;s how we
            bring exceptional coffee to your cup.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-full h-0.5 bg-coffee-200" />
              )}

              <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-coffee-100 hover:shadow-md transition-shadow">
                {/* Step number badge */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-coffee-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {item.step}
                </div>

                <div className="w-16 h-16 bg-coffee-100 rounded-2xl flex items-center justify-center mb-4">
                  <item.icon className="h-8 w-8 text-coffee-600" />
                </div>

                <h3 className="text-lg font-semibold text-coffee-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-coffee-600 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
