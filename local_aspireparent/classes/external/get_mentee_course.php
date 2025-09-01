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
require_once($CFG->dirroot . '/course/externallib.php');

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use context_course;
use core_course_external;

/**
 * External function to get mentee course details
 */
class get_mentee_course extends external_api {
    
    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters(
            array(
                'courseid' => new external_value(PARAM_INT, 'Course ID'),
                'userid' => new external_value(PARAM_INT, 'The mentee user id', VALUE_DEFAULT, 0),
            )
        );
    }
    
    /**
     * Returns description of method result value
     * @return external_multiple_structure
     */
    public static function execute_returns() {
        return new external_single_structure(
            array(
                'id' => new external_value(PARAM_INT, 'Course id'),
                'shortname' => new external_value(PARAM_TEXT, 'Course short name'),
                'fullname' => new external_value(PARAM_TEXT, 'Course full name'),
                'displayname' => new external_value(PARAM_TEXT, 'Course display name', VALUE_OPTIONAL),
                'idnumber' => new external_value(PARAM_RAW, 'Course id number', VALUE_OPTIONAL),
                'summary' => new external_value(PARAM_RAW, 'Course summary'),
                'summaryformat' => new external_value(PARAM_INT, 'summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN)'),
                'format' => new external_value(PARAM_PLUGIN, 'Course format: weeks, topics, social, site,..', VALUE_OPTIONAL),
                'showgrades' => new external_value(PARAM_INT, '1 if grades are shown, otherwise 0', VALUE_OPTIONAL),
                'newsitems' => new external_value(PARAM_INT, 'Number of recent items appearing on the course page', VALUE_OPTIONAL),
                'startdate' => new external_value(PARAM_INT, 'Timestamp when the course start', VALUE_OPTIONAL),
                'enddate' => new external_value(PARAM_INT, 'Timestamp when the course end', VALUE_OPTIONAL),
                'maxbytes' => new external_value(PARAM_INT, 'Largest size of file that can be uploaded into', VALUE_OPTIONAL),
                'showreports' => new external_value(PARAM_INT, 'Are activity report shown (yes = 1, no =0)', VALUE_OPTIONAL),
                'visible' => new external_value(PARAM_INT, '1: available to student, 0:not available', VALUE_OPTIONAL),
                'groupmode' => new external_value(PARAM_INT, 'No group, separate, visible', VALUE_OPTIONAL),
                'groupmodeforce' => new external_value(PARAM_INT, '1: yes, 0: no', VALUE_OPTIONAL),
                'defaultgroupingid' => new external_value(PARAM_INT, 'Default grouping id', VALUE_OPTIONAL),
                'enablecompletion' => new external_value(PARAM_INT, 'Completion enabled? 1: yes 0: no', VALUE_OPTIONAL),
                'completionnotify' => new external_value(PARAM_INT, '1: yes 0: no', VALUE_OPTIONAL),
                'lang' => new external_value(PARAM_SAFEDIR, 'Course language', VALUE_OPTIONAL),
                'theme' => new external_value(PARAM_THEME, 'Theme', VALUE_OPTIONAL),
                'marker' => new external_value(PARAM_INT, 'Current course marker', VALUE_OPTIONAL),
                'legacyfiles' => new external_value(PARAM_INT, 'If legacy files are enabled', VALUE_OPTIONAL),
                'calendartype' => new external_value(PARAM_PLUGIN, 'Calendar type', VALUE_OPTIONAL),
                'timecreated' => new external_value(PARAM_INT, 'Time when the course was created', VALUE_OPTIONAL),
                'timemodified' => new external_value(PARAM_INT, 'Time when the course was modified', VALUE_OPTIONAL),
                'requested' => new external_value(PARAM_INT, 'Requested', VALUE_OPTIONAL),
                'cacherev' => new external_value(PARAM_INT, 'Cache revision number', VALUE_OPTIONAL),
                'categoryid' => new external_value(PARAM_INT, 'Course category id'),
                'categoryname' => new external_value(PARAM_TEXT, 'Course category name'),
                'sortorder' => new external_value(PARAM_INT, 'Sort order', VALUE_OPTIONAL),
                'overviewfiles' => new external_multiple_structure(
                    \core_external\external_files::get_properties_for_exporter(),
                    'Course overview files', VALUE_OPTIONAL
                ),
                'contacts' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'id' => new external_value(PARAM_INT, 'Contact user id'),
                            'fullname' => new external_value(PARAM_NOTAGS, 'Contact user fullname'),
                        )
                    ),
                    'Course contacts', VALUE_OPTIONAL
                ),
                'enrollmentmethods' => new external_multiple_structure(
                    new external_value(PARAM_PLUGIN, 'enrollment method'),
                    'Enrollment methods list', VALUE_OPTIONAL
                ),
                'customfields' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'name' => new external_value(PARAM_TEXT, 'The name of the custom field'),
                            'shortname' => new external_value(PARAM_ALPHANUMEXT, 'The shortname of the custom field'),
                            'type'  => new external_value(PARAM_COMPONENT, 'The type of the custom field'),
                            'valueraw' => new external_value(PARAM_RAW, 'The raw value of the custom field', VALUE_OPTIONAL),
                            'value' => new external_value(PARAM_RAW, 'The value of the custom field', VALUE_OPTIONAL),
                        )
                    ),
                    'Custom fields and associated values', VALUE_OPTIONAL
                ),
                'showactivitydates' => new external_value(PARAM_BOOL, 'Whether the activity dates are shown or not', VALUE_OPTIONAL),
                'showcompletionconditions' => new external_value(PARAM_BOOL, 'Whether the activity completion conditions are shown or not', VALUE_OPTIONAL),
            )
        );
    }
    
    /**
     * Get course details for a mentee
     * @param int $courseid Course ID
     * @param int $userid The mentee user id (0 for current user)
     * @return array Course details
     */
    public static function execute($courseid, $userid = 0) {
        global $DB, $USER, $CFG;
        
        $params = self::validate_parameters(self::execute_parameters(), array(
            'courseid' => $courseid,
            'userid' => $userid,
        ));
        
        // If userid is 0, use current user
        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }
        
        // Check if this is a parent viewing their mentee's course
        $isparent = false;
        if ($params['userid'] != $USER->id) {
            // Check if current user is a parent of the requested user
            $sql = "SELECT DISTINCT u.id
                    FROM {role_assignments} ra
                    JOIN {context} c ON ra.contextid = c.id
                    JOIN {user} u ON c.instanceid = u.id
                    WHERE ra.userid = :parentid
                    AND c.contextlevel = :contextlevel
                    AND u.id = :menteeid";
            
            $parentparams = array(
                'parentid' => $USER->id,
                'contextlevel' => CONTEXT_USER,
                'menteeid' => $params['userid']
            );
            
            $isparent = $DB->record_exists_sql($sql, $parentparams);
            
            if (!$isparent) {
                // Not a parent - check regular permissions
                $context = context_course::instance($params['courseid']);
                self::validate_context($context);
                require_capability('moodle/course:view', $context);
            }
        }
        
        // For parents viewing mentee courses, we need to get the course differently
        if ($isparent) {
            // Check if the mentee is enrolled in the course
            $enrolled = is_enrolled(context_course::instance($params['courseid']), $params['userid'], '', true);
            if (!$enrolled) {
                throw new \moodle_exception('usernotenrolled', 'error');
            }
            
            // Get course details using the core function but with mentee context
            // We'll need to temporarily switch user context to get proper data
            $olduser = $USER;
            $USER = $DB->get_record('user', array('id' => $params['userid']), '*', MUST_EXIST);
            
            try {
                // Get the course data
                $courses = \core_course_external::get_courses_by_field('id', $params['courseid']);
                
                if (empty($courses['courses'])) {
                    throw new \moodle_exception('coursenotfound', 'error');
                }
                
                $course = reset($courses['courses']);
                
                // Ensure course is marked as visible for parent
                $course['visible'] = 1;
                
                // Add parent view indicator
                $course['parentview'] = true;
                
                // Restore original user
                $USER = $olduser;
                
                return $course;
            } catch (\Exception $e) {
                // Restore original user on error
                $USER = $olduser;
                throw $e;
            }
        } else {
            // Regular user viewing their own course
            $courses = \core_course_external::get_courses_by_field('id', $params['courseid']);
            
            if (empty($courses['courses'])) {
                throw new \moodle_exception('coursenotfound', 'error');
            }
            
            return reset($courses['courses']);
        }
    }
}