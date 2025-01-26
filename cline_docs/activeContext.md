# Active Context

## Current Task
Phase 2: Modify CoreWindow.open to detect forceexternal=1 parameter

## Recent Changes
Completed Phase 1:
- Added handleLinkExternally function to CoreWindow class
- Exposed function to window object via app.component.ts
- Function successfully opens URLs in external browser

## Next Steps
1. Modify CoreWindow.open() to:
   - Parse incoming URLs
   - Check for forceexternal=1 parameter
   - Call CoreOpener.openInBrowser() when parameter is present
2. Add error handling and logging
3. Test integration with Moodle plugin
