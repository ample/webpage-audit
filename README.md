# Lightning Load ⚡

Make your website lightning fast with comprehensive performance analysis, AI-powered optimization recommendations, and accessibility auditing.

## Features

- **Lightning-Fast Analysis**: Quick WebPageTest performance audits
- **AI-Powered Insights**: Get intelligent recommendations powered by Claude AI
- **Accessibility Auditing**: Comprehensive a11y scanning using axe-core via MCP server
- **Smart Caching**: Efficient server-side caching with TTL and in-flight request coalescing
- **Real-Time Progress**: Live timer and status updates during testing
- **Comprehensive Metrics**: Detailed performance metrics and Core Web Vitals
- **Smart Recommendations**: Choose between rule-based or AI-generated suggestions
- **PDF Export**: Generate professional PDF reports with all performance and accessibility data

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
4. **Get Performance Insights** - Receive actionable recommendations to make your site lightning fast
5. **Review Accessibility** - Get detailed accessibility audit results with violation details

## Environment Variables

Create a `.env.local` file with:

```bash
WPT_API_KEY=your_webpagetest_api_key
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_MODEL=claude-3-5-sonnet-20240620
CACHE_TTL_SECONDS=604800  # Optional: Cache TTL in seconds (default: 7 days)
```

## Tech Stack

- **Next.js 14** - React framework with Pages Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **WebPageTest API** - Performance testing
- **Claude AI** - Intelligent recommendations
- **MCP (Model Context Protocol)** - Accessibility testing via a11y-mcp-server
- **Jest** - Testing framework

## API Routes

- `/api/run-test` - Start a new WebPageTest
- `/api/check-status` - Check test progress and results
- `/api/ai-insights` - Generate AI-powered recommendations
- `/api/a11y-scan` - Run accessibility audit using MCP server

## Accessibility Features

Lightning Load includes comprehensive accessibility auditing powered by the Model Context Protocol (MCP):

- **Axe-core Integration**: Uses the industry-standard axe-core accessibility testing engine
- **MCP Server**: Leverages the `a11y-mcp-server` for reliable accessibility scanning
- **Detailed Reports**: Shows violation counts, impact levels, and specific issue details
- **Smart Caching**: Accessibility results are cached for improved performance
- **Visual Interface**: Clean, organized display of accessibility findings with expandable details

The accessibility panel displays:
- Total violations, passes, incomplete tests, and inapplicable rules
- Top 5 most critical issues sorted by impact level
- Detailed violation information including help text and remediation links
- Code snippets showing problematic HTML elements

## Caching System

Lightning Load implements an efficient server-side caching system:

- **In-Memory Cache**: Fast, per-process TTL-based caching
- **Request Coalescing**: Prevents duplicate requests for the same resource
- **Configurable TTL**: Default 7-day cache with environment variable override
- **Smart Invalidation**: Automatic cleanup of expired entries
- **Performance Optimized**: Reduces API calls and improves response times

The caching system is used for:
- WebPageTest results
- AI-generated insights
- Accessibility scan results

## Testing

Run the test suite:

```bash
npm test
# or
yarn test
```

For watch mode during development:

```bash
npm run test:watch
# or
yarn test:watch
```

## Dependencies

### Core Dependencies
- `@modelcontextprotocol/sdk` - MCP client for accessibility testing
- `@upstash/redis` - Redis client for potential future caching enhancements
- `axios` - HTTP client for API requests
- `next` - React framework
- `react` & `react-dom` - React library

### Development Dependencies
- Full TypeScript support with `@types/*` packages
- ESLint configuration for code quality
- Jest testing framework with React Testing Library
- Tailwind CSS for styling

## Deploy on Vercel

The easiest way to deploy Lightning Load is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Make sure to set your environment variables in the Vercel dashboard:
- `WPT_API_KEY`
- `CLAUDE_API_KEY`
- `CLAUDE_MODEL`
- `CACHE_TTL_SECONDS` (optional)

Check out the [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

## Under the Hood

When you run an audit test, Lightning Load orchestrates multiple services to provide comprehensive analysis:

### 1. Performance Testing Flow
1. **Test Initiation**: User submits a URL via `/api/run-test`
2. **WebPageTest API**: Creates a new test job on WebPageTest's infrastructure
3. **Polling Loop**: Client polls `/api/check-status` every 2-6 seconds to track progress
4. **Test Execution**: WebPageTest runs the actual performance test on real browsers
5. **Results Processing**: Raw WebPageTest data is normalized and cached

### 2. Parallel Analysis Services
Once performance data is available, Lightning Load triggers parallel analysis:

**AI-Powered Insights** (Optional - when `?ai=true`):
- Sends performance metrics to Claude AI via `/api/ai-insights`
- AI analyzes Core Web Vitals, network waterfall, and resource loading
- Generates contextual optimization recommendations
- Results cached locally in browser for 7 days

**Accessibility Scanning** (Always runs):
- Spawns MCP server process (`npx -y a11y-mcp-server`) via `/api/a11y-scan`
- MCP server uses axe-core to scan the target URL
- Returns detailed accessibility violations with impact levels
- Results cached server-side for 7 days (configurable)

### 3. Service Independence
- **WebPageTest**: Completely independent - handles performance testing
- **MCP Server**: Independent process - handles accessibility via axe-core
- **Claude AI**: Independent service - analyzes performance data for insights
- **Caching Layer**: Unifies all services with consistent TTL and request coalescing

### 4. Data Flow Timeline
```
User submits URL
    ↓
WebPageTest starts (2-60 seconds)
    ↓
Performance data ready
    ↓
┌─────────────────┬─────────────────┐
│   AI Analysis   │  A11y Scanning  │
│   (if enabled)  │   (always runs) │
│   Claude API    │   MCP Server    │
└─────────────────┴─────────────────┘
    ↓
Complete results displayed
```

The beauty of this architecture is that each service operates independently - if one fails, others continue working. The caching layer ensures fast subsequent loads and reduces API costs.

## Architecture

Lightning Load follows a modern Next.js architecture:

- **Pages Router**: Traditional Next.js routing with API routes
- **Server-Side Rendering**: Dynamic pages with `getServerSideProps`
- **Custom Hooks**: `useAudit` hook manages test state and data fetching
- **Component Architecture**: Modular React components with TypeScript
- **API Layer**: RESTful API routes for WebPageTest, AI insights, and accessibility
- **Caching Layer**: Server-side caching with automatic cleanup
- **MCP Integration**: External process communication for accessibility testing

## License

MIT License - see LICENSE file for details.
