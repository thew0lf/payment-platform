export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Billing Portal
        </h1>
        <p className="text-xl text-center text-gray-600 mb-4">
          Continuity based on Chase Hughes' NCI
        </p>
        <p className="text-md text-center text-gray-500 mb-8">
          Non-Verbal Communication Influence / Engineered Reality
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Invoices</h3>
            <p className="text-gray-600">View and manage your invoices</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Payments</h3>
            <p className="text-gray-600">Track payment history and status</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Subscriptions</h3>
            <p className="text-gray-600">Manage billing subscriptions</p>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-2xl font-bold mb-4 text-blue-900">Connected to Payment Platform</h2>
          <p className="text-gray-700">
            This billing portal is integrated with the payment platform for seamless transaction processing.
          </p>
        </div>
      </div>
    </main>
  )
}
