import type { AppProps } from 'next/app';
import '@/styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 antialiased">
      <Component {...pageProps} />
    </div>
  );
}
