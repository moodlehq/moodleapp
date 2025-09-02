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

namespace local_aspireparent\external;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/lib/externallib.php');
require_once($CFG->dirroot . '/course/lib.php');

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use context_system;
use context_user;
use context_course;

/**
 * External function to get mentee courses
 */
class get_mentee_courses extends external_api {
    
    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters(
            array(
                'userid' => new external_value(PARAM_INT, 'The mentee user id to get courses for', VALUE_REQUIRED),
                'returnusercount' => new external_value(PARAM_BOOL, 'Whether to return user count', VALUE_DEFAULT, false),
                'moodlewssettingfileurl' => new external_value(PARAM_BOOL, 'Whether to return file URLs', VALUE_DEFAULT, true),
                'moodlewssettingfilter' => new external_value(PARAM_BOOL, 'Whether to filter text', VALUE_DEFAULT, true),
            )
        );
    }
    
    /**
     * Returns description of method result value
     * @return external_multiple_structure
     */
    public static function execute_returns() {
        return new external_multiple_structure(
            new external_single_structure(
                array(
                    'id' => new external_value(PARAM_INT, 'course id'),
                    'shortname' => new external_value(PARAM_TEXT, 'course short name'),
                    'fullname' => new external_value(PARAM_TEXT, 'course full name'),
                    'displayname' => new external_value(PARAM_TEXT, 'course display name'),
                    'enrolledusercount' => new external_value(PARAM_INT, 'number of enrolled users', VALUE_OPTIONAL),
                    'idnumber' => new external_value(PARAM_RAW, 'course id number', VALUE_OPTIONAL),
                    'visible' => new external_value(PARAM_INT, 'course visible', VALUE_OPTIONAL),
                    'summary' => new external_value(PARAM_RAW, 'course summary', VALUE_OPTIONAL),
                    'summaryformat' => new external_value(PARAM_INT, 'summary format', VALUE_OPTIONAL),
                    'format' => new external_value(PARAM_PLUGIN, 'course format', VALUE_OPTIONAL),
                    'showgrades' => new external_value(PARAM_BOOL, 'show grades', VALUE_OPTIONAL),
                    'lang' => new external_value(PARAM_LANG, 'course language', VALUE_OPTIONAL),
                    'enablecompletion' => new external_value(PARAM_BOOL, 'enable completion', VALUE_OPTIONAL),
                    'completionhascriteria' => new external_value(PARAM_BOOL, 'completion has criteria', VALUE_OPTIONAL),
                    'completionusertracked' => new external_value(PARAM_BOOL, 'completion user tracked', VALUE_OPTIONAL),
                    'category' => new external_value(PARAM_INT, 'course category', VALUE_OPTIONAL),
                    'progress' => new external_value(PARAM_FLOAT, 'course progress', VALUE_OPTIONAL),
                    'completed' => new external_value(PARAM_BOOL, 'course completed', VALUE_OPTIONAL),
                    'startdate' => new external_value(PARAM_INT, 'course start date', VALUE_OPTIONAL),
                    'enddate' => new external_value(PARAM_INT, 'course end date', VALUE_OPTIONAL),
                    'marker' => new external_value(PARAM_INT, 'course marker', VALUE_OPTIONAL),
                    'lastaccess' => new external_value(PARAM_INT, 'last access', VALUE_OPTIONAL),
                    'isfavourite' => new external_value(PARAM_BOOL, 'is favourite', VALUE_OPTIONAL),
                    'hidden' => new external_value(PARAM_BOOL, 'is hidden', VALUE_OPTIONAL),
                    'overviewfiles' => new external_multiple_structure(
                        new external_single_structure(
                            array(
                                'filename' => new external_value(PARAM_FILE, 'file name'),
                                'fileurl' => new external_value(PARAM_URL, 'file url'),
                                'filesize' => new external_value(PARAM_INT, 'file size', VALUE_OPTIONAL),
                                'filepath' => new external_value(PARAM_PATH, 'file path', VALUE_OPTIONAL),
                                'mimetype' => new external_value(PARAM_RAW, 'mime type', VALUE_OPTIONAL),
                                'timemodified' => new external_value(PARAM_INT, 'time modified', VALUE_OPTIONAL),
                            )
                        ), 'course overview files', VALUE_OPTIONAL
                    ),
                )
            )
        );
    }
    
    /**
     * Get courses for a mentee user
     * @param int $userid The mentee user id
     * @param bool $returnusercount Whether to return user count
     * @param bool $moodlewssettingfileurl Whether to return file URLs
     * @param bool $moodlewssettingfilter Whether to filter text
     * @return array List of courses
     */
    public static function execute($userid, $returnusercount = false, $moodlewssettingfileurl = true, $moodlewssettingfilter = true) {
        global $DB, $USER, $CFG;
        
        $params = self::validate_parameters(self::execute_parameters(), array(
            'userid' => $userid,
            'returnusercount' => $returnusercount,
            'moodlewssettingfileurl' => $moodlewssettingfileurl,
            'moodlewssettingfilter' => $moodlewssettingfilter
        ));
        $userid = $params['userid'];
        
        // Validate context
        $context = context_system::instance();
        self::validate_context($context);
        
        // Debug logging
        error_log('local_aspireparent_get_mentee_courses: Request for user ' . $userid . ' by user ' . $USER->id);
        error_log('local_aspireparent_get_mentee_courses: Is logged in as: ' . (\core\session\manager::is_loggedinas() ? 'YES' : 'NO'));
        if (\core\session\manager::is_loggedinas()) {
            error_log('local_aspireparent_get_mentee_courses: Real user ID: ' . $USER->realuserid);
        }
        
        // If logged in as another user, check permissions using the real user
        $checkuserid = $USER->id;
        if (\core\session\manager::is_loggedinas() && isset($USER->realuserid)) {
            $checkuserid = $USER->realuserid;
            error_log('local_aspireparent_get_mentee_courses: Using real user ID ' . $checkuserid . ' for permission check');
        }
        
        // Check if current user (or real user if logged in as) is a parent of the requested user
        $sql = "SELECT DISTINCT u.id
                FROM {role_assignments} ra
                JOIN {context} c ON ra.contextid = c.id
                JOIN {user} u ON c.instanceid = u.id
                WHERE ra.userid = :parentid
                AND c.contextlevel = :contextlevel
                AND u.id = :menteeid";
        
        $params = array(
            'parentid' => $checkuserid,
            'contextlevel' => CONTEXT_USER,
            'menteeid' => $userid
        );
        
        $ismentee = $DB->record_exists_sql($sql, $params);
        
        // Debug logging
        error_log('local_aspireparent_get_mentee_courses: Checking access for user ' . $checkuserid . ' to view mentee ' . $userid . ' courses');
        error_log('local_aspireparent_get_mentee_courses: Is mentee relationship: ' . ($ismentee ? 'YES' : 'NO'));
        
        // Allow access if:
        // 1. Viewing own courses
        // 2. Parent viewing mentee's courses
        // 3. Logged in as the user being viewed
        // 4. Has capability to view user details
        if ($userid != $USER->id && 
            !$ismentee && 
            !(\core\session\manager::is_loggedinas() && $USER->id == $userid) &&
            !has_capability('moodle/user:viewdetails', $context)) {
            throw new \moodle_exception('nopermissions', 'error', '', 'view this users courses');
        }
        
        // Check if we're logged in as the user we're trying to view
        if (\core\session\manager::is_loggedinas() && $USER->id == $userid) {
            // We're logged in as this user, just use the standard function
            error_log('local_aspireparent_get_mentee_courses: Logged in as user ' . $userid . ', using standard function');
            $courses = enrol_get_users_courses($userid, true, null, 'fullname ASC');
            error_log('local_aspireparent_get_mentee_courses: Standard function returned ' . count($courses) . ' courses');
        }
        // For parent viewing mentee, get courses directly from enrollments
        else if ($userid != $USER->id && $ismentee) {
            error_log('local_aspireparent_get_mentee_courses: Parent viewing mentee courses - using direct enrollment query');
            
            // Get all courses the mentee is enrolled in
            $sql = "SELECT DISTINCT c.*
                    FROM {course} c
                    JOIN {enrol} e ON e.courseid = c.id
                    JOIN {user_enrolments} ue ON ue.enrolid = e.id
                    WHERE ue.userid = :userid
                    AND e.status = 0
                    AND ue.status = 0
                    ORDER BY c.fullname";
            
            $courses = $DB->get_records_sql($sql, ['userid' => $userid]);
            error_log('local_aspireparent_get_mentee_courses: Direct query found ' . count($courses) . ' courses for mentee');
            
            // If no courses found, check all enrollments without status filters
            if (count($courses) == 0) {
                error_log('local_aspireparent_get_mentee_courses: No active enrollments found, checking all enrollments...');
                $allEnrollmentsSql = "SELECT c.id, c.fullname, e.enrol, e.status as enrol_status, ue.status as user_status
                        FROM {course} c
                        JOIN {enrol} e ON e.courseid = c.id
                        JOIN {user_enrolments} ue ON ue.enrolid = e.id
                        WHERE ue.userid = :userid";
                
                $allEnrollments = $DB->get_records_sql($allEnrollmentsSql, ['userid' => $userid]);
                error_log('local_aspireparent_get_mentee_courses: Total enrollments (including inactive): ' . count($allEnrollments));
                
                foreach ($allEnrollments as $enrollment) {
                    error_log('local_aspireparent_get_mentee_courses: Enrollment - Course ' . $enrollment->id . 
                             ' (' . $enrollment->fullname . ') via ' . $enrollment->enrol . 
                             ', enrol_status: ' . $enrollment->enrol_status . 
                             ', user_status: ' . $enrollment->user_status);
                }
                
                // Try without status checks
                $sql = "SELECT DISTINCT c.*
                        FROM {course} c
                        JOIN {enrol} e ON e.courseid = c.id
                        JOIN {user_enrolments} ue ON ue.enrolid = e.id
                        WHERE ue.userid = :userid
                        ORDER BY c.fullname";
                
                $courses = $DB->get_records_sql($sql, ['userid' => $userid]);
                error_log('local_aspireparent_get_mentee_courses: Without status filters, found ' . count($courses) . ' courses');
            }
            
            // Log details about each course
            foreach ($courses as $course) {
                error_log('local_aspireparent_get_mentee_courses: Course ' . $course->id . ' - ' . $course->fullname);
            }
        } else {
            // Get user's courses normally
            $courses = enrol_get_users_courses($userid, true, null, 'fullname ASC');
            error_log('local_aspireparent_get_mentee_courses: Found ' . count($courses) . ' courses for user ' . $userid);
        }
        
        $result = array();
        foreach ($courses as $course) {
            $coursecontext = context_course::instance($course->id);
            
            // For parents viewing mentee courses, always allow access
            if ($userid != $USER->id && $ismentee) {
                // Parent viewing mentee's course - allow without access check
                error_log('local_aspireparent_get_mentee_courses: Parent viewing mentee course ' . $course->id . ' (' . $course->fullname . ') - ALLOWING');
            } else if (!can_access_course($course, null, '', true)) {
                // Skip courses the user can't view
                error_log('local_aspireparent_get_mentee_courses: Skipping course ' . $course->id . ' - no access');
                continue;
            }
            
            $coursedata = array(
                'id' => $course->id,
                'shortname' => $course->shortname,
                'fullname' => $course->fullname,
                'displayname' => get_course_display_name_for_list($course),
                'idnumber' => $course->idnumber,
                'visible' => $course->visible,
                'format' => $course->format,
                'showgrades' => $course->showgrades,
                'lang' => $course->lang,
                'enablecompletion' => $course->enablecompletion,
                'category' => $course->category,
                'startdate' => $course->startdate,
                'enddate' => $course->enddate,
            );
            
            // Add enrolled user count if requested
            if ($params['returnusercount']) {
                require_once($CFG->dirroot . '/lib/enrollib.php');
                $coursedata['enrolledusercount'] = count_enrolled_users($coursecontext);
            }
            
            // Add optional summary
            if (!empty($course->summary)) {
                $coursedata['summary'] = $course->summary;
                $coursedata['summaryformat'] = $course->summaryformat;
            }
            
            // Add completion info
            $completion = new \completion_info($course);
            if ($completion->is_enabled()) {
                $coursedata['completionhascriteria'] = $completion->has_criteria();
                $coursedata['completionusertracked'] = $completion->is_tracked_user($userid);
                
                if ($coursedata['completionusertracked']) {
                    $progressdata = $completion->get_progress_all($userid);
                    $progress = 0;
                    if (!empty($progressdata)) {
                        $completed = 0;
                        $total = count($progressdata);
                        foreach ($progressdata as $activity) {
                            if ($activity->completionstate == COMPLETION_COMPLETE || 
                                $activity->completionstate == COMPLETION_COMPLETE_PASS) {
                                $completed++;
                            }
                        }
                        if ($total > 0) {
                            $progress = ($completed / $total) * 100;
                        }
                    }
                    $coursedata['progress'] = $progress;
                    $coursedata['completed'] = ($progress == 100);
                }
            }
            
            // Add last access time
            $lastaccess = $DB->get_field('user_lastaccess', 'timeaccess', 
                array('userid' => $userid, 'courseid' => $course->id));
            if ($lastaccess) {
                $coursedata['lastaccess'] = $lastaccess;
            }
            
            // Add course image files
            $coursefiles = array();
            $fs = get_file_storage();
            $files = $fs->get_area_files($coursecontext->id, 'course', 'overviewfiles', false, 'filename', false);
            
            foreach ($files as $file) {
                $fileurl = \moodle_url::make_webservice_pluginfile_url(
                    $coursecontext->id, 'course', 'overviewfiles', 
                    $file->get_itemid(), $file->get_filepath(), $file->get_filename()
                )->out(false);
                
                $coursefiles[] = array(
                    'filename' => $file->get_filename(),
                    'fileurl' => $fileurl,
                    'filesize' => $file->get_filesize(),
                    'filepath' => $file->get_filepath(),
                    'mimetype' => $file->get_mimetype(),
                    'timemodified' => $file->get_timemodified(),
                );
            }
            
            if (!empty($coursefiles)) {
                $coursedata['overviewfiles'] = $coursefiles;
            }
            
            $result[] = $coursedata;
        }
        
        error_log('local_aspireparent_get_mentee_courses: Returning ' . count($result) . ' courses to app');
        
        return $result;
    }
}