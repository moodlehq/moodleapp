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
use grade_item;
use grade_grade;

/**
 * External function to get mentee grades
 */
class get_mentee_grades extends external_api {
    
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
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure(
            array(
                'usergrades' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'courseid' => new external_value(PARAM_INT, 'Course ID'),
                            'userid' => new external_value(PARAM_INT, 'User ID'),
                            'userfullname' => new external_value(PARAM_TEXT, 'User full name'),
                            'maxdepth' => new external_value(PARAM_INT, 'Max depth'),
                            'gradeitems' => new external_multiple_structure(
                                new external_single_structure(
                                    array(
                                        'id' => new external_value(PARAM_INT, 'Grade item ID'),
                                        'itemname' => new external_value(PARAM_TEXT, 'Grade item name'),
                                        'itemtype' => new external_value(PARAM_ALPHA, 'Grade item type'),
                                        'itemmodule' => new external_value(PARAM_PLUGIN, 'Grade item module', VALUE_OPTIONAL),
                                        'iteminstance' => new external_value(PARAM_INT, 'Grade item instance', VALUE_OPTIONAL),
                                        'itemnumber' => new external_value(PARAM_INT, 'Grade item number', VALUE_OPTIONAL),
                                        'categoryid' => new external_value(PARAM_INT, 'Grade category ID', VALUE_OPTIONAL),
                                        'outcomeid' => new external_value(PARAM_INT, 'Outcome ID', VALUE_OPTIONAL),
                                        'scaleid' => new external_value(PARAM_INT, 'Scale ID', VALUE_OPTIONAL),
                                        'locked' => new external_value(PARAM_BOOL, 'Is locked', VALUE_OPTIONAL),
                                        'cmid' => new external_value(PARAM_INT, 'Course module ID', VALUE_OPTIONAL),
                                        'weightraw' => new external_value(PARAM_FLOAT, 'Weight raw', VALUE_OPTIONAL),
                                        'weightformatted' => new external_value(PARAM_NOTAGS, 'Weight formatted', VALUE_OPTIONAL),
                                        'status' => new external_value(PARAM_ALPHA, 'Status', VALUE_OPTIONAL),
                                        'graderaw' => new external_value(PARAM_FLOAT, 'Grade raw', VALUE_OPTIONAL),
                                        'gradedatesubmitted' => new external_value(PARAM_INT, 'Grade date submitted', VALUE_OPTIONAL),
                                        'gradedategraded' => new external_value(PARAM_INT, 'Grade date graded', VALUE_OPTIONAL),
                                        'gradehiddenbydate' => new external_value(PARAM_BOOL, 'Grade hidden by date', VALUE_OPTIONAL),
                                        'gradeneedsupdate' => new external_value(PARAM_BOOL, 'Grade needs update', VALUE_OPTIONAL),
                                        'gradeishidden' => new external_value(PARAM_BOOL, 'Grade is hidden', VALUE_OPTIONAL),
                                        'gradeislocked' => new external_value(PARAM_BOOL, 'Grade is locked', VALUE_OPTIONAL),
                                        'gradeisoverridden' => new external_value(PARAM_BOOL, 'Grade is overridden', VALUE_OPTIONAL),
                                        'gradeformatted' => new external_value(PARAM_RAW, 'Grade formatted', VALUE_OPTIONAL),
                                        'grademin' => new external_value(PARAM_FLOAT, 'Grade min', VALUE_OPTIONAL),
                                        'grademax' => new external_value(PARAM_FLOAT, 'Grade max', VALUE_OPTIONAL),
                                        'rangeformatted' => new external_value(PARAM_NOTAGS, 'Range formatted', VALUE_OPTIONAL),
                                        'percentageformatted' => new external_value(PARAM_NOTAGS, 'Percentage formatted', VALUE_OPTIONAL),
                                        'feedback' => new external_value(PARAM_RAW, 'Feedback', VALUE_OPTIONAL),
                                        'feedbackformat' => new external_value(PARAM_INT, 'Feedback format', VALUE_OPTIONAL),
                                    )
                                )
                            )
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
     * Get grades for a mentee
     * @param int $courseid Course ID
     * @param int $userid The mentee user id (0 for current user)
     * @return array Grades information
     */
    public static function execute($courseid, $userid = 0) {
        global $DB, $USER, $CFG;
        
        $params = self::validate_parameters(self::execute_parameters(), array(
            'courseid' => $courseid,
            'userid' => $userid
        ));
        
        // If userid is 0, use current user
        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }
        
        // Check if this is a parent viewing their mentee's grades
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
                require_capability('moodle/grade:view', $context);
            }
        }
        
