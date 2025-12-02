import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah M.',
    location: 'Seattle, WA',
    rating: 5,
    text: "I've tried many coffee subscriptions, but Coffee Explorer is by far the best. The quality is exceptional and I love discovering new origins every month!",
    avatar: 'S',
  },
  {
    name: 'James R.',
    location: 'Austin, TX',
    rating: 5,
    text: "The Adventurer plan is perfect for me. I get to try a great variety of coffees and the brewing guides have really improved my home barista skills.",
    avatar: 'J',
  },
  {
    name: 'Michelle K.',
    location: 'Portland, OR',
    rating: 5,
    text: 'Finally, a subscription that understands quality coffee. Every bag has been fresh, flavorful, and exciting. The customer service is also fantastic!',
    avatar: 'M',
  },
  {
    name: 'David L.',
    location: 'Denver, CO',
    rating: 5,
    text: 'The Connoisseur plan is worth every penny. The micro-lot coffees are incredible - flavors I never knew coffee could have. Absolutely hooked!',
    avatar: 'D',
  },
];

export function Testimonials() {
  return (
    <section
      id="reviews"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-cream-50 to-coffee-50"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-coffee-950 mb-4">
            What Our Members Say
          </h2>
          <p className="text-lg text-coffee-700 max-w-2xl mx-auto">
            Join thousands of happy coffee lovers who&apos;ve made Coffee
            Explorer part of their morning ritual.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-coffee-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-coffee-200 rounded-full flex items-center justify-center text-coffee-700 font-bold text-lg">
                  {testimonial.avatar}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-coffee-900">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-coffee-500">
                    {testimonial.location}
                  </p>
                </div>
                <Quote className="h-8 w-8 text-coffee-200" />
              </div>

              <div className="flex gap-1 mb-4">
                {Array(testimonial.rating)
                  .fill(0)
                  .map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-amber-400 text-amber-400"
                    />
                  ))}
              </div>

              <p className="text-coffee-700 leading-relaxed">
                &ldquo;{testimonial.text}&rdquo;
              </p>
            </div>
          ))}
        </div>

        {/* Review widget integration placeholder */}
        <div className="mt-12 text-center">
          <div
            id="avnz-reviews"
            data-company="coffee-explorer"
            className="max-w-3xl mx-auto"
          ></div>
        </div>
      </div>
    </section>
  );
}
