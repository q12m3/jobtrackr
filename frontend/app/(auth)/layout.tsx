export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Job<span className="text-indigo-400">Trackr</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">Job market analytics for developers</p>
        </div>
        {children}
      </div>
    </div>
  )
}
