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
use context_system;
use context_user;
use context_course;
use context_module;
use core_course_external;

/**
 * External function to get mentee course contents
 */
class get_mentee_course_contents extends external_api {
    
    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters(
            array(
                'courseid' => new external_value(PARAM_INT, 'Course ID'),
                'userid' => new external_value(PARAM_INT, 'The mentee user id', VALUE_DEFAULT, 0),
                'options' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'name' => new external_value(PARAM_ALPHANUM, 'Option name'),
                            'value' => new external_value(PARAM_RAW, 'Option value')
                        )
                    ), 'Options, used to filter module list', VALUE_DEFAULT, array()
                )
            )
        );
    }
    
    /**
     * Returns description of method result value
     * @return external_multiple_structure
     */
    public static function execute_returns() {
        // Use the same return structure as core_course_get_contents
        return \core_course_external::get_course_contents_returns();
    }
    
    /**
     * Get course contents for a mentee
     * @param int $courseid Course ID
     * @param int $userid The mentee user id (0 for current user)
     * @param array $options Options to filter sections/modules
     * @return array Course contents
     */
    public static function execute($courseid, $userid = 0, $options = array()) {
        global $DB, $USER, $CFG;
        
        $params = self::validate_parameters(self::execute_parameters(), array(
            'courseid' => $courseid,
            'userid' => $userid,
            'options' => $options
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
            }
        }
        
        // Get the course
        $course = $DB->get_record('course', array('id' => $params['courseid']), '*', MUST_EXIST);
        
        // For parents viewing mentee courses, we need to get the contents differently
        if ($isparent) {
            // Check if the mentee is enrolled in the course
            $enrolled = is_enrolled(context_course::instance($params['courseid']), $params['userid'], '', true);
            if (!$enrolled) {
                throw new \moodle_exception('usernotenrolled', 'error');
            }
            
            // Get course contents using the core function but with mentee context
            // We'll need to temporarily switch user context to get proper data
            $olduser = $USER;
            $USER = $DB->get_record('user', array('id' => $params['userid']), '*', MUST_EXIST);
            
            try {
                // Call the core function to get course contents
                $contents = \core_course_external::get_course_contents($params['courseid'], $params['options']);
                
                // Filter out any sensitive information for parent view
                foreach ($contents as &$section) {
                    if (isset($section['modules'])) {
                        foreach ($section['modules'] as &$module) {
                            // Remove user-specific data that parents shouldn't see
                            unset($module['uservisible']);
                            unset($module['availabilityinfo']);
                            
                            // Mark that this is being viewed by a parent
                            $module['parentview'] = true;
                            
                            // Ensure module is marked as visible for parent
                            $module['visible'] = 1;
                            $module['visibleoncoursepage'] = 1;
                            
                            // Add module URL if not present
                            if (!isset($module['url']) && isset($module['modname']) && isset($module['instance'])) {
                                $module['url'] = $CFG->wwwroot . '/mod/' . $module['modname'] . '/view.php?id=' . $module['id'];
                            }
                        }
                    }
                }
                
                // Restore original user
                $USER = $olduser;
                
                return $contents;
            } catch (\Exception $e) {
                // Restore original user on error
                $USER = $olduser;
                throw $e;
            }
        } else {
            // Regular user viewing their own course
            return \core_course_external::get_course_contents($params['courseid'], $params['options']);
        }
    }
}