# Lightning Load ⚡

Make your website lightning fast with comprehensive performance analysis and AI-powered optimization recommendations.

## Features

- **Lightning-Fast Analysis**: Quick WebPageTest performance audits
- **AI-Powered Insights**: Get intelligent recommendations powered by Claude AI
- **Real-Time Progress**: Live timer and status updates during testing
- **Comprehensive Metrics**: Detailed performance metrics and Core Web Vitals
- **Smart Recommendations**: Choose between rule-based or AI-generated suggestions
- **Modern UI**: Clean, responsive interface with smooth animations

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works

1. **Enter a URL** - Input any website URL you want to optimize
2. **Choose Analysis Type** - Toggle between rule-based or AI-powered recommendations
3. **Run the Test** - Lightning Load analyzes your site's performance bottlenecks
4. **Get Optimization Tips** - Receive actionable recommendations to make your site lightning fast

## Environment Variables

Create a `.env.local` file with:

```bash
WPT_API_KEY=your_webpagetest_api_key
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_MODEL=claude-3-5-sonnet-20240620
```

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **WebPageTest API** - Performance testing
- **Claude AI** - Intelligent recommendations
- **Jest** - Testing framework

## API Routes

- `/api/run-test` - Start a new WebPageTest
- `/api/check-status` - Check test progress and results
- `/api/ai-insights` - Generate AI-powered recommendations

## Testing

Run the test suite:

```bash
npm test
# or
yarn test
```

## Deploy on Vercel

The easiest way to deploy Lightning Load is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

## License

MIT License - see LICENSE file for details.
