export default function WeatherSkeleton() {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-20 bg-gray-800 rounded" />
        <div className="h-4 w-28 bg-gray-800 rounded" />
      </div>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-gray-800 rounded-full" />
        <div className="space-y-2">
          <div className="h-10 w-24 bg-gray-800 rounded" />
          <div className="h-4 w-32 bg-gray-800 rounded" />
        </div>
        <div className="ml-auto space-y-2">
          <div className="h-4 w-28 bg-gray-800 rounded" />
          <div className="h-4 w-24 bg-gray-800 rounded" />
          <div className="h-4 w-20 bg-gray-800 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 pt-4 border-t border-gray-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-3 w-8 bg-gray-800 rounded" />
            <div className="w-8 h-8 bg-gray-800 rounded-full" />
            <div className="h-3 w-6 bg-gray-800 rounded" />
            <div className="h-3 w-6 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
