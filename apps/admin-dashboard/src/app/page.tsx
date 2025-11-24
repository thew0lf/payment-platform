export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Payment Platform
        </h1>
        <p className="text-xl text-center text-gray-600 mb-8">
          Admin Dashboard
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Organizations</h3>
            <p className="text-gray-600">Manage platform organizations</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Clients</h3>
            <p className="text-gray-600">Manage client accounts</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Analytics</h3>
            <p className="text-gray-600">Platform performance metrics</p>
          </div>
        </div>
      </div>
    </main>
  )
}
