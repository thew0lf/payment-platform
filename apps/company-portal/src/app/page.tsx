export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Company Portal
        </h1>
        <p className="text-xl text-center text-gray-600 mb-8">
          Manage your subscriptions and payments
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Subscriptions</h3>
            <p className="text-gray-600">View and manage your active subscriptions</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Orders</h3>
            <p className="text-gray-600">Track your orders and shipping</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Billing</h3>
            <p className="text-gray-600">Manage payment methods and invoices</p>
          </div>
        </div>
      </div>
    </main>
  )
}
