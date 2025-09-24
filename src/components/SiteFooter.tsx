export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-900/50 backdrop-blur mt-16">
      <div className="mx-auto max-w-8xl px-6 py-6">
        <div className="text-center">
          <p className="text-sm text-slate-400">
            Learn more at{' '}
            <a
              href="https://ample.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-200 hover:text-orange-400 transition-colors underline decoration-slate-600 hover:decoration-orange-400 underline-offset-2"
            >
              ample.co
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}