# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup       # First-time setup: install deps, generate Prisma client, run migrations
npm run dev         # Development server with Turbopack on port 3000
npm run build       # Production build
npm run lint        # ESLint check
npm run test        # Run all tests with Vitest
npm run db:reset    # Reset database migrations
```

To run a single test file:
```bash
npx vitest run src/path/to/file.test.tsx
```

## Environment

Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. Without it, the app runs in **mock mode** — a built-in mock provider (`/src/lib/provider.ts`) simulates AI responses with pre-canned components (Counter, Form, Card). This is useful for UI development without API costs.

## Architecture

UIGen is a Next.js 15 (App Router) application that lets users generate React components via chat and preview them live.

### Data Flow

1. User types in chat → `MessageInput` sends to `/api/chat/route.ts`
2. The route calls Claude (or the mock provider) with streaming
3. Claude responds with **tool calls** — two tools are available:
   - `str_replace_editor`: create/view/edit files in the virtual FS
   - `file_manager`: rename/delete files
4. Tool results update the **VirtualFileSystem** (in-memory, no disk writes)
5. File changes trigger the **JSX transformer** which uses Babel standalone + esm.sh import maps to render a preview in a sandboxed iframe
6. On completion (`onFinish`), authenticated users have their project auto-saved to SQLite via Prisma

### Key Abstractions

**VirtualFileSystem** (`/src/lib/file-system.ts`): In-memory FS abstraction used by AI tools. Serializes to JSON for database persistence. All "file editing" by Claude happens here, never on disk.

**FileSystemContext** (`/src/lib/contexts/FileSystemContext.tsx`): React context wrapping VirtualFileSystem, handles tool call execution and triggers preview re-renders.

**ChatContext** (`/src/lib/contexts/ChatContext.tsx`): Wraps `@ai-sdk/react`'s `useChat`, manages message state and tool invocation callbacks.

**JSX Transformer** (`/src/lib/transform/jsx-transformer.ts`): Transforms JSX via Babel standalone, generates an import map pointing to esm.sh CDN, then produces sandboxed iframe HTML for live preview.

**Mock Provider** (`/src/lib/provider.ts`): Implements the same streaming interface as Anthropic SDK — drops in when no API key is present.

### AI System Prompt

The system prompt (`/src/lib/prompts/generation.tsx`) instructs Claude to:
- Always create `/App.jsx` as the entry point
- Use Tailwind CSS for styling
- Use `@/` import alias for cross-file imports within the virtual FS
- Keep all edits within the virtual filesystem

### Auth

JWT-based sessions via `jose` library (`/src/lib/auth.ts`, server-only). Sessions are 7-day cookies. Middleware at `/src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes. Users can use the app anonymously; projects are optionally linked to accounts.

### Database

Prisma with SQLite (`./prisma/dev.db`). Schema is defined in `prisma/schema.prisma` — reference it anytime you need to understand the structure of data stored in the database. Two models: `User` (email/password) and `Project` (stores serialized VirtualFileSystem as JSON + chat messages as JSON).

### Tech Stack

- **Next.js 15** App Router, **React 19**, **TypeScript 5**
- **Tailwind CSS v4** + **shadcn/ui** (New York style, `@/*` → `src/*`)
- **Prisma** + SQLite
- **@ai-sdk/anthropic** with `claude-haiku-4-5` model, prompt caching enabled
- **Monaco Editor** for code editing
- **Vitest** + React Testing Library for tests
