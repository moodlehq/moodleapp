---
description: 'Guidelines for TypeScript Development targeting TypeScript 5.x and ES2021 output'
applyTo: '**/*.ts'
---

# TypeScript Development

## Core Intent

- Respect the existing architecture and coding standards.
- Prefer readable, explicit solutions over clever shortcuts.
- Extend current abstractions before inventing new ones.
- Prioritise maintainability and clarity, short methods and classes, clean code.

## General Guardrails

- Target TypeScript 5.x / ES2021 and prefer native features over polyfills.
- Use pure ES modules; always emit only ES module syntax, not `require`, `module.exports`, or CommonJS helpers.
- Rely on the project's build, lint, and test scripts unless asked otherwise.
- Note design trade-offs when intent is not obvious.

## Project Organization

- Follow the repository's folder and responsibility layout for new code.
- Use kebab-case filenames (e.g., `user-session.ts`, `data-service.ts`) unless told otherwise.
- Keep tests, types, and helpers near their implementation when it aids discovery.
- Reuse or extend shared utilities when it reduces duplication and keeps responsibilities focused.
- Create new utilities when they serve a distinct purpose; keep "Utils" classes focused on related concerns only.

## Naming & Style

- Use PascalCase for classes, interfaces, enums, and type aliases; camelCase for everything else.
- Skip interface prefixes like `I`; rely on descriptive names.
- Name things for their behavior or domain meaning, not implementation.

## Formatting & Style

- Run the repository's lint/format scripts (e.g., `npm run lint`) before submitting.
- Match the project's indentation, quote style, and trailing comma rules.
- Keep functions focused; extract helpers when logic branches grow.
- Favor immutable data and pure functions when practical.

## Type System Expectations

- Avoid `any` (implicit or explicit); prefer `unknown` plus narrowing.
- Use discriminated unions for real-time events and state machines.
- Centralise shared contracts instead of duplicating shapes.
- Express intent with TypeScript utility types (e.g., `Readonly`, `Partial`, `Record`).
- Prefer `type` over `interface` for defining shapes; use `interface` when a class must implement it.

## Async, Events & Error Handling

- Use `async/await`; wrap awaits in try/catch with structured errors.
- Guard edge cases early to avoid deep nesting.
- Send errors through the project's logging/telemetry utilities.
- Capture errors with structured logging via the project's `CoreLogger`; surface user-facing errors through alerts, toasts, modals only when user action is required.
- Debounce high-frequency user inputs (e.g., search, text input, scroll) to reduce thrash; avoid debouncing discrete actions (e.g., toggles, selections, clicks).
- Dispose resources deterministically to prevent leaks.


## Architecture & Patterns

- Follow the repository's dependency injection or composition pattern; keep modules single-purpose.
- Observe existing initialization and disposal sequences when wiring into lifecycles.
- Keep transport, domain, and presentation layers decoupled with clear interfaces.
- Supply lifecycle hooks (e.g., `initialize`) and targeted tests when adding services.

## External Integrations

- Instantiate clients outside hot paths and inject them for testability.
- Always load secrets from secure sources instead of hardcoding them.
- Normalise external responses and map errors to domain shapes.

## Security Practices

- Validate and sanitise external input with schema validators or type guards.
- Permit dynamic code execution and untrusted template rendering only on plugins.
- Encode untrusted content before rendering HTML; use framework escaping or trusted types.
- Use parameterised queries or prepared statements to block injection.
- Favor immutable flows and defensive copies for sensitive data.
- Use vetted crypto libraries only.
- Patch dependencies promptly and monitor advisories.

## Configuration

- Access configuration through the `CoreConstants.CONFIG` configuration object or environment-specific exports.
- Document new configuration keys and update related tests.

## UI & UX Components

- Sanitise user or external content before rendering.
- Keep UI layers thin; push heavy logic to services or state managers.
- Use messaging or events to decouple UI from business logic.

## Testing Expectations

- Add or update unit tests with the project's framework and naming style.
- Expand integration or end-to-end suites when behavior crosses modules or platform APIs.
- Use fake timers or injected clocks instead of brittle timing assertions.

## Performance & Reliability

- Lazy-load heavy dependencies and dispose them when done.
- Defer expensive work until users need it.
- Batch or debounce high-frequency events to reduce thrash.
- Track resource lifetimes to prevent leaks.

## Documentation & Comments

- Add JSDoc comments on every function, class, and module with a clear description of its purpose, parameters, return value, and any side effects.
- `@since` tag is meant to indicate in which version of the backend the function or parameter was added.
- `@deprecatedonmoodle` tag is meant to indicate in which version of the backend the function or parameter was deprecated.
- Write comments that capture intent, and remove stale notes during refactors.
