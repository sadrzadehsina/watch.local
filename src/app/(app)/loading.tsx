export default function AppLoading() {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-md bg-secondary" />
        <div className="h-4 w-72 max-w-full rounded-md bg-secondary" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-lg border bg-card">
            <div className="aspect-video bg-secondary" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-full rounded bg-secondary" />
              <div className="h-4 w-2/3 rounded bg-secondary" />
              <div className="h-8 w-20 rounded bg-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
