export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-200 mb-4">404</h1>
        <h2 className="text-xl text-zinc-400 mb-6">Page Not Found</h2>
        <p className="text-zinc-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
