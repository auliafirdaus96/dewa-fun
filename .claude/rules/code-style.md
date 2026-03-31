# Code Style Conventions

## TypeScript & Next.js
- Use **Next.js 14+ App Router**.
- **Server Components** by default. Use `'use client'` only when necessary for interactivity.
- Use **Tailwind CSS** for styling.
- Follow **Functional Programming** patterns; avoid classes for UI logic.
- Strict Type Safety: No `any`. Use interfaces for data models.

## Solana & Anchor
- Use **Anchor 0.30+**.
- Naming: `snake_case` for programs/instructions, `camelCase` for TypeScript SDK.
- Always include **Events** for critical state changes in programs.
- Use **PDA (Program Derived Addresses)** for state storage.
- Document every instruction with a doc comment `///`.

## LangGraph (Python)
- Use **Pydantic** for state schemas.
- Modularize nodes into separate files.
- Use **LangSmith** for observability.
