---
description: "Guidelines for writing Node.js and TypeScript code with Jest testing"
applyTo: '**/*.test.ts'
---

# Code Generation Guidelines

## Coding standards
- Use TypeScript with ES2022 features and Node.js (version defined in .nvmrc) ESM modules
- Use Node.js built-in modules and minimise external dependencies where possible
- Ask the user before adding any additional dependencies
- Always use async/await for asynchronous code, and use 'node:util' promisify function to avoid callbacks
- Keep the code simple and maintainable
- Use descriptive variable and function names
- Write code that is self-explanatory, so comments are only needed when absolutely necessary
- Use `undefined` for optional values instead of `null`
- Prefer functions over classes

## Testing
- Use Jest for testing
- It's recommended to write tests for all new features and bug fixes
- Ensure tests cover edge cases and error handling
- Always write tests that cover the original code as it is, without changing the original code for testability

## User interactions
- Ask questions if you are unsure about the implementation details, design choices, or need clarification on the requirements
- Always answer in the same language as the question, but use English for the generated content like code, comments or docs
