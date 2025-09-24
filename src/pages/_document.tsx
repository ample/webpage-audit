import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary Meta Tags */}
        <meta name="title" content="Free Webpage Audit by Ample - AI-Powered Website Performance Analysis" />
        <meta name="description" content="Get instant website performance insights with AI-powered recommendations. Free tool by Ample powered by WebPageTest and Claude AI to boost conversions and search rankings." />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://audit.ample.co/" />
        <meta property="og:title" content="Free Webpage Audit by Ample - AI-Powered Website Performance Analysis" />
        <meta property="og:description" content="Get instant website performance insights with AI-powered recommendations. Free tool by Ample powered by WebPageTest and Claude AI to boost conversions and search rankings." />
        <meta property="og:image" content="/og.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Free Webpage Audit by Ample" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://audit.ample.co/" />
        <meta property="twitter:title" content="Free Webpage Audit by Ample - AI-Powered Website Performance Analysis" />
        <meta property="twitter:description" content="Get instant website performance insights with AI-powered recommendations. Free tool by Ample powered by WebPageTest and Claude AI to boost conversions and search rankings." />
        <meta property="twitter:image" content="/og.jpg" />

        {/* Additional Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="author" content="Ample" />
        <meta name="theme-color" content="#0F172A" />
        <link rel="canonical" href="https://audit.ample.co/" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
