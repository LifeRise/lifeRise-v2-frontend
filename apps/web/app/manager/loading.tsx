export default function ManagerLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-purple-accent border-t-transparent animate-spin" />
        <p className="text-sm text-muted">Loading manager portal...</p>
      </div>
    </div>
  );
}
