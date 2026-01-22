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
 * Custom file serving for App Links course - bypasses enrollment check.
 * Only serves files from the designated App Links course.
 * Supports both session and token authentication for mobile app.
 *
 * @package    local_aspireparent
 * @copyright  2024 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Disable moodle specific debug messages and any errors in output.
define('NO_DEBUG_DISPLAY', true);
// Allow token-based authentication.
define('NO_MOODLE_COOKIES', true);

require_once('../../config.php');
require_once($CFG->libdir . '/filelib.php');
require_once($CFG->libdir . '/externallib.php');

// App Links course ID - must match the one in get_app_links.php
define('APP_LINKS_COURSE_ID', 1030);

// Get parameters.
$contextid = required_param('contextid', PARAM_INT);
$component = required_param('component', PARAM_COMPONENT);
$filearea = required_param('filearea', PARAM_AREA);
$itemid = required_param('itemid', PARAM_INT);
$filepath = optional_param('filepath', '/', PARAM_PATH);
$filename = required_param('filename', PARAM_FILE);
$forcedownload = optional_param('forcedownload', 0, PARAM_BOOL);
$token = optional_param('token', '', PARAM_ALPHANUM);

// Authenticate user - either via token or session.
if (!empty($token)) {
    // Token-based authentication for mobile app.
    $tokenrecord = $DB->get_record('external_tokens', ['token' => $token]);
    if (!$tokenrecord) {
        header('HTTP/1.0 403 Forbidden');
        die('Invalid token');
    }

    // Check token hasn't expired.
    if ($tokenrecord->validuntil && $tokenrecord->validuntil < time()) {
        header('HTTP/1.0 403 Forbidden');
        die('Token expired');
    }

    // Set the user.
    $USER = $DB->get_record('user', ['id' => $tokenrecord->userid], '*', MUST_EXIST);
    \core\session\manager::set_user($USER);
} else {
    // Session-based authentication.
    require_login();
}

// Get context info.
$context = context::instance_by_id($contextid, MUST_EXIST);

// Security check: Only allow files from the App Links course.
// Get the course context to verify this file belongs to our special course.
$coursecontext = null;
if ($context->contextlevel == CONTEXT_MODULE) {
    $coursecontext = $context->get_parent_context();
} else if ($context->contextlevel == CONTEXT_COURSE) {
    $coursecontext = $context;
}

if (!$coursecontext || $coursecontext->contextlevel != CONTEXT_COURSE) {
    send_file_not_found();
}

// Get the course ID from the context.
$courseid = $coursecontext->instanceid;

// Only allow files from the App Links course.
if ($courseid != APP_LINKS_COURSE_ID) {
    send_file_not_found();
}

// Only allow specific components (mod_resource, mod_folder).
$allowed_components = ['mod_resource', 'mod_folder'];
if (!in_array($component, $allowed_components)) {
    send_file_not_found();
}

// Only allow content filearea.
if ($filearea !== 'content') {
    send_file_not_found();
}

// Get the file.
$fs = get_file_storage();
$file = $fs->get_file($contextid, $component, $filearea, $itemid, $filepath, $filename);

if (!$file || $file->is_directory()) {
    send_file_not_found();
}

// Serve the file.
send_stored_file($file, 0, 0, $forcedownload, ['filename' => $filename]);
