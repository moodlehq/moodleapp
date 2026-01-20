---
description: 'Angular and Ionic 8 coding standards for Moodle Mobile App'
applyTo: '**/*.{ts,html,scss} && !**/*.test.ts'
---

# Angular & Ionic 8 Development Instructions

Instructions for generating high-quality Angular applications with TypeScript, using Angular Signals for state management, adhering to Angular best practices as outlined at https://angular.dev.

## Project Context
- Angular version (version defined in package.json)
- TypeScript for type safety
- Angular CLI for project setup and scaffolding
- Follow Angular Style Guide (https://angular.dev/style-guide)
- Use Ionic framework for mobile-optimised UI components (version defined in package.json)
- Use Cordova for native device features
- Check .browserslistrc for supported browsers and platforms

## Development Standards

### Architecture
- Use standalone components unless modules are explicitly required
- Organise code by standalone feature modules or domains for scalability
- Implement lazy loading for feature modules to optimise performance
- Use Angular's built-in dependency injection system effectively
- Structure components with a clear separation of concerns (smart vs. presentational components)

### TypeScript
- Using recommended rules in `eslint.config.mjs` for type safety
- Define clear interfaces and types for components, services, and models
- Use type guards and union types for robust type checking
- Use typed forms (e.g., `FormGroup`, `FormControl`) for reactive forms

### Component Design
- Follow Angular's component lifecycle hooks best practices
- Use `input()` `output()`, `viewChild()`, `viewChildren()`, `contentChild()` and `contentChildren()` functions instead of decorators
- Leverage Angular's change detection strategy (default or `OnPush` for performance)
- Keep templates clean and logic in component classes or services
- Use Angular directives and pipes for reusable functionality
- Use new control flow directives like `@if`, `@for`, `@switch` for cleaner templates

### Styling
- Use Angular's component-level CSS encapsulation (default: ViewEncapsulation.Emulated)
- Prefer SCSS for styling with consistent theming
- Implement responsive design using CSS Grid, Flexbox, or Ionic Layout utilities
- Maintain accessibility (a11y) with ARIA attributes and semantic HTML

### State Management
- Use Angular Signals for reactive state management in components and services
- Leverage `signal()`, `computed()`, and `effect()` for reactive state updates
- We won't use any experimental features of Angular Signals such as `resource()`
- Use writable signals for mutable state and computed signals for derived state
- Handle loading and error states with signals and proper UI feedback
- Use Angular's `AsyncPipe` to handle observables in templates when combining signals with RxJS
- Use Signals for local state rather than RxJS Subjects where possible.

### Data Fetching
- Use the `CoreWS` service for API calls (which handles both web and Cordova environments)
- Implement RxJS operators for data transformation and error handling
- Use Angular's `inject()` function for dependency injection in standalone components and feature modules only; for services, use the `makeSingleton` pattern via `@singletons` (see Moodle Mobile App - AI Agent Guidelines)
- Implement caching strategies

### Security
- Sanitise user inputs using Angular's built-in sanitisation
- Implement route guards for authentication and authorisation
- Validate form inputs with Angular's reactive forms and custom validators
- Follow Angular's security best practices (e.g., avoid direct DOM manipulation)

### Performance
- Enable production builds with `npm run build:prod` for optimisation
- Use lazy loading for routes to reduce initial bundle size
- Use trackBy in `@for` loops to improve rendering performance

### Testing
- Write unit tests for components, services, and pipes using Jest as the test runner
- Use Angular's `TestBed` for component testing with mocked dependencies
- Test signal-based state updates using Angular's testing utilities
- Ensure high test coverage for critical functionality

## Implementation Process
1. Plan project structure and feature modules
2. Define TypeScript interfaces and models
3. Scaffold components, services, and pipes using Angular CLI
4. Implement data services and API integrations with signal-based state
5. Build reusable components with clear inputs and outputs
6. Add reactive forms and validation
7. Apply styling with SCSS and responsive design
8. Implement lazy-loaded routes and guards
9. Add error handling and loading states using signals
10. Write unit and end-to-end tests
11. Optimise performance and bundle size

## Additional Guidelines
- Follow the Moodle App Style Guide for file naming conventions (see https://moodledev.io/general/development/policies/codingstyle-moodleapp). Also check eslint.config.mjs.
- Use Angular CLI commands for generating boilerplate code
- Document components and services with clear JSDoc comments
- Ensure accessibility compliance (WCAG 2.1) where applicable
- Use ngx-translate for internationalisation
- Keep code DRY by creating reusable utilities and shared modules
- Use signals consistently for state management to ensure reactive updates

## Documentation
- When changing the API or adding new features, update the UPGRADE.md file where necessary
- Document any new components, services, or significant changes in the codebase with clear comments and documentation
