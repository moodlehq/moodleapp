# Product Context

## Purpose
- Enhance Moodle Mobile app's link handling capability to support forced external browser opening
- Allow Moodle plugins to control how certain activities are displayed

## Problem Solved
- Current Moodle Mobile app always opens activities in its internal webview
- Some activities need to be opened in the system's default browser instead
- No mechanism exists to force external browser opening from Moodle plugins

## How It Works
1. Plugin adds 'forceexternal=1' parameter to activity URLs that need external opening
2. Mobile app detects this parameter through:
   - Primary: window.handleLinkExternally() function
   - Fallback: Modified CoreWindow.open() behavior
3. When detected, app bypasses internal webview and launches system browser
