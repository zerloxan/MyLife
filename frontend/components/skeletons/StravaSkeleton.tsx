export default function StravaSkeleton() {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 animate-pulse">
      <div className="h-5 w-16 bg-gray-800 rounded mb-4" />
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-3 flex flex-col items-center gap-2">
            <div className="h-6 w-12 bg-gray-700 rounded" />
            <div className="h-3 w-16 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
      <div className="h-3 w-16 bg-gray-800 rounded mb-2" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-start justify-between py-2 border-b border-gray-800">
          <div className="space-y-1">
            <div className="h-4 w-32 bg-gray-800 rounded" />
            <div className="h-3 w-24 bg-gray-800 rounded" />
          </div>
          <div className="space-y-1 text-right">
            <div className="h-4 w-16 bg-gray-800 rounded" />
            <div className="h-3 w-12 bg-gray-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
