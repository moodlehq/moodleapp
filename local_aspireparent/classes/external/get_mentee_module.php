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
require_once($CFG->dirroot . '/course/modlib.php');

use external_api;
use external_function_parameters;
use external_single_structure;
use external_value;
use context_module;
use context_course;
use context_user;

/**
 * External function to get mentee module information
 */
class get_mentee_module extends external_api {
    
    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters(
            array(
                'cmid' => new external_value(PARAM_INT, 'Course module ID'),
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
                'cm' => new external_single_structure(
                    array(
                        'id' => new external_value(PARAM_INT, 'Module ID'),
                        'course' => new external_value(PARAM_INT, 'Course ID'),
                        'module' => new external_value(PARAM_INT, 'Module type ID'),
                        'name' => new external_value(PARAM_TEXT, 'Module name'),
                        'modname' => new external_value(PARAM_COMPONENT, 'Module component name'),
                        'instance' => new external_value(PARAM_INT, 'Instance ID'),
                        'section' => new external_value(PARAM_INT, 'Section ID'),
                        'sectionnum' => new external_value(PARAM_INT, 'Section number'),
                        'groupmode' => new external_value(PARAM_INT, 'Group mode'),
                        'groupingid' => new external_value(PARAM_INT, 'Grouping ID'),
                        'completion' => new external_value(PARAM_INT, 'Completion tracking'),
                        'visible' => new external_value(PARAM_INT, 'Visible'),
                        'visibleoncoursepage' => new external_value(PARAM_INT, 'Visible on course page'),
                        'uservisible' => new external_value(PARAM_BOOL, 'User visible'),
                        'availableinfo' => new external_value(PARAM_RAW, 'Availability info', VALUE_OPTIONAL),
                        'url' => new external_value(PARAM_URL, 'Module URL', VALUE_OPTIONAL),
                    )
                )
            )
        );
    }
    
    /**
     * Get module information for a mentee
     * @param int $cmid Course module ID
     * @param int $userid The mentee user id (0 for current user)
     * @return array Module information
     */
    public static function execute($cmid, $userid = 0) {
        global $DB, $USER;
        
        $params = self::validate_parameters(self::execute_parameters(), array(
            'cmid' => $cmid,
            'userid' => $userid
        ));
        
        // If userid is 0, use current user
        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }
        
        // Get the course module
        $cm = get_coursemodule_from_id('', $params['cmid'], 0, false, MUST_EXIST);
        
        // Check if this is a parent viewing their mentee's module
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
                $context = context_module::instance($cm->id);
                self::validate_context($context);
            }
        }
        
        // Check if the mentee is enrolled in the course
        if ($isparent) {
            $coursecontext = context_course::instance($cm->course);
            $enrolled = is_enrolled($coursecontext, $params['userid'], '', true);
            if (!$enrolled) {
                throw new \moodle_exception('usernotenrolled', 'error');
            }
        }
        
        // Get module info
        $modinfo = get_fast_modinfo($cm->course, $params['userid']);
        $cminfo = $modinfo->get_cm($cm->id);
        
        // Build response
        $result = array(
            'cm' => array(
                'id' => $cminfo->id,
                'course' => $cminfo->course,
                'module' => $cminfo->module,
                'name' => $cminfo->name,
                'modname' => $cminfo->modname,
                'instance' => $cminfo->instance,
                'section' => $cminfo->section,
                'sectionnum' => $cminfo->sectionnum,
                'groupmode' => $cminfo->groupmode,
                'groupingid' => $cminfo->groupingid,
                'completion' => $cminfo->completion,
                'visible' => $cminfo->visible,
                'visibleoncoursepage' => $cminfo->visibleoncoursepage,
                'uservisible' => true, // For parents, we show it as visible if mentee can see it
                'url' => $cminfo->url ? $cminfo->url->out() : null,
            )
        );
        
        return $result;
    }
}