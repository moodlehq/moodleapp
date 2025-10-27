<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * English language strings for local_privacypolicy
 *
 * @package    local_privacypolicy
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$string['pluginname'] = 'Privacy Policy - Aspire School App';
$string['privacypolicy'] = 'Privacy Policy - Aspire School Mobile Application';

// Section titles
$string['section_introduction'] = 'Introduction';
$string['section_datacollection'] = '1. Information We Collect';
$string['section_datausage'] = '2. How We Use Your Information';
$string['section_datastorage'] = '3. Data Storage and Security';
$string['section_thirdparty'] = '4. Third-Party Services';
$string['section_permissions'] = '5. App Permissions';
$string['section_userrights'] = '6. Your Rights and Choices';
$string['section_datasharing'] = '7. Data Sharing';
$string['section_dataretention'] = '8. Data Retention';
$string['section_children'] = '9. Children\'s Privacy';
$string['section_changes'] = '10. Changes to This Policy';
$string['section_contact'] = '11. Contact Information';

// Introduction
$string['section_introduction_desc'] = '<p>Aspire School ("we," "us," or "our") operates the Aspire School mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.</p>
<p>This App connects to the Aspire School Moodle learning platform at <strong>learn.aspireschool.org</strong> to provide students, parents, and teachers with access to educational content, assignments, grades, and communication tools.</p>
<p><strong>By using the App, you agree to the collection and use of information in accordance with this policy.</strong></p>';

// Section content - Based on actual app code analysis
$string['section_datacollection_desc'] = '<p>Our mobile application collects the following types of information:</p>

<h4>Personal Information from Your Moodle Account:</h4>
<ul>
<li><strong>Account Credentials:</strong> Username and password (encrypted during transmission)</li>
<li><strong>Profile Information:</strong> Name, email address, profile picture, and user ID</li>
<li><strong>Educational Records:</strong> Course enrollments, grades, assignment submissions, quiz attempts, and learning progress</li>
<li><strong>Communication Data:</strong> Messages, forum posts, and chat conversations within the Moodle platform</li>
</ul>

<h4>Content You Create or Upload:</h4>
<ul>
<li><strong>Assignment Submissions:</strong> Documents, images, videos, and audio recordings you submit for coursework</li>
<li><strong>Media Files:</strong> Photos taken with the camera or selected from your photo library for assignments or profile pictures</li>
<li><strong>Audio/Video Recordings:</strong> Voice recordings or videos created for assignments</li>
</ul>

<h4>Device Information:</h4>
<ul>
<li><strong>Device Type and Model:</strong> Information about your mobile device</li>
<li><strong>Operating System:</strong> iOS or Android version</li>
<li><strong>App Version:</strong> Version of the Aspire School app you are using</li>
<li><strong>Device Identifiers:</strong> Unique device identifiers for push notifications</li>
<li><strong>Network Information:</strong> Network connection status (WiFi/cellular)</li>
</ul>

<h4>Location Information:</h4>
<ul>
<li><strong>Approximate Location:</strong> Coarse location data (city/region level) may be collected if required by specific course activities or features</li>
<li><strong>Precise Location:</strong> Fine location data only when explicitly required by educational activities (such as field trips or location-based learning activities) and only with your permission</li>
</ul>

<h4>Usage Data:</h4>
<ul>
<li><strong>App Interaction:</strong> Pages visited, features used, and time spent in the app</li>
<li><strong>Learning Analytics:</strong> Course access patterns, content interactions, and completion data (stored on Moodle server)</li>
<li><strong>Error Reports:</strong> Technical diagnostic data when the app encounters errors</li>
</ul>

<p><strong>Important:</strong> We do NOT collect or use analytics data for marketing purposes. App analytics are disabled in the Aspire School app.</p>';

$string['section_datausage_desc'] = '<p>We use the collected information for the following educational purposes only:</p>

<h4>Educational Services:</h4>
<ul>
<li>To provide access to your Moodle courses, assignments, and educational content</li>
<li>To display your grades, feedback, and academic progress</li>
<li>To enable you to submit assignments, take quizzes, and participate in course activities</li>
<li>To facilitate communication between students, teachers, and parents</li>
<li>To sync course content for offline access when you are not connected to the internet</li>
</ul>

<h4>App Functionality:</h4>
<ul>
<li>To authenticate your identity and maintain your login session securely</li>
<li>To send push notifications about course updates, messages, grades, and assignment deadlines</li>
<li>To enable camera and media access for creating and submitting assignments</li>
<li>To provide location-based features only when required for specific educational activities</li>
</ul>

