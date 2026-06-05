export default function RootLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-midnight">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-teal border-t-transparent animate-spin" />
        <p className="text-sm text-muted">Loading LifeRise...</p>
      </div>
    </div>
  );
}
