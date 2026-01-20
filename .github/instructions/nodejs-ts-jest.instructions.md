---
description: "Guidelines for writing Node.js and TypeScript code with Jest testing"
applyTo: '**/*.test.ts'
---

# Code Generation Guidelines

## Coding standards
- Use TypeScript with ES2022 features and Node.js (version defined in .nvmrc) ESM modules
- Use Node.js built-in modules and avoid external dependencies where possible
- Ask the user if you require any additional dependencies before adding them
- Always use async/await for asynchronous code, and use 'node:util' promisify function to avoid callbacks
- Keep the code simple and maintainable
- Use descriptive variable and function names
- Do not add comments unless absolutely necessary, the code should be self-explanatory
- Never use `null`, always use `undefined` for optional values
- Prefer functions over classes

## Testing
- Use Jest for testing
- It's recommended to write tests for all new features and bug fixes
- Ensure tests cover edge cases and error handling
- NEVER change the original code to make it easier to test, instead, write tests that cover the original code as it is

## User interactions
- Ask questions if you are unsure about the implementation details, design choices, or need clarification on the requirements
- Always answer in the same language as the question, but use English for the generated content like code, comments or docs