<h4>Technical Support and Improvement:</h4>
<ul>
<li>To provide technical support and respond to your inquiries</li>
<li>To diagnose and fix technical issues with the app</li>
<li>To improve app functionality, performance, and user experience</li>
<li>To ensure the security and integrity of the app and the Moodle platform</li>
</ul>

<p><strong>We do NOT use your data for:</strong></p>
<ul>
<li>Marketing or advertising purposes</li>
<li>Selling to third parties</li>
<li>Profiling or automated decision-making unrelated to education</li>
<li>Behavioral tracking for commercial purposes</li>
</ul>';

$string['section_datastorage_desc'] = '<p>Your data is stored securely using industry-standard security measures:</p>

<h4>Server Storage:</h4>
<ul>
<li><strong>Moodle Server:</strong> Your educational data (courses, grades, submissions) is stored on Aspire School\'s Moodle server at <strong>learn.aspireschool.org</strong></li>
<li><strong>Server Security:</strong> The server uses HTTPS encryption, secure authentication, and is maintained according to Moodle security best practices</li>
<li><strong>Server Location:</strong> Data is stored on servers managed by Aspire School</li>
</ul>

<h4>Local Device Storage:</h4>
<ul>
<li><strong>Offline Data:</strong> Course content, assignments, and materials are cached locally on your device for offline access using SQLite database</li>
<li><strong>Temporary Files:</strong> Media files (images, videos, documents) are temporarily stored on your device</li>
<li><strong>Login Credentials:</strong> Authentication tokens are stored securely on your device using platform-specific secure storage</li>
<li><strong>Data Removal:</strong> Local data is deleted when you log out or uninstall the app</li>
</ul>

<h4>Security Measures:</h4>
<ul>
<li><strong>Encryption in Transit:</strong> All data transmission between the app and Moodle server uses HTTPS/TLS encryption</li>
<li><strong>Secure Authentication:</strong> Industry-standard authentication protocols protect your login credentials</li>
<li><strong>Access Controls:</strong> Only authorized users (students, teachers, administrators) can access educational data based on their roles</li>
<li><strong>Regular Updates:</strong> The app is regularly updated to address security vulnerabilities</li>
</ul>

<p><strong>Data Backup:</strong> Your educational data on the Moodle server is backed up regularly according to Aspire School\'s data retention and backup policies.</p>';

$string['section_thirdparty_desc'] = '<p>This app integrates with the following third-party services to provide functionality:</p>

<h4>Moodle Platform (Required):</h4>
<ul>
<li><strong>Service:</strong> Aspire School Moodle server at learn.aspireschool.org</li>
<li><strong>Purpose:</strong> Connects to the Moodle learning management system to sync educational content, grades, assignments, and communications</li>
<li><strong>Data Shared:</strong> All educational data, user account information, and course content</li>
<li><strong>Privacy Policy:</strong> Managed by Aspire School according to institutional policies</li>
</ul>

<h4>Firebase Cloud Messaging - FCM (Required for Push Notifications):</h4>
<ul>
<li><strong>Service Provider:</strong> Google Firebase Cloud Messaging</li>
<li><strong>Purpose:</strong> Enables push notifications to alert you about course updates, messages, grades, and assignment deadlines</li>
<li><strong>Data Shared:</strong> Device token (unique identifier for push notifications), notification content</li>
<li><strong>Privacy Policy:</strong> <a href="https://firebase.google.com/support/privacy" target="_blank">https://firebase.google.com/support/privacy</a></li>
<li><strong>Important:</strong> Firebase Analytics is <strong>DISABLED</strong> in the Aspire School app. We do not use Firebase for tracking or analytics purposes.</li>
</ul>

<h4>Device Operating System Services:</h4>
<ul>
<li><strong>Camera and Photo Library:</strong> Native device camera and photo library access (controlled by device OS permissions)</li>
<li><strong>Audio Recording:</strong> Native device audio recording capabilities for assignment submissions</li>
<li><strong>File System:</strong> Device file storage for offline content caching</li>
<li><strong>Network Services:</strong> Device network connectivity services</li>
</ul>

<p><strong>No Other Third-Party Services:</strong> The Aspire School app does not integrate with any analytics platforms, advertising networks, or other third-party tracking services.</p>';

$string['section_permissions_desc'] = '<p>The Aspire School app requests the following permissions from your device. You can control these permissions through your device settings:</p>

<h4>Required Permissions:</h4>
<ul>
<li><strong>Internet Access:</strong> Required to connect to the Moodle server and sync your educational content</li>
<li><strong>Network State:</strong> To detect when you are online or offline and enable offline mode</li>
<li><strong>Storage Access:</strong> To cache course content, assignments, and media files for offline access</li>
</ul>

<h4>Optional Permissions (Only Requested When Needed):</h4>
<ul>
<li><strong>Camera:</strong> To take photos for profile pictures, assignment submissions, and sharing with teachers
<br><em>iOS: "We need camera access to take pictures so you can use them for changing your profile picture, attach them in your tasks submission and share them with the teachers."</em></li>

<li><strong>Photo Library/Media Access:</strong> To select existing photos, videos, and documents from your device for assignments and profile pictures
<br><em>iOS: "We need photo library access to get pictures from there so you can use them for changing your profile picture, attach them in your tasks submission and share them with the teachers."</em></li>

<li><strong>Microphone/Audio Recording:</strong> To record audio or video for assignment submissions</li>

<li><strong>Location (Coarse and Fine):</strong> Only requested if a specific course activity requires location data (such as field trips or location-based learning)
<br><em>Location access is NOT required for normal app usage</em></li>

<li><strong>Notifications:</strong> To send you push notifications about course updates, new messages, grade postings, and assignment deadlines
<br><em>You can disable notifications in your device settings</em></li>

<li><strong>Vibrate:</strong> To provide haptic feedback for notifications</li>

<li><strong>Bluetooth (Optional):</strong> May be used for specific educational activities or device integrations if configured by your institution</li>
</ul>

<p><strong>Permission Control:</strong> You can grant or revoke any optional permissions at any time through your device\'s Settings app. Revoking permissions may limit certain features but will not prevent you from accessing your courses and educational content.</p>';

$string['section_userrights_desc'] = '<p>You have the following rights regarding your personal data and privacy:</p>

<h4>Access and Portability:</h4>
<ul>
<li><strong>View Your Data:</strong> You can view and access your personal information, grades, and submissions through the app and the Moodle web interface</li>
<li><strong>Export Your Data:</strong> You can request a copy of your educational data by contacting your institution\'s administrator</li>
</ul>

<h4>Correction and Updates:</h4>
<ul>
<li><strong>Update Profile:</strong> You can update your profile information (name, picture, contact details) within the app or through the Moodle web interface</li>
<li><strong>Correct Inaccuracies:</strong> You can request corrections to inaccurate data by contacting your teacher or institution administrator</li>
</ul>

<h4>Deletion:</h4>
<ul>
<li><strong>Delete Local Data:</strong> You can delete locally cached data by logging out of the app or uninstalling it</li>
<li><strong>Delete Account:</strong> You can request deletion of your Moodle account and all associated data by contacting Aspire School administration at <strong>privacy@aspireschool.org</strong></li>
<li><strong>Retention Requirements:</strong> Some educational records may be retained according to legal requirements and institutional policies</li>
</ul>

<h4>Control Over Data Collection:</h4>
<ul>
<li><strong>Opt-Out of Push Notifications:</strong> You can disable push notifications in your device settings or within the app preferences</li>
<li><strong>Revoke Permissions:</strong> You can revoke camera, microphone, location, and other permissions through your device settings</li>
<li><strong>Offline Mode:</strong> You can use the app in offline mode to limit data synchronization</li>
<li><strong>Delete App:</strong> You can uninstall the app at any time, which will remove all locally stored data</li>
</ul>

<h4>Parental Rights (For Students Under 18):</h4>
<ul>
<li>Parents/guardians have the right to access, review, and request deletion of their child\'s educational data</li>
<li>Parents can contact the school administration to exercise these rights</li>
</ul>

<p><strong>To exercise any of these rights, please contact:</strong> <a href="mailto:privacy@aspireschool.org">privacy@aspireschool.org</a></p>';

$string['section_datasharing_desc'] = '<p>We take your privacy seriously. Here is how we handle data sharing:</p>

<h4>We DO Share Data With:</h4>
<ul>
<li><strong>Moodle Server:</strong> All educational data is shared with the Aspire School Moodle platform at learn.aspireschool.org (this is required for the app to function)</li>
<li><strong>Your Teachers and School Staff:</strong> Teachers, administrators, and authorized school staff can access your educational data according to their roles and responsibilities</li>
<li><strong>Firebase Cloud Messaging:</strong> Device tokens and notification content are shared with Google FCM solely for delivering push notifications</li>
<li><strong>Parents/Guardians:</strong> If you are a student, your educational data may be accessible to your parents/guardians as configured by the school</li>
</ul>

<h4>We DO NOT:</h4>
<ul>
<li>Sell your personal information to third parties</li>
<li>Share your data with advertisers or marketing companies</li>
<li>Use your data for commercial purposes unrelated to education</li>
<li>Share your data with analytics or tracking services (analytics are disabled)</li>
<li>Provide your data to third parties without your consent, except as required by law</li>
</ul>

