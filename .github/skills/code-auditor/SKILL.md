---
name: code-auditor
description: 'Audit Moodle Mobile App source code for bugs, anti-patterns, and architecture violations. Use when: reviewing TypeScript/Angular/Ionic code quality, finding potential bugs, code review, bug hunting, inspecting addon or feature code for correctness. Fixes easy bugs immediately and reports all findings by severity.'
argument-hint: 'Path or area to audit (e.g. src/addons/badges)'
---

# Code Auditor

## When to Use

- Auditing an addon or feature path for correctness (e.g. `src/addons/badges`)
- Code review before merging
- Hunting a suspected bug in a specific area
- Verifying compliance with Moodle Mobile App architecture conventions

## Procedure

1. **Discover files** — list the target path recursively; build a todo item per top-level file or sub-folder.
2. **Read thoroughly** — read each `.ts`, `.html`, and `.scss` file before drawing conclusions. Prefer large range reads.
3. **Check against the patterns below** — cross-reference each file against every checklist category.
4. **Record findings** — for each issue note: file, line, severity (Critical / High / Medium / Low), description, recommended fix.
5. **Apply safe fixes** — directly edit the file when the fix is unambiguous and low-risk (missing `await`, wrong control flow directive, obvious typo). Mark the todo item completed immediately after.
6. **Produce the report** — after all files are done, emit the structured report (see Output Format).

## Bug Patterns Checklist

### Architecture
- [ ] Services injected via `constructor(private svc: MyService)` instead of the `makeSingleton` singleton pattern and `@singletons` imports
- [ ] Handlers not registered via `provideAppInitializer` in module providers
- [ ] Direct DOM manipulation instead of Angular APIs
- [ ] Missing `track` expression in `@for` loops over complex objects

### TypeScript
- [ ] `any` (implicit or explicit) where a proper type exists
- [ ] Missing `await` on async / Promise-returning calls, especially inside `try/catch` or boolean guards
- [ ] Fire-and-forget Promises without intent (missing `void` keyword or comment)
- [ ] Observable subscriptions without `takeUntil` or explicit unsubscription (memory leaks)
- [ ] `!` non-null assertion without a preceding null/undefined guard

### Angular / Signals
- [ ] Deprecated decorator APIs (`@Input()`, `@Output()`, `@ViewChild()`) — prefer `input()`, `output()`, `viewChild()`
- [ ] Legacy structural directives `*ngIf` / `*ngFor` / `*ngSwitch` — prefer `@if` / `@for` / `@switch`
- [ ] Component state mutated outside signals when the component already uses signals
- [ ] Missing `OnPush` change detection where a component uses only signals or immutable inputs

### Ionic / Mobile
- [ ] Cordova/native API calls without a platform availability check (`CorePlatform.isMobile()`)
- [ ] Missing error handling on `CoreWS` / `site.read` / `site.write` calls
- [ ] Network or file operations without offline fallback or error recovery

### Security (OWASP)
- [ ] User-controlled content bound to `[innerHTML]` without Angular sanitisation or `CoreText.processHTML`
- [ ] Sensitive data (tokens, passwords, hashes) passed to `console.log` or `CoreLogger.log`
- [ ] String-concatenated cache/query keys built from unsanitised user input

## Constraints

- DO NOT refactor code beyond fixing actual bugs
- DO NOT add comments, docstrings, or type annotations to code you did not change
- DO NOT introduce new abstractions or utilities unless fixing a bug requires it
- DO NOT apply stylistic preferences; only fix correctness issues
- ONLY edit files when the fix is unambiguous and low-risk; otherwise, document the issue clearly

## Output Format

```
## Audit Report: <path>

### Fixed Issues
- [Severity] file.ts:LINE — Description — Fix applied

### Issues Requiring Attention
- [Severity] file.ts:LINE — Description — Recommended fix

### No Issues Found
- file.ts
```

Group by severity within each section (Critical first). If nothing is found in the whole path, say so clearly.
