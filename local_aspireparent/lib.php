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
 * Library functions for the aspireparent local plugin.
 *
 * @package    local_aspireparent
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Serve the files from the local_aspireparent file areas.
 *
 * @param stdClass $course the course object
 * @param stdClass $cm the course module object
 * @param stdClass $context the context
 * @param string $filearea the name of the file area
 * @param array $args extra arguments (itemid, path)
 * @param bool $forcedownload whether or not force download
 * @param array $options additional options affecting the file serving
 * @return bool false if the file not found, just send the file otherwise and do not return anything
 */
function local_aspireparent_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload, array $options=array()) {
    global $DB, $USER;
    
    // Check if this is a parent trying to access their mentee's files
    if ($context->contextlevel == CONTEXT_COURSE) {
        // Get the mentee ID from the request if available
        $menteeid = optional_param('menteeid', 0, PARAM_INT);
        
        if ($menteeid && local_aspireparent_is_parent_of($USER->id, $menteeid)) {
            // Parent is accessing their mentee's files
            // We need to check if the mentee has access to this file
            $menteecontext = context_user::instance($menteeid);
            
            // Temporarily switch to mentee context for file access check
            $olduser = $USER;
            $USER = $DB->get_record('user', array('id' => $menteeid));
            
            // Let Moodle handle the file serving with mentee's permissions
            $result = false;
            try {
                // Try to serve the file as the mentee
                require_course_login($course, true, $cm, false, true);
                $result = true;
            } catch (Exception $e) {
                // Mentee doesn't have access
                $result = false;
            } finally {
                // Restore original user
                $USER = $olduser;
            }
            
            return $result;
        }
    }
    
    return false; // File not found or access denied
}

/**
 * Check if a user is a parent of a specific mentee.
 *
 * @param int $parentid The parent user ID
 * @param int $menteeid The mentee user ID
 * @return bool True if parent of mentee
 */
function local_aspireparent_is_parent_of($parentid, $menteeid) {
    global $DB;
    
    // Check if parent has role assignment in mentee's user context
    $menteecontext = context_user::instance($menteeid);
    
    $sql = "SELECT COUNT(*)
            FROM {role_assignments} ra
            JOIN {role} r ON r.id = ra.roleid
            WHERE ra.userid = :parentid
            AND ra.contextid = :contextid
            AND r.shortname = 'parent'";
    
    $count = $DB->count_records_sql($sql, [
        'parentid' => $parentid,
        'contextid' => $menteecontext->id
    ]);
    
    return $count > 0;
}

/**
 * Get mentees for a parent user.
 *
 * @param int $parentid The parent user ID
 * @return array Array of mentee user objects
 */
function local_aspireparent_get_mentees($parentid) {
    global $DB;
    
    $sql = "SELECT u.*
            FROM {user} u
            JOIN {role_assignments} ra ON ra.contextid = (
                SELECT ctx.id FROM {context} ctx 
                WHERE ctx.instanceid = u.id 
                AND ctx.contextlevel = :contextlevel
            )
            JOIN {role} r ON r.id = ra.roleid
            WHERE ra.userid = :parentid
            AND r.shortname = 'parent'";
    
    $params = [
        'parentid' => $parentid,
        'contextlevel' => CONTEXT_USER
    ];
    
    return $DB->get_records_sql($sql, $params);
}

/**
 * Check if a user is a parent.
 *
 * @param int $userid The user ID
 * @return bool True if user is a parent
 */
function local_aspireparent_is_parent($userid) {
    global $DB;
    
    // Check if user has parent role assignments
    $sql = "SELECT COUNT(*)
            FROM {role_assignments} ra
            JOIN {role} r ON r.id = ra.roleid
            JOIN {context} ctx ON ctx.id = ra.contextid
            WHERE ra.userid = :userid
            AND r.shortname = 'parent'
            AND ctx.contextlevel = :contextlevel";
    
    $count = $DB->count_records_sql($sql, [
        'userid' => $userid,
        'contextlevel' => CONTEXT_USER
    ]);
    
    return $count > 0;
}

/**
 * Check if a parent has permission to view a course through their mentee.
 *
 * @param int $parentid The parent user ID
 * @param int $courseid The course ID
 * @return bool True if parent can view course
 */
function local_aspireparent_can_view_course($parentid, $courseid) {
    global $DB;
    
    // Get all mentees for this parent
    $mentees = local_aspireparent_get_mentees($parentid);
    
    // Check if any mentee is enrolled in the course
    foreach ($mentees as $mentee) {
        if (is_enrolled(context_course::instance($courseid), $mentee)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Hook to check file access for parents.
 * This function is called by Moodle's file serving mechanism.
 *
 * @param stdClass $course Course object
 * @param stdClass $cm Course module object
 * @param context $context The context
 * @param string $filearea File area
 * @param array $args Extra arguments
 * @param bool $forcedownload Whether to force download
 * @param array $options Additional options
 * @return bool True if access is allowed
 */
function local_aspireparent_check_file_access($course, $cm, $context, $filearea, $args, $forcedownload, $options) {
    global $USER;
    
    // Check if current user is a parent
    if (!local_aspireparent_is_parent($USER->id)) {
        return false; // Let normal access control handle it
    }
    
    // Check if parent has access to this course through their mentees
    if ($context->contextlevel == CONTEXT_COURSE || $context->contextlevel == CONTEXT_MODULE) {
        $courseid = $course->id;
        if (local_aspireparent_can_view_course($USER->id, $courseid)) {
            // Parent has access through their mentee
            // For course files, allow read access
            return true;
        }
    }
    
    return false;
}