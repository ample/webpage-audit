import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
      <div className="mx-auto max-w-4xl px-6 py-4">
        <Link href="/" className="inline-flex items-center space-x-2 text-xl font-bold text-slate-100 hover:text-sky-400 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500">
            <span className="text-sm font-bold text-white">SA</span>
          </div>
          <span>Site Audit</span>
        </Link>
      </div>
    </header>
  );
}
