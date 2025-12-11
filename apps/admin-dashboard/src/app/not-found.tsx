export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <h2 className="text-xl text-muted-foreground mb-6">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-foreground rounded-lg transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
