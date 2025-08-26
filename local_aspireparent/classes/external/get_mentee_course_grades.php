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
require_once($CFG->dirroot . '/grade/report/user/lib.php');

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use context_course;
use context_user;
use context_system;

/**
 * External function to get mentee course grades overview
 */
class get_mentee_course_grades extends external_api {
    
    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters(
            array(
                'menteeid' => new external_value(PARAM_INT, 'The mentee user id'),
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
     * Get course grades overview for a mentee
     * @param int $menteeid The mentee user id
     * @return array Grades information
     */
    public static function execute($menteeid) {
        global $DB, $USER, $CFG;
        
        $params = self::validate_parameters(self::execute_parameters(), array(
            'menteeid' => $menteeid
        ));
        
        // Validate context
        $context = context_system::instance();
        self::validate_context($context);
        
        // BYPASSING ALL PERMISSION CHECKS AS REQUESTED
        error_log('[get_mentee_course_grades] Bypassing permission checks for user ' . $USER->id . ' viewing mentee ' . $params['menteeid']);
        
        // Get ALL courses where the mentee has grades, regardless of enrollment status
        $sql = "SELECT DISTINCT c.*
                FROM {course} c
                JOIN {grade_items} gi ON gi.courseid = c.id
                JOIN {grade_grades} gg ON gg.itemid = gi.id
                WHERE gg.userid = :userid
                AND c.visible = 1
                ORDER BY c.fullname ASC";
        
        $courses = $DB->get_records_sql($sql, array('userid' => $params['menteeid']));
        
        // If no courses with grades, try enrolled courses
        if (empty($courses)) {
            error_log('[get_mentee_course_grades] No courses with grades found, trying enrolled courses');
            $courses = enrol_get_users_courses($params['menteeid'], false, null, 'fullname ASC');
        }
        
        error_log('[get_mentee_course_grades] Fetching grades for mentee ID: ' . $params['menteeid']);
        error_log('[get_mentee_course_grades] Number of courses found: ' . count($courses));
        error_log('[get_mentee_course_grades] Current user ID: ' . $USER->id);
        
        if (!empty($courses)) {
            $course_ids = array_map(function($c) { return $c->id; }, $courses);
            error_log('[get_mentee_course_grades] Course IDs: ' . implode(', ', $course_ids));
        }
        
        $grades = array();
        
        foreach ($courses as $course) {
            error_log('[get_mentee_course_grades] Processing course ID: ' . $course->id . ' - ' . $course->fullname);
            
            // Always add the course, even if no grade item exists
            $course_grade = array(
                'courseid' => $course->id,
                'grade' => '-',
                'rawgrade' => ''
            );
            
            // Get course grade item directly - simpler approach
            $grade_item = \grade_item::fetch_course_item($course->id);
            
            if ($grade_item) {
                error_log('[get_mentee_course_grades] Found grade item for course ' . $course->id);
                
                // Fetch the grade for this user
                $grade = \grade_grade::fetch(array('itemid' => $grade_item->id, 'userid' => $params['menteeid']));
                
                if ($grade && !is_null($grade->finalgrade)) {
                    $finalgrade = $grade->finalgrade;
                    $grademax = $grade_item->grademax;
                    $grademin = $grade_item->grademin;
                    
                    error_log('[get_mentee_course_grades] Found grade for course ' . $course->id . ': ' . $finalgrade);
                    
                    // Format the grade
                    $course_grade['rawgrade'] = format_float($finalgrade, 2, true, true);
                    
                    // Calculate percentage
                    if ($grademax > $grademin) {
                        $percentage = (($finalgrade - $grademin) / ($grademax - $grademin)) * 100;
                        $course_grade['grade'] = format_float($percentage, 2, true, true) . '%';
                    } else {
                        $course_grade['grade'] = $course_grade['rawgrade'];
                    }
                    
                    // Get rank if available
                    $sql = "SELECT COUNT(DISTINCT(userid))
                            FROM {grade_grades}
                            WHERE finalgrade IS NOT NULL AND finalgrade > ?
                            AND itemid = ?";
                    $rank = $DB->count_records_sql($sql, array($finalgrade, $grade_item->id)) + 1;
                    if ($rank) {
                        $course_grade['rank'] = $rank;
                    }
                    
                    error_log('[get_mentee_course_grades] Course ' . $course->id . ' formatted grade: ' . $course_grade['grade']);
                } else {
                    error_log('[get_mentee_course_grades] No grade found for course ' . $course->id . ' and user ' . $params['menteeid']);
                    // Check if grade record exists but finalgrade is null
                    if ($grade) {
                        error_log('[get_mentee_course_grades] Grade record exists but finalgrade is null');
                    }
                }
            } else {
                error_log('[get_mentee_course_grades] No grade item found for course ' . $course->id);
            }
            
            // Always add the course to the results
            $grades[] = $course_grade;
        }
        
        error_log('[get_mentee_course_grades] Total grades to return: ' . count($grades));
        if (count($grades) > 0) {
            error_log('[get_mentee_course_grades] First grade: courseid=' . $grades[0]['courseid'] . ', grade=' . $grades[0]['grade']);
        }
        
        return array(
            'grades' => $grades,
            'warnings' => array()
        );
    }
}