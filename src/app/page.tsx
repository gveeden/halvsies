import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-emerald-500 selection:text-white">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-500/30">
            H
          </div>
          <span className="text-xl font-bold tracking-tight">Halvsies</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 rounded-full transition-all backdrop-blur-md"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 pb-20 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          The smartest way to split bills
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1]">
          Split expenses, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
            keep friendships.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          Track shared expenses, simplify debts automatically, and settle up with ease. Perfect for roommates, trips, and groups.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
          >
            Start Splitting Now
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link
            href="#features"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-lg transition-all backdrop-blur-md flex items-center justify-center"
          >
            See how it works
          </Link>
        </div>
        
        {/* Mockup Preview */}
        <div className="mt-24 relative w-full max-w-4xl perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
          <div className="rounded-2xl border border-white/10 bg-slate-800/50 backdrop-blur-xl p-4 shadow-2xl transform rotate-x-12 scale-95 origin-bottom">
            <div className="rounded-xl border border-white/5 bg-slate-900 p-6 shadow-inner flex flex-col gap-4">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="font-semibold text-lg">Dinner at Luigi's</h3>
                  <p className="text-sm text-slate-400">Paid by You</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl text-emerald-400">$124.50</div>
                  <p className="text-sm text-slate-400">Total Bill</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Alice", share: "$41.50", owed: true },
                  { name: "Bob", share: "$41.50", owed: true },
                  { name: "You", share: "$41.50", owed: false },
                ].map((person, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                        {person.name[0]}
                      </div>
                      <span className="font-medium">{person.name}</span>
                    </div>
                    <div className={`font-semibold ${person.owed ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {person.share}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
