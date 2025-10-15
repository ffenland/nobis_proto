export default function SkeletonLoader() {
  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto">
      <div className="skeleton h-8 w-48"></div>
      <div className="skeleton h-4 w-full"></div>
      <div className="skeleton h-4 w-full"></div>
      <div className="skeleton h-4 w-3/4"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="skeleton h-32"></div>
        <div className="skeleton h-32"></div>
      </div>

      <div className="skeleton h-64 w-full mt-4"></div>
    </div>
  );
}
