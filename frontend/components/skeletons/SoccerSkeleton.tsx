export default function SoccerSkeleton() {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 animate-pulse">
      <div className="h-5 w-16 bg-gray-800 rounded mb-4" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="mb-4">
          <div className="h-3 w-28 bg-gray-800 rounded mb-2" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex items-center justify-between py-2 border-b border-gray-800">
              <div className="h-4 w-24 bg-gray-800 rounded" />
              <div className="h-4 w-20 bg-gray-800 rounded" />
              <div className="h-4 w-24 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