        // Get the course
        $course = $DB->get_record('course', array('id' => $params['courseid']), '*', MUST_EXIST);
        $context = context_course::instance($course->id);
        
        // Check if the mentee is enrolled in the course
        if ($isparent) {
            $enrolled = is_enrolled($context, $params['userid'], '', true);
            if (!$enrolled) {
                throw new \moodle_exception('usernotenrolled', 'error');
            }
        }
        
        // Get user info
        $user = $DB->get_record('user', array('id' => $params['userid']), '*', MUST_EXIST);
        
        // Get grades
        $gradeitems = grade_item::fetch_all(array('courseid' => $course->id));
        $grades = array();
        
        if ($gradeitems) {
            foreach ($gradeitems as $gradeitem) {
                // Skip hidden items for parents
                if ($isparent && $gradeitem->is_hidden()) {
                    continue;
                }
                
                $gradegrade = grade_grade::fetch(array('itemid' => $gradeitem->id, 'userid' => $user->id));
                
                $item = array(
                    'id' => $gradeitem->id,
                    'itemname' => $gradeitem->get_name(),
                    'itemtype' => $gradeitem->itemtype,
                    'itemmodule' => $gradeitem->itemmodule,
                    'iteminstance' => $gradeitem->iteminstance,
                    'itemnumber' => $gradeitem->itemnumber,
                    'categoryid' => $gradeitem->categoryid,
                    'outcomeid' => $gradeitem->outcomeid,
                    'scaleid' => $gradeitem->scaleid,
                );
                
                if ($gradegrade) {
                    $item['graderaw'] = $gradegrade->rawgrade;
                    $item['gradedatesubmitted'] = $gradegrade->get_datesubmitted();
                    $item['gradedategraded'] = $gradegrade->get_dategraded();
                    $item['gradeishidden'] = $gradegrade->is_hidden();
                    $item['gradeislocked'] = $gradegrade->is_locked();
                    $item['gradeisoverridden'] = $gradegrade->is_overridden();
                    
                    // Format grade
                    $item['gradeformatted'] = grade_format_gradevalue($gradegrade->rawgrade, $gradeitem);
                    
                    // Add feedback if available
                    if (!empty($gradegrade->feedback)) {
                        $item['feedback'] = $gradegrade->feedback;
                        $item['feedbackformat'] = $gradegrade->feedbackformat;
                    }
                }
                
                $item['grademin'] = $gradeitem->grademin;
                $item['grademax'] = $gradeitem->grademax;
                $item['rangeformatted'] = $gradeitem->grademin . ' - ' . $gradeitem->grademax;
                
                // Calculate percentage if possible
                if ($gradegrade && $gradeitem->grademax > $gradeitem->grademin) {
                    $percentage = (($gradegrade->rawgrade - $gradeitem->grademin) / 
                                  ($gradeitem->grademax - $gradeitem->grademin)) * 100;
                    $item['percentageformatted'] = round($percentage, 2) . '%';
                }
                
                // Add course module ID if applicable
                if ($gradeitem->itemtype == 'mod') {
                    $cm = get_coursemodule_from_instance($gradeitem->itemmodule, $gradeitem->iteminstance, $course->id);
                    if ($cm) {
                        $item['cmid'] = $cm->id;
                    }
                }
                
                $grades[] = $item;
            }
        }
        
        return array(
            'usergrades' => array(
                array(
                    'courseid' => $course->id,
                    'userid' => $user->id,
                    'userfullname' => fullname($user),
                    'maxdepth' => 1,
                    'gradeitems' => $grades
                )
            ),
            'warnings' => array()
        );
    }
}