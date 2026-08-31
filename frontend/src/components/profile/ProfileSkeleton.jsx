export default function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 lg:gap-10 animate-pulse">
      <aside className="space-y-4 flex flex-col items-center lg:items-start">
        <div className="w-64 max-w-full aspect-square rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-7 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-16 w-full bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-9 w-full bg-gray-200 dark:bg-gray-800 rounded-md" />
      </aside>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    </div>
  );
}
