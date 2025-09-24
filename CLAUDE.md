# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Lightning Load - Web Performance Audit Tool

Lightning Load is a Next.js application that provides comprehensive web performance analysis using WebPageTest API, AI-powered optimization recommendations via Claude AI, and accessibility auditing through MCP (Model Context Protocol) servers.

## Key Architecture

- **Next.js 14** with Pages Router (not App Router)
- **Core Hook**: `useAudit` manages test lifecycle, polling, and parallel AI/A11y fetching
- **API Routes**: `/api/run-test`, `/api/check-status`, `/api/ai-insights`, `/api/a11y-scan`
- **MCP Integration**: Spawns `a11y-mcp-server` process for accessibility testing
- **Caching**: Server-side TTL cache with request coalescing (`src/lib/server/cache.ts`)
- **Path Aliases**: Uses `@/`, `@components/`, `@lib/` for imports

## 🚨 PROJECT QUALITY STANDARDS

**Build must succeed and code must be clean!**
This is a TypeScript/Next.js project. Always run `npm run build` after changes.
Fix any TypeScript compilation errors before continuing.

**Commands:**
- `npm run build` - Build for production (TypeScript compilation check)
- `npm run dev` - Development server with Turbo
- `npm run lint` - ESLint checking
- `npm run test` - Jest tests
- `npm run test:watch` - Jest in watch mode

## CRITICAL WORKFLOW - ALWAYS FOLLOW THIS!

### Research → Plan → Implement

**NEVER JUMP STRAIGHT TO CODING!** Always follow this sequence:

1. **Research**: Explore the codebase, understand existing patterns
2. **Plan**: Create a detailed implementation plan and verify it with me
3. **Implement**: Execute the plan with validation checkpoints

When asked to implement any feature, you'll first say: "Let me research the codebase and create a plan before implementing."

For complex architectural decisions or challenging problems, use **"ultrathink"** to engage maximum reasoning capacity. Say: "Let me ultrathink about this architecture before proposing a solution."

### USE MULTIPLE AGENTS!

_Leverage subagents aggressively_ for better results:

- Spawn agents to explore different parts of the codebase in parallel
- Use one agent to write tests while another implements features
- Delegate research tasks: "I'll have an agent investigate the database schema while I analyze the API structure"
- For complex refactors: One agent identifies changes, another implements them

Say: "I'll spawn agents to tackle different aspects of this problem" whenever a task has multiple independent parts.

### Reality Checkpoints

**Stop and validate** at these moments:

- After implementing a complete feature
- Before starting a new major component
- When something feels wrong
- Before declaring "done"

> Why: You can lose track of what's actually working. These checkpoints prevent cascading failures.

### ✅ Quality Validation

**When making changes:**

1. **BUILD FIRST** - Always run `npm run build` to verify TypeScript compilation
2. **FIX COMPILATION ERRORS** - Address any TypeScript errors immediately
3. **TEST FUNCTIONALITY** - Verify changes work as expected
4. **CONTINUE TASK** - Proceed with implementation once code compiles

Focus on:

- TypeScript compilation success
- Functional correctness
- Clean, readable code

## Working Memory Management

### When context gets long:

- Re-read this CLAUDE.md file
- Summarize progress in a PROGRESS.md file
- Document current state before major changes

### Maintain TODO.md:

```
## Current Task
- [ ] What we're doing RIGHT NOW

## Completed
- [x] What's actually done and tested

## Next Steps
- [ ] What comes next
```

## Implementation Standards

### Our code is complete when:

- ✅ TypeScript compiles without errors (`npm run build`)
- ✅ Feature works end-to-end
- ✅ Code is clean and readable
- ✅ Unused code is removed

### Testing Strategy

- **Jest Framework**: Run tests with `npm test` or `npm run test:watch`
- **Test Structure**: Tests in `__tests__/` directory with `.test.ts/.tsx` extensions
- **Manual Testing**: Test MCP integration and WebPageTest API manually
- **Focus**: Integration testing (does the tool work end-to-end?)
- **Skip**: Unit tests for simple data transformations

### Environment Variables Required

```bash
WPT_API_KEY=your_webpagetest_api_key      # Required for performance testing
CLAUDE_API_KEY=your_claude_api_key        # Required for AI insights
CLAUDE_MODEL=claude-3-5-sonnet-20240620   # AI model to use
CACHE_TTL_SECONDS=604800                  # Optional: Cache TTL (default: 7 days)
```

## Problem-Solving Together

When you're stuck or confused:

1. **Stop** - Don't spiral into complex solutions
2. **Delegate** - Consider spawning agents for parallel investigation
3. **Ultrathink** - For complex problems, say "I need to ultrathink through this challenge" to engage deeper reasoning
4. **Step back** - Re-read the requirements
5. **Simplify** - The simple solution is usually correct
6. **Ask** - "I see two approaches: [A] vs [B]. Which do you prefer?"

My insights on better approaches are valued - please ask for them!

## Performance & Security

### **Performance**:

- No premature optimization
- Focus on correctness first
- Optimize only when there are actual performance issues

### **Security Always**:

- Validate all inputs
- Handle API credentials securely (environment variables)
- Don't log sensitive information

## Communication Protocol

### Progress Updates:

```
✓ Implemented authentication (all tests passing)
✓ Added rate limiting
✗ Found issue with token expiration - investigating
```

### Suggesting Improvements:

"The current approach works, but I notice [observation].
Would you like me to [specific improvement]?"

## Key Technical Patterns

### useAudit Hook (`src/lib/hooks/useAudit.ts`)
- **Central State Management**: Manages test lifecycle, metrics, AI insights, and A11y results
- **Polling Logic**: Handles WebPageTest status checking with exponential backoff
- **Parallel Fetching**: Runs AI insights and accessibility scans simultaneously when test completes
- **Local Caching**: AI insights cached in localStorage with 7-day TTL
- **Phase Management**: Handles test phases (queued → running → finished/error)

### MCP Integration
- **Process Spawning**: API routes spawn `npx -y a11y-mcp-server` as child process
- **JSON-RPC**: Communicates with MCP server via JSON-RPC over stdio
- **Accessibility**: Uses axe-core for comprehensive a11y auditing
- **Error Handling**: Graceful degradation if MCP server fails

### Server-Side Caching (`src/lib/server/cache.ts`)
- **TTL-based**: Configurable cache expiration (default 7 days)
- **Request Coalescing**: Prevents duplicate simultaneous requests
- **Memory-based**: Simple in-process cache with automatic cleanup

## Working Together

- This is always a feature branch - no backwards compatibility needed
- When in doubt, we choose clarity over cleverness
- **Pages Router**: This project uses Pages Router, not App Router
- **REMINDER**: If this file hasn't been referenced in 30+ minutes, RE-READ IT!

Avoid complex abstractions or "clever" code. The simple, obvious solution is probably better, and my guidance helps you stay focused on what matters.