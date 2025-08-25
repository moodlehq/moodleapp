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
require_once($CFG->dirroot . '/grade/lib.php');
require_once($CFG->dirroot . '/grade/querylib.php');

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use context_course;
use context_user;
use context_system;

/**
 * External function to get all course grades including courses with showgrades disabled
 */
class get_all_course_grades extends external_api {
    
    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters(
            array(
                'userid' => new external_value(PARAM_INT, 'The user id (0 for current user)', VALUE_DEFAULT, 0),
            )
        );
    }
    
    /**
     * Returns description of method result value
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure(
            array(
                'grades' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'courseid' => new external_value(PARAM_INT, 'Course ID'),
                            'grade' => new external_value(PARAM_TEXT, 'Grade formatted'),
                            'rawgrade' => new external_value(PARAM_TEXT, 'Raw grade'),
                            'rank' => new external_value(PARAM_INT, 'Rank in course', VALUE_OPTIONAL),
                            'showgrades' => new external_value(PARAM_BOOL, 'Whether grades are shown for this course'),
                        )
                    )
                ),
                'warnings' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'item' => new external_value(PARAM_TEXT, 'Item'),
                            'itemid' => new external_value(PARAM_INT, 'Item ID'),
                            'warningcode' => new external_value(PARAM_ALPHANUM, 'Warning code'),
                            'message' => new external_value(PARAM_TEXT, 'Warning message')
                        )
                    ), 'List of warnings', VALUE_OPTIONAL
                )
            )
        );
    }
    
    /**
     * Get all course grades for a user including courses with showgrades disabled
     * @param int $userid The user id (0 for current user)
     * @return array Grades information
     */
    public static function execute($userid = 0) {
        global $DB, $USER, $CFG;
        
        $params = self::validate_parameters(self::execute_parameters(), array(
            'userid' => $userid
        ));
        
        // If userid is 0, use current user
        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }
        
        $userid = $params['userid'];
        
        // Validate context
        $systemcontext = context_system::instance();
        self::validate_context($systemcontext);
        
        // Check permissions
        if ($USER->id != $userid) {
            // Check if viewing another user - need appropriate permissions
            $user = \core_user::get_user($userid, '*', MUST_EXIST);
            \core_user::require_active_user($user);
            
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
                'menteeid' => $userid
            );
            
            $isparent = $DB->record_exists_sql($sql, $parentparams);
            
            if (!$isparent && !has_capability('moodle/grade:viewall', $systemcontext)) {
                throw new \moodle_exception('nopermissions', 'error', '', 'view user grades');
            }
        }
        
        // Get all enrolled courses for the user
        $courses = enrol_get_users_courses($userid, true, null, 'fullname ASC');
        
        $grades = array();
        
        foreach ($courses as $course) {
            $coursecontext = context_course::instance($course->id);
            
            // Check if user can view this course
            if (!$course->visible && !has_capability('moodle/course:viewhiddencourses', $coursecontext)) {
                continue;
            }
            
            // Get course grade item
            $grade_item = \grade_item::fetch_course_item($course->id);
            
            if ($grade_item) {
                $grade = new \grade_grade(array('itemid' => $grade_item->id, 'userid' => $userid));
                
                $course_grade = array(
                    'courseid' => $course->id,
                    'grade' => '-',
                    'rawgrade' => '',
                    'showgrades' => $course->showgrades ? true : false
                );
                
                if (!empty($grade->id)) {
                    // Get the final grade
                    $finalgrade = $grade->finalgrade;
                    $grademax = $grade_item->grademax;
                    $grademin = $grade_item->grademin;
                    
                    if (!is_null($finalgrade)) {
                        // Format the grade
                        $course_grade['rawgrade'] = format_float($finalgrade, 2, true, true);
                        
                        // Calculate percentage if possible
                        if ($grademax > $grademin) {
                            $percentage = (($finalgrade - $grademin) / ($grademax - $grademin)) * 100;
                            $course_grade['grade'] = format_float($percentage, 2, true, true) . '%';
                        } else {
                            $course_grade['grade'] = $course_grade['rawgrade'];
                        }
                        
                        // Get rank if available and grades are shown
                        if ($course->showgrades && !$grade_item->is_hidden()) {
                            // Calculate rank manually since grade_get_rank might not be available
                            $sql = "SELECT COUNT(DISTINCT(userid))
                                    FROM {grade_grades}
                                    WHERE finalgrade IS NOT NULL AND finalgrade > ?
                                    AND itemid = ?";
                            $rank = $DB->count_records_sql($sql, array($finalgrade, $grade_item->id)) + 1;
                            if ($rank) {
                                $course_grade['rank'] = $rank;
                            }
                        }
                    }
                }
                
                $grades[] = $course_grade;
            }
        }
        
        return array(
            'grades' => $grades,
            'warnings' => array()
        );
    }
}