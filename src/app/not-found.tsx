export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you requested does not exist.
        </p>
      </div>
    </main>
  );
}
