# Tech Context

## Technologies
- TypeScript for app logic
- Angular framework
- Ionic for mobile UI components
- CoreWindow singleton for window management
- CoreOpener for browser handling

## Development Setup
Required files to modify:
- src/core/singletons/window.ts
- src/app/app.component.ts

## Technical Constraints
- Must maintain backward compatibility
- Need to support both modern and legacy apps
- Plugin code provides fallback mechanism
- Must handle URL parsing safely
