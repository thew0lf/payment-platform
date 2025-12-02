import { Globe, Leaf, Award, Truck, Heart, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Globe,
    title: 'Global Sourcing',
    description:
      'We partner with ethical farms in over 30 countries to bring you the finest beans from around the world.',
  },
  {
    icon: Leaf,
    title: 'Sustainably Grown',
    description:
      'All our coffee is sustainably and ethically sourced, supporting farmers and the environment.',
  },
  {
    icon: Award,
    title: 'Expert Roasting',
    description:
      'Our master roasters craft each batch to bring out unique flavor profiles and optimal freshness.',
  },
  {
    icon: Truck,
    title: 'Fast & Free Delivery',
    description:
      'Enjoy free shipping on all subscription orders, delivered right to your doorstep.',
  },
  {
    icon: Heart,
    title: 'Personalized Selection',
    description:
      'Tell us your preferences and we curate the perfect coffee selections just for you.',
  },
  {
    icon: Sparkles,
    title: 'Freshness Guaranteed',
    description:
      'Every bag is roasted to order and shipped within 24 hours for peak flavor.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-coffee-950 mb-4">
            Why Choose Coffee Explorer?
          </h2>
          <p className="text-lg text-coffee-700 max-w-2xl mx-auto">
            We&apos;re passionate about connecting coffee lovers with
            exceptional beans from around the world.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-cream-50 hover:bg-coffee-50 border border-coffee-100 hover:border-coffee-200 transition-all duration-300 hover:shadow-lg"
            >
              <div className="w-14 h-14 bg-coffee-100 group-hover:bg-coffee-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
                <feature.icon className="h-7 w-7 text-coffee-600" />
              </div>
              <h3 className="text-xl font-semibold text-coffee-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-coffee-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
