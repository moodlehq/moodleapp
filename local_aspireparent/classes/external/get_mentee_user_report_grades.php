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
use grade_tree;
use grade_report_user;

/**
 * External function to get mentee course grades using user report API
 */
class get_mentee_user_report_grades extends external_api {
    
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
                            'courseFullName' => new external_value(PARAM_TEXT, 'Course full name'),
                            'grade' => new external_value(PARAM_TEXT, 'Grade formatted'),
                            'rawgrade' => new external_value(PARAM_TEXT, 'Raw grade', VALUE_OPTIONAL),
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
     * Get course grades for a mentee using user grade report
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
            'menteeid' => $params['menteeid']
        );
        
        $isparent = $DB->record_exists_sql($sql, $parentparams);
        
        if (!$isparent && $params['menteeid'] != $USER->id) {
            throw new \moodle_exception('nopermissions', 'error', '', 'view mentee grades');
        }
        
        // Get mentee's courses
        $courses = enrol_get_users_courses($params['menteeid'], true, null, 'fullname ASC');
        
        error_log('[get_mentee_user_report_grades] Fetching grades for mentee ID: ' . $params['menteeid']);
        error_log('[get_mentee_user_report_grades] Number of courses found: ' . count($courses));
        
        $grades = array();
        
        foreach ($courses as $course) {
            error_log('[get_mentee_user_report_grades] Processing course ID: ' . $course->id . ' - ' . $course->fullname);
            
            $coursecontext = context_course::instance($course->id);
            
            // Check if parent can view grades in this course
            // Parents should be able to view grades even if showgrades is false
            // This mirrors the behavior in course/user.php
            
            try {
                // Get grade tree for the course
                $gpr = new \grade_plugin_return(array(
                    'type' => 'report',
                    'plugin' => 'user',
                    'courseid' => $course->id,
                    'userid' => $params['menteeid']
                ));
                
                $report = new \grade_report_user($course->id, $gpr, $coursecontext, $params['menteeid']);
                
                if ($report->fill_table()) {
                    // Find the course total from grade items
                    $gtree = new grade_tree($course->id, false, false);
                    $course_item = null;
                    
                    foreach ($gtree->items as $item) {
                        if ($item->itemtype == 'course') {
                            $course_item = $item;
                            break;
                        }
                    }
                    
                    $course_grade = array(
                        'courseid' => $course->id,
                        'courseFullName' => $course->fullname,
                        'grade' => '-',
                        'rawgrade' => null,
                        'rank' => null
                    );
                    
                    if ($course_item) {
                        $grade = \grade_grade::fetch(array('itemid' => $course_item->id, 'userid' => $params['menteeid']));
                        
                        if ($grade && !empty($grade->id) && !is_null($grade->finalgrade)) {
                            // Get formatted grade
                            $course_grade['rawgrade'] = format_float($grade->finalgrade, 2, true, true);
                            
                            // Use the grade item to format the grade properly
                            if (method_exists($course_item, 'get_formatted_grade')) {
                                $course_grade['grade'] = $course_item->get_formatted_grade($grade->finalgrade, $course_item->get_decimals());
                            } else {
                                // Fallback formatting
                                if ($course_item->gradetype == GRADE_TYPE_VALUE && $course_item->grademax > $course_item->grademin) {
                                    $percentage = (($grade->finalgrade - $course_item->grademin) / ($course_item->grademax - $course_item->grademin)) * 100;
                                    $course_grade['grade'] = format_float($percentage, 2, true, true) . '%';
                                } else {
                                    $course_grade['grade'] = $course_grade['rawgrade'];
                                }
                            }
                            
                            // Get rank if available
                            if (!$course_item->is_hidden() && $report->showrank) {
                                $sql = "SELECT COUNT(DISTINCT(userid))
                                        FROM {grade_grades}
                                        WHERE finalgrade IS NOT NULL AND finalgrade > ?
                                        AND itemid = ?";
                                $rank = $DB->count_records_sql($sql, array($grade->finalgrade, $course_item->id)) + 1;
                                if ($rank) {
                                    $course_grade['rank'] = $rank;
                                }
                            }
                        }
                    }
                    
                    $grades[] = $course_grade;
                } else {
                    // No grades available for this course
                    $grades[] = array(
                        'courseid' => $course->id,
                        'courseFullName' => $course->fullname,
                        'grade' => '-',
                        'rawgrade' => null,
                        'rank' => null
                    );
                }
                
            } catch (\Exception $e) {
                error_log('[get_mentee_user_report_grades] Error getting grades for course ' . $course->id . ': ' . $e->getMessage());
                
                // Add course with no grade on error
                $grades[] = array(
                    'courseid' => $course->id,
                    'courseFullName' => $course->fullname,
                    'grade' => '-',
                    'rawgrade' => null,
                    'rank' => null
                );
            }
        }
        
        error_log('[get_mentee_user_report_grades] Total grades to return: ' . count($grades));
        
        return array(
            'grades' => $grades,
            'warnings' => array()
        );
    }
}