# Google Play Data Safety Form Guide

This document helps you complete the Google Play Console Data Safety form for the Aspire School app.

## Privacy Policy URL

**Use this URL in the Play Console:**
```
https://learn.aspireschool.org/local/privacypolicy/privacy.php
```

---

## Data Safety Form Sections

Based on the actual app code analysis, here's what to declare in the Google Play Data Safety form:

### 1. Data Collection and Security

**Does your app collect or share any of the required user data types?**
- ✅ **YES** - The app collects data

**Is all of the user data collected by your app encrypted in transit?**
- ✅ **YES** - All data uses HTTPS/TLS encryption

**Do you provide a way for users to request that their data is deleted?**
- ✅ **YES** - Users can contact privacy@aspireschool.org to request deletion

---

## 2. Data Types Collected

### Location

**Approximate location**
- ✅ Collected: YES
- ✅ Shared: NO
- ✅ Optional: YES (only for specific educational activities)
- ✅ Purpose: App functionality, Analytics
- ✅ Reason: "Used for location-based educational activities such as field trips"

**Precise location**
- ✅ Collected: YES
- ✅ Shared: NO
- ✅ Optional: YES (only for specific educational activities)
- ✅ Purpose: App functionality
- ✅ Reason: "Used for specific educational activities requiring precise location"

### Personal Info

**Name**
- ✅ Collected: YES
- ✅ Shared: YES (with Moodle server only)
- ⬜ Optional: NO (required for Moodle account)
- ✅ Purpose: App functionality, Account management
- ✅ Reason: "Required for user identification and educational services"

**Email address**
- ✅ Collected: YES
- ✅ Shared: YES (with Moodle server only)
- ⬜ Optional: NO (required for Moodle account)
- ✅ Purpose: App functionality, Account management, Communications
- ✅ Reason: "Required for account access and school communications"

**User IDs**
- ✅ Collected: YES
- ✅ Shared: YES (with Moodle server and FCM)
- ⬜ Optional: NO
- ✅ Purpose: App functionality, Account management
- ✅ Reason: "Required for authentication and identifying user sessions"

**Other info** (Student grades, assignments, submissions)
- ✅ Collected: YES
- ✅ Shared: YES (with Moodle server only)
- ⬜ Optional: NO
- ✅ Purpose: App functionality
- ✅ Reason: "Educational records required for learning management"

### Photos and videos

**Photos**
- ✅ Collected: YES
- ⬜ Shared: NO (stays on Moodle server)
- ✅ Optional: YES
- ✅ Purpose: App functionality
- ✅ Reason: "Used for profile pictures and assignment submissions"

**Videos**
- ✅ Collected: YES
- ⬜ Shared: NO (stays on Moodle server)
- ✅ Optional: YES
- ✅ Purpose: App functionality
- ✅ Reason: "Used for assignment submissions and educational content"

### Audio files

**Voice or sound recordings**
- ✅ Collected: YES
- ⬜ Shared: NO (stays on Moodle server)
- ✅ Optional: YES
- ✅ Purpose: App functionality
- ✅ Reason: "Used for assignment submissions and educational activities"

**Other audio files**
- ✅ Collected: YES
- ⬜ Shared: NO (stays on Moodle server)
- ✅ Optional: YES
- ✅ Purpose: App functionality
- ✅ Reason: "Used for educational content and assignments"

### Files and docs

**Files and docs**
- ✅ Collected: YES
- ⬜ Shared: NO (stays on Moodle server)
- ✅ Optional: YES
- ✅ Purpose: App functionality
- ✅ Reason: "Used for assignment submissions and educational materials"

### Messages

**Emails**
- ✅ Collected: YES
- ⬜ Shared: NO (stays within Moodle)
- ⬜ Optional: NO
- ✅ Purpose: App functionality, Communications
- ✅ Reason: "Required for school communications and notifications"

**Other in-app messages**
- ✅ Collected: YES (forum posts, chat messages)
- ⬜ Shared: NO (stays within Moodle)
- ⬜ Optional: NO
- ✅ Purpose: App functionality, Communications
- ✅ Reason: "Required for course discussions and teacher-student communication"

### App activity

**App interactions**
- ✅ Collected: YES
- ⬜ Shared: NO
- ⬜ Optional: NO
- ✅ Purpose: App functionality, Analytics
- ✅ Reason: "Track learning progress and course completion for educational purposes"

**In-app search history**
- ⬜ Collected: NO

**Other user-generated content**
- ✅ Collected: YES (assignment submissions, quiz responses)
- ⬜ Shared: NO (stays on Moodle)
- ⬜ Optional: NO
- ✅ Purpose: App functionality
- ✅ Reason: "Educational content required for coursework and grading"

### App info and performance

**Crash logs**
- ✅ Collected: YES
- ⬜ Shared: NO
- ✅ Optional: YES
- ✅ Purpose: App functionality, Analytics
- ✅ Reason: "Technical diagnostics to improve app stability"

**Diagnostics**
- ✅ Collected: YES
- ⬜ Shared: NO
- ✅ Optional: YES
- ✅ Purpose: App functionality, Analytics
- ✅ Reason: "Technical performance data to improve app quality"

