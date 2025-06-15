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
require_once($CFG->dirroot . '/mod/forum/lib.php');
require_once($CFG->dirroot . '/mod/assign/lib.php');
require_once($CFG->dirroot . '/mod/quiz/lib.php');
require_once($CFG->dirroot . '/mod/resource/lib.php');

use external_api;
use external_function_parameters;
use external_single_structure;
use external_multiple_structure;
use external_value;
use context_module;
use context_course;
use context_user;

/**
 * External function to get mentee activity information
 */
class get_mentee_activity_info extends external_api {
    
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
                'cmid' => new external_value(PARAM_INT, 'Course module ID'),
                'name' => new external_value(PARAM_TEXT, 'Activity name'),
                'modname' => new external_value(PARAM_COMPONENT, 'Module name'),
                'intro' => new external_value(PARAM_RAW, 'Activity introduction/description', VALUE_OPTIONAL),
                'introformat' => new external_value(PARAM_INT, 'Intro format', VALUE_OPTIONAL),
                'content' => new external_value(PARAM_RAW, 'Activity content', VALUE_OPTIONAL),
                'contentformat' => new external_value(PARAM_INT, 'Content format', VALUE_OPTIONAL),
                'grade' => new external_value(PARAM_RAW, 'Grade information', VALUE_OPTIONAL),
                'duedate' => new external_value(PARAM_INT, 'Due date', VALUE_OPTIONAL),
                'timeopen' => new external_value(PARAM_INT, 'Time open', VALUE_OPTIONAL),
                'timeclose' => new external_value(PARAM_INT, 'Time close', VALUE_OPTIONAL),
                'attempts' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'id' => new external_value(PARAM_INT, 'Attempt ID'),
                            'attempt' => new external_value(PARAM_INT, 'Attempt number'),
                            'timestart' => new external_value(PARAM_INT, 'Time started'),
                            'timefinish' => new external_value(PARAM_INT, 'Time finished'),
                            'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                            'state' => new external_value(PARAM_ALPHA, 'State'),
                            'grade' => new external_value(PARAM_FLOAT, 'Grade', VALUE_OPTIONAL),
                        )
                    ), 'Attempts information', VALUE_OPTIONAL
                ),
                'submissions' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'id' => new external_value(PARAM_INT, 'Submission ID'),
                            'status' => new external_value(PARAM_ALPHA, 'Submission status'),
                            'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                            'grade' => new external_value(PARAM_FLOAT, 'Grade', VALUE_OPTIONAL),
                        )
                    ), 'Submissions information', VALUE_OPTIONAL
                ),
                'files' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'filename' => new external_value(PARAM_FILE, 'File name'),
                            'filepath' => new external_value(PARAM_PATH, 'File path'),
                            'filesize' => new external_value(PARAM_INT, 'File size'),
                            'fileurl' => new external_value(PARAM_URL, 'File URL'),
                            'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                            'mimetype' => new external_value(PARAM_RAW, 'MIME type'),
                        )
                    ), 'Resource files', VALUE_OPTIONAL
                ),
                'canview' => new external_value(PARAM_BOOL, 'Whether the parent can view this activity'),
                'message' => new external_value(PARAM_TEXT, 'Additional message', VALUE_OPTIONAL),
            )
        );
    }
    
    /**
     * Get activity information for a mentee
     * @param int $cmid Course module ID
     * @param int $userid The mentee user id (0 for current user)
     * @return array Activity information
     */
    public static function execute($cmid, $userid = 0) {
        global $DB, $USER, $CFG;
        
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
        $course = $DB->get_record('course', array('id' => $cm->course), '*', MUST_EXIST);
        $modcontext = context_module::instance($cm->id);
        
        // Check if this is a parent viewing their mentee's activity
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
                throw new \moodle_exception('nopermissions', 'error', '', 'view this activity');
            }
        }
        
        // Check if the mentee is enrolled in the course
        $coursecontext = context_course::instance($course->id);
        if (!is_enrolled($coursecontext, $params['userid'], '', true)) {
            throw new \moodle_exception('usernotenrolled', 'error');
        }
        
        // Get the module instance
        $modinfo = get_fast_modinfo($course, $params['userid']);
        $cminfo = $modinfo->get_cm($cm->id);
        
        // Basic info
        $result = array(
            'cmid' => $cm->id,
            'name' => $cminfo->name,
            'modname' => $cm->modname,
            'canview' => true,
        );
        
        // Get module instance
        $module = $DB->get_record($cm->modname, array('id' => $cm->instance), '*', MUST_EXIST);
        
        // Add intro if available
        if (isset($module->intro)) {
            $result['intro'] = $module->intro;
            $result['introformat'] = $module->introformat ?? FORMAT_HTML;
        }
        
        // Handle specific module types
        switch ($cm->modname) {
            case 'assign':
                // Get assignment info
                if (isset($module->duedate)) {
                    $result['duedate'] = $module->duedate;
                }
                
                // Get submission info
                $submission = $DB->get_record('assign_submission', 
                    array('assignment' => $cm->instance, 'userid' => $params['userid']), 
                    '*', IGNORE_MISSING);
                    
                if ($submission) {
                    $result['submissions'] = array(array(
                        'id' => $submission->id,
                        'status' => $submission->status,
                        'timemodified' => $submission->timemodified,
                    ));
                    
                    // Get grade
                    $grade = $DB->get_record('assign_grades',
                        array('assignment' => $cm->instance, 'userid' => $params['userid']),
                        '*', IGNORE_MISSING);
                    if ($grade && $grade->grade !== null) {
                        $result['submissions'][0]['grade'] = $grade->grade;
                        $result['grade'] = 'Grade: ' . $grade->grade . '/' . $module->grade;
                    }
                }
                break;
                
            case 'quiz':
                // Get quiz info
                if (isset($module->timeopen)) {
                    $result['timeopen'] = $module->timeopen;
                }
                if (isset($module->timeclose)) {
                    $result['timeclose'] = $module->timeclose;
                }
                
                // Get attempts
                $attempts = $DB->get_records('quiz_attempts',
                    array('quiz' => $cm->instance, 'userid' => $params['userid']),
                    'attempt DESC');
                    
                if ($attempts) {
                    $result['attempts'] = array();
                    foreach ($attempts as $attempt) {
                        $attemptdata = array(
                            'id' => $attempt->id,
                            'attempt' => $attempt->attempt,
                            'timestart' => $attempt->timestart,
                            'timefinish' => $attempt->timefinish,
                            'timemodified' => $attempt->timemodified,
                            'state' => $attempt->state,
                        );
                        if ($attempt->sumgrades !== null) {
                            $attemptdata['grade'] = $attempt->sumgrades;
                        }
                        $result['attempts'][] = $attemptdata;
                    }
                }
                break;
                
            case 'resource':
                // Get resource files
                $fs = get_file_storage();
                $files = $fs->get_area_files($modcontext->id, 'mod_resource', 'content', 0, 'sortorder DESC, id ASC', false);
                
                if ($files) {
                    $result['files'] = array();
                    foreach ($files as $file) {
                        $fileurl = \moodle_url::make_webservice_pluginfile_url(
                            $modcontext->id, 'mod_resource', 'content', 
                            0, $file->get_filepath(), $file->get_filename()
                        )->out(false);
                        
                        $result['files'][] = array(
                            'filename' => $file->get_filename(),
                            'filepath' => $file->get_filepath(),
                            'filesize' => $file->get_filesize(),
                            'fileurl' => $fileurl,
                            'timemodified' => $file->get_timemodified(),
                            'mimetype' => $file->get_mimetype(),
                        );
                    }
                }
                break;
                
            case 'page':
                // Get page content
                if (isset($module->content)) {
                    $result['content'] = $module->content;
                    $result['contentformat'] = $module->contentformat ?? FORMAT_HTML;
                }
                break;
                
            case 'url':
                // Get URL
                if (isset($module->externalurl)) {
                    $result['content'] = $module->externalurl;
                }
                break;
        }
        
        // Add a message for parents
        if ($isparent) {
            $result['message'] = 'You are viewing this activity as a parent. Some features may be limited.';
        }
        
        return $result;
    }
}