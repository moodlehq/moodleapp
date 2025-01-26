Project: Force External Browser Opening for Specific Moodle Activities in Mobile App

Goal: Modify the Moodle Mobile app to recognize a custom forceexternal=1 query parameter in activity URLs and open those activities in the system's default external browser instead of the in-app webview.


Phase 1: Implement window.handleLinkExternally

Objective: Create and expose a JavaScript function in the app that can be called by the Moodle plugin to open a URL in the external browser.

Tasks:

Locate window.ts: Open the src/core/singletons/window.ts file in the Moodle Mobile app codebase.

Create handleLinkExternally: Inside the CoreWindow class, add a new static async function called handleLinkExternally that takes a URL string as a parameter. This function will use CoreOpener.openInBrowser(url) to open the URL in the external browser.

// Add this function to CoreWindow class (src/core/singletons/window.ts)
static async handleLinkExternally(url: string): Promise<void> {
    // Force external browser.
    console.log("Opening in external browser using handleLinkExternally", url);
    CoreOpener.openInBrowser(url);
}


Expose handleLinkExternally: In src/app/app.component.ts, add a line to expose this function to the window object so that it can be called from JavaScript code injected by the Moodle plugin.

// In app.component.ts, inside the constructor or an appropriate initialization method:
(window as any).handleLinkExternally = CoreWindow.handleLinkExternally;


Phase 2: Modify CoreWindow.open to Detect forceexternal=1

Objective: Update the app's core URL handling logic to recognize the forceexternal=1 parameter and trigger external browser opening.

Tasks:

Locate CoreWindow.open: In src/core/singletons/window.ts, find the static async open function.

Parse URL and Check Parameter: Inside the open function, add code to parse the URL and check for the forceexternal=1 query parameter. You can use the URL and URLSearchParams APIs for this.

Force External Browser: If the forceexternal parameter is set to '1', call CoreOpener.openInBrowser(url) to open the URL in the external browser and then immediately return from the open function to bypass the rest of the app's default link handling logic.

// Example modification in src/core/singletons/window.ts:
static async open(url: string, name?: string): Promise<void> {
    // ... existing code ...

    // --- START CUSTOM MODIFICATION ---
    const urlObject = new URL(url);
    const forceExternal = urlObject.searchParams.get('forceexternal');

    if (forceExternal === '1') {
        // Force external browser.
        console.log("Opening in external browser because forceexternal=1");
        CoreOpener.openInBrowser(url);
        return; // Bypass default link handling
    }
    // --- END CUSTOM MODIFICATION ---

    // ... rest of the original CoreWindow.open code ...
}


Important Considerations:

Error Handling: Add appropriate error handling and logging to the modified code to help with debugging.

Security: Ensure that the changes do not introduce any security vulnerabilities.

Maintainability: Be aware that these modifications might need to be re-applied when updating to newer versions of the Moodle Mobile app.

Moodle's ModLinksHandlers.handleLink(): The plugin is calling this function as a fallback when window.handleLinkExternally does not exists.

Communication:

The Moodle developer will provide you with the updated observer.php code for the plugin.

The Moodle developer will test the plugin with older versions of the app to ensure the fallback mechanism works.

Coordinate with the Moodle developer for testing and deployment.

This plan focuses solely on the mobile app developer's tasks. By implementing these changes, the Moodle Mobile app should be able to correctly interpret the forceexternal=1 parameter and open the corresponding activities in the external browser, as intended by the plugin.



//The moodle plugin code is below:

<?php
namespace local_forceexternalactivities;

defined('MOODLE_INTERNAL') || die();

use core\event\course_module_viewed;

class observer {
    public static function course_module_viewed(course_module_viewed $event) {
        global $CFG, $PAGE, $USER, $DB;

        // Check if we're on mobile app (Original method)
        error_log("User agent: " . $_SERVER['HTTP_USER_AGENT']);

        if (strpos($_SERVER['HTTP_USER_AGENT'], 'MoodleMobile') === false) {
            error_log("Not mobile app - user agent check");
            return;
        }

        $rules = get_config('local_forceexternalactivities', 'match_rules');
        error_log("Rules: " . $rules);

        $cm = get_coursemodule_from_id('', $event->contextinstanceid, 0, false, MUST_EXIST);
        $idnumber = $cm->idnumber;
        error_log("ID Number from course module: " . $idnumber);

        // If ID is empty, try getting the course module using $event->objectid
        if (empty($idnumber)) {
            error_log("ID Number is empty, trying to get course module using objectid");
            $cm = get_coursemodule_from_id('', $event->objectid, 0, false, MUST_EXIST);
            $idnumber = $cm->idnumber;
            error_log("ID Number from course module (using objectid): " . $idnumber);
        }

        if (!id_matcher::matches_rules($idnumber, $rules)) {
            error_log("ID doesn't match rules");
            return;
        }

        // Get the course module information
        $cm = get_coursemodule_from_id('', $event->objectid, 0, false, MUST_EXIST);

        // Get the activity URL
        $activityUrl = new \moodle_url('/mod/' . $cm->modname . '/view.php', ['id' => $cm->id]);

        // Add a custom parameter to the URL to force external opening
        $activityUrl->param('forceexternal', '1');
        $redirectUrl = $activityUrl->out(false);

        error_log("Redirecting to: " . $redirectUrl);

        // Inject JavaScript to communicate with the modified app
        $PAGE->requires->js_amd_inline("
            require(['mma/mod_links/handlers'], function(ModLinksHandlers) {
                console.log('Calling window.handleLinkExternally() with URL:', '$redirectUrl');
                if (window.handleLinkExternally) {
                    window.handleLinkExternally('$redirectUrl');
                } else {
                    console.log('App does not support custom link handling, using default ModLinksHandlers.handleLink');
                    ModLinksHandlers.handleLink('$redirectUrl');
                }
            });
        ");
    }

    /**
     * Retrieves or generates a user token for the Moodle Mobile app.
     *
     * @param int $userid The user ID.
     * @return object The token object.
     */
    private static function get_user_token($userid) {
        global $DB, $CFG;

        $conditions = [
            'userid' => $userid,
            'tokentype' => EXTERNAL_TOKEN_PERMANENT,
            'contextid' => \context_system::instance()->id
        ];

        if ($existingToken = $DB->get_record('external_tokens', $conditions)) {
            return $existingToken;
        }

        require_once($CFG->dirroot . '/lib/externallib.php');
        $service = $DB->get_record('external_services', ['shortname' => 'moodle_mobile_app']);

        $token = \external_generate_token(
            EXTERNAL_TOKEN_PERMANENT,
            $service,
            $userid,
            \context_system::instance(),
            0,
            ''
        );

        return $DB->get_record('external_tokens', ['token' => $token]);
    }
}




//And below is the output from the plugin when the user accesses a link on the mobile app that must be opened in the system's default browser instead of within the app

[25-Jan-2025 19:58:05 America/Sao_Paulo] ID Number from course module: SWSB4L1
[25-Jan-2025 19:58:05 America/Sao_Paulo] Redirecting to: https://imagineingles.com/lms/mod/quiz/view.php?id=673&forceexternal=1



//file moodletree.md has the entire moodle mobile app codebase tree. Use it to know where every file is located.