<h4>Legal Disclosure:</h4>
<p>We may disclose your information if required to do so by law or in response to:</p>
<ul>
<li>Valid legal processes (subpoenas, court orders)</li>
<li>Requests from law enforcement or government authorities</li>
<li>Protection of rights, property, or safety of Aspire School, students, or others</li>
<li>Compliance with educational regulations and reporting requirements</li>
</ul>';

$string['section_dataretention_desc'] = '<h4>How Long We Keep Your Data:</h4>

<p><strong>While You Are Enrolled:</strong></p>
<ul>
<li>Your educational data is retained on the Moodle server for the duration of your enrollment at Aspire School</li>
<li>Active course data, grades, and submissions are available throughout the academic year</li>
</ul>

<p><strong>After You Leave or Graduate:</strong></p>
<ul>
<li>Educational records are retained according to Aspire School\'s record retention policy and applicable legal requirements</li>
<li>Typically, transcripts and certain academic records are retained permanently or for many years as required by educational regulations</li>
<li>Some course content and submissions may be archived or deleted after a retention period</li>
</ul>

<p><strong>Local Device Data:</strong></p>
<ul>
<li>Data cached on your device is retained until you log out, clear the app cache, or uninstall the app</li>
<li>Local data does not persist after uninstallation</li>
</ul>

<p><strong>Account Deletion:</strong></p>
<ul>
<li>If you request account deletion, your personal information will be removed from active systems</li>
<li>However, some educational records may be retained in archived form to comply with legal requirements</li>
<li>To request account deletion, contact: <a href="mailto:privacy@aspireschool.org">privacy@aspireschool.org</a></li>
</ul>';

$string['section_children_desc'] = '<p>The Aspire School app is designed for educational use by students, including minors under the age of 18.</p>

<h4>Compliance with Children\'s Privacy Laws:</h4>
<ul>
<li>We comply with the Children\'s Online Privacy Protection Act (COPPA) and other applicable children\'s privacy laws</li>
<li>We only collect, use, and disclose student information for educational purposes authorized by the school</li>
<li>We do not use student data for targeted advertising or marketing</li>
</ul>

<h4>Parental Consent and Rights:</h4>
<ul>
<li>The school obtains appropriate consent from parents/guardians as required by law before students use the app</li>
<li>Parents have the right to review their child\'s educational data</li>
<li>Parents can request deletion of their child\'s data by contacting the school administration</li>
<li>Parents can contact <a href="mailto:privacy@aspireschool.org">privacy@aspireschool.org</a> for any privacy-related questions or concerns</li>
</ul>

<h4>Student Data Protection:</h4>
<ul>
<li>Student data is protected with the same security measures as adult user data</li>
<li>Access to student data is restricted to authorized educational personnel</li>
<li>We do not require students to provide more information than is reasonably necessary for educational purposes</li>
</ul>';

$string['section_changes_desc'] = '<p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.</p>

<h4>How We Notify You:</h4>
<ul>
<li><strong>Significant Changes:</strong> If we make significant changes to how we collect, use, or share your data, we will notify you through the app, email, or a notice on the Moodle website</li>
<li><strong>Review Period:</strong> You will have an opportunity to review changes before they take effect</li>
<li><strong>Continued Use:</strong> Your continued use of the app after changes take effect constitutes acceptance of the updated Privacy Policy</li>
</ul>

<h4>Staying Informed:</h4>
<ul>
<li>The "Last Updated" date at the bottom of this policy indicates when it was last revised</li>
<li>We encourage you to review this Privacy Policy periodically</li>
<li>You can always find the current policy at: <strong>https://learn.aspireschool.org/local/privacypolicy/privacy.php</strong></li>
</ul>';

$string['section_contact_desc'] = '<p>If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact us:</p>

<h4>Privacy Contact:</h4>
<ul>
<li><strong>Email:</strong> <a href="mailto:privacy@aspireschool.org">privacy@aspireschool.org</a></li>
<li><strong>Institution:</strong> Aspire School - Contact the IT department or administration</li>
<li><strong>Moodle Site:</strong> <a href="https://learn.aspireschool.org" target="_blank">learn.aspireschool.org</a></li>
<li><strong>App Support:</strong> Use the help section within the app to submit support requests</li>
</ul>

<h4>Additional Resources:</h4>
<ul>
<li><strong>General Moodle Privacy Information:</strong> <a href="https://moodle.org/privacy/" target="_blank">https://moodle.org/privacy/</a></li>
<li><strong>Aspire School Website:</strong> <a href="https://aspireschool.org" target="_blank">https://aspireschool.org</a></li>
</ul>

<p><strong>Response Time:</strong> We will respond to privacy inquiries within a reasonable timeframe, typically within 30 days.</p>';

$string['lastupdated'] = 'Last updated: {$a}';
$string['effectivedate'] = 'Effective Date: October 27, 2025';