**Other app performance data**
- ✅ Collected: YES (network status, app version)
- ⬜ Shared: NO
- ⬜ Optional: NO
- ✅ Purpose: App functionality
- ✅ Reason: "Required for offline mode and app synchronization"

### Device or other IDs

**Device or other IDs**
- ✅ Collected: YES (device token for push notifications)
- ✅ Shared: YES (with Firebase Cloud Messaging only)
- ⬜ Optional: NO (required for notifications)
- ✅ Purpose: App functionality, Analytics
- ✅ Reason: "Device tokens required for push notifications about courses and grades"

---

## 3. Data Usage Purposes

When asked "Why is this data being collected?", select the appropriate purposes:

**App functionality**
- All educational data, files, media, messages
- Required for the core purpose of the app

**Analytics**
- Location data (if used for educational analytics)
- App interactions, diagnostics, crash logs
- Device performance data
- **IMPORTANT: NOT used for marketing or advertising**

**Communications**
- Email, messages, notifications
- Required for school communications

**Account management**
- Name, email, user IDs
- Required for authentication

---

## 4. Third-Party Data Sharing

**Do you share data with third parties?**
- ✅ **YES** - But ONLY with:
  1. **Moodle Server** (learn.aspireschool.org) - Educational platform (First party)
  2. **Firebase Cloud Messaging** - Push notifications only

**For Firebase Cloud Messaging:**
- Data shared: Device tokens and notification content ONLY
- Purpose: Delivering push notifications
- ⬜ Analytics/advertising: NO
- ✅ App functionality: YES

**Important declarations:**
- ⬜ Data is NOT sold to third parties
- ⬜ Data is NOT used for marketing or advertising
- ⬜ Firebase Analytics is DISABLED
- ✅ Data sharing is limited to essential services only

---

## 5. Data Security Practices

**Encryption**
- ✅ Data is encrypted in transit (HTTPS/TLS)
- ✅ Data is encrypted at rest (on Moodle server)

**User Controls**
- ✅ Users can request data deletion
- ✅ Users can manage permissions
- ✅ Users can disable notifications

**Compliance**
- ✅ COPPA compliant (children under 13)
- ✅ FERPA compliant (educational records)
- ✅ GDPR considerations

---

## 6. App Content Rating

**Target audience includes children:**
- ✅ **YES** - Educational app for students (may include minors)

**Is this app designed for children under 13?**
- Select: "No, this app is not primarily designed for children"
- But note: "This app is designed for education and may be used by students of all ages"

**Family Policy compliance:**
- ✅ Declare that the app collects student data for educational purposes only
- ✅ Obtain appropriate parental consent through the school
- ⬜ No ads targeting children
- ⬜ No behavioral advertising

---

## 7. Important Notes for Reviewers

**Include this information in your store listing description:**

```
EDUCATIONAL USE ONLY
This app is designed for students, parents, and teachers of Aspire School.
You must have a Moodle account at learn.aspireschool.org to use this app.

DATA PRIVACY:
- We do NOT sell user data to third parties
- We do NOT use data for advertising or marketing
- Analytics are disabled - educational purposes only
- Full privacy policy: https://learn.aspireschool.org/local/privacypolicy/privacy.php

PERMISSIONS:
- Camera: For assignment submissions and profile pictures
- Storage: For offline course content
- Location: Optional, only for specific educational activities
- Notifications: For course updates and grades
```

---

## 8. Testing the Privacy Policy

Before submitting to Play Store:

1. ✅ Install the plugin on your Moodle server
2. ✅ Verify the URL works: https://learn.aspireschool.org/local/privacypolicy/privacy.php
3. ✅ Test without login (use incognito browser)
4. ✅ Check all sections display correctly
5. ✅ Verify all links work (Firebase privacy policy, etc.)

---

## 9. Checklist Before Submission

- [ ] Privacy policy is live at the URL
- [ ] Privacy policy is accessible without login
- [ ] Data Safety form completed accurately
- [ ] All permissions are explained in store listing
- [ ] App description mentions educational use
- [ ] Contact email (privacy@aspireschool.org) is active
- [ ] School has reviewed and approved the privacy policy
- [ ] Legal counsel has reviewed (recommended)

---

## 10. Common Review Issues to Avoid

**❌ AVOID THESE MISTAKES:**
1. Don't claim you collect NO data (you do - educational data)
2. Don't forget to mention Firebase Cloud Messaging
3. Don't say "optional" for required educational data
4. Don't forget to provide the privacy policy URL
5. Don't use PDF for privacy policy (must be web page)

**✅ DO THIS:**
1. Be transparent about ALL data collection
2. Clearly state educational purpose
3. Explain each permission before requesting it
4. Provide clear contact information
5. Keep privacy policy URL accessible without login

---

## Support

For questions about this privacy policy or Data Safety form:
- **Email:** privacy@aspireschool.org
- **Moodle Admin:** Contact your school administrator
- **Privacy Policy:** https://learn.aspireschool.org/local/privacypolicy/privacy.php
