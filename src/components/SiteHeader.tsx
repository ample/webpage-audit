import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
      <div className="mx-auto max-w-8xl px-6 py-4">
        <Link href="/" className="inline-flex items-center space-x-2 text-xl font-bold text-slate-100 hover:text-yellow-400 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </div>
          <span>Webpage Audit</span>
        </Link>
      </div>
    </header>
  );
}
