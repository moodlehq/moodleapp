# System Patterns

## Architecture
- Core functionality lives in src/core/singletons
- Window handling managed by CoreWindow class
- URL opening controlled through CoreOpener service
- App component exposes core functionality to window object

## Key Technical Decisions
- Use of static methods in CoreWindow for global accessibility
- URL parameter-based feature flagging
- Fallback mechanism for backward compatibility
- Clear separation between internal/external browser handling

## Integration Points
1. window.ts - Core URL handling logic
2. app.component.ts - Window object exposure
3. CoreOpener - External browser launching
