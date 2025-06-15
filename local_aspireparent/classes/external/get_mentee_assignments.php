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

require_once($CFG->libdir . '/externallib.php');
require_once($CFG->dirroot . '/mod/assign/locallib.php');

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use context_user;
use context_course;
use context_module;

/**
 * External function to get mentee assignments.
 */
class get_mentee_assignments extends external_api {

    /**
     * Describes the parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'courseids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'Course ID'),
                'Course IDs'
            ),
            'userid' => new external_value(PARAM_INT, 'User ID of the mentee'),
            'includenotenrolledcourses' => new external_value(PARAM_BOOL, 'Include courses the user is not enrolled in', VALUE_DEFAULT, false),
        ]);
    }

    /**
     * Get assignments for a mentee.
     *
     * @param array $courseids Course IDs
     * @param int $userid User ID of the mentee
     * @param bool $includenotenrolledcourses Include courses the user is not enrolled in
     * @return array
     */
    public static function execute($courseids, $userid, $includenotenrolledcourses = false) {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'courseids' => $courseids,
            'userid' => $userid,
            'includenotenrolledcourses' => $includenotenrolledcourses,
        ]);

        // Check if the current user is a parent of the mentee.
        require_once(__DIR__ . '/check_parent_permission.php');
        
        if (!check_parent_permission::is_parent_of($params['userid'])) {
            // Log for debugging
            error_log('Parent permission check failed for user ' . $USER->id . ' viewing mentee ' . $params['userid']);
            throw new \moodle_exception('nopermissions', 'error', '', 'view mentee assignments');
        }

        $result = ['courses' => [], 'warnings' => []];

        foreach ($params['courseids'] as $courseid) {
            try {
                $course = get_course($courseid);
                $coursecontext = context_course::instance($courseid);

                // Check if mentee is enrolled in the course.
                if (!is_enrolled($coursecontext, $params['userid']) && !$params['includenotenrolledcourses']) {
                    continue;
                }

                // Get all assignments in the course.
                $assignments = $DB->get_records('assign', ['course' => $courseid]);
                
                $courseassignments = [];
                foreach ($assignments as $assignment) {
                    // Get the course module.
                    $cm = get_coursemodule_from_instance('assign', $assignment->id, $courseid);
                    if (!$cm || !$cm->visible) {
                        continue;
                    }

                    // Get additional assignment data.
                    $assignmentdata = [
                        'id' => $assignment->id,
                        'cmid' => $cm->id,
                        'course' => $assignment->course,
                        'name' => format_string($assignment->name),
                        'nosubmissions' => $assignment->nosubmissions,
                        'submissiondrafts' => $assignment->submissiondrafts,
                        'sendnotifications' => $assignment->sendnotifications,
                        'sendlatenotifications' => $assignment->sendlatenotifications,
                        'sendstudentnotifications' => $assignment->sendstudentnotifications,
                        'duedate' => $assignment->duedate,
                        'allowsubmissionsfromdate' => $assignment->allowsubmissionsfromdate,
                        'grade' => $assignment->grade,
                        'timemodified' => $assignment->timemodified,
                        'completionsubmit' => $assignment->completionsubmit,
                        'cutoffdate' => $assignment->cutoffdate,
                        'gradingduedate' => $assignment->gradingduedate,
                        'teamsubmission' => $assignment->teamsubmission,
                        'requireallteammemberssubmit' => $assignment->requireallteammemberssubmit,
                        'teamsubmissiongroupingid' => $assignment->teamsubmissiongroupingid,
                        'blindmarking' => $assignment->blindmarking,
                        'revealidentities' => $assignment->revealidentities,
                        'attemptreopenmethod' => $assignment->attemptreopenmethod,
                        'maxattempts' => $assignment->maxattempts,
                        'markingworkflow' => $assignment->markingworkflow,
                        'markingallocation' => $assignment->markingallocation,
                        'requiresubmissionstatement' => $assignment->requiresubmissionstatement,
                        'preventsubmissionnotingroup' => $assignment->preventsubmissionnotingroup,
                        'intro' => format_module_intro('assign', $assignment, $cm->id),
                        'introformat' => FORMAT_HTML,
                        'introfiles' => [],
                        'introattachments' => []
                    ];

                    $courseassignments[] = $assignmentdata;
                }

                if (!empty($courseassignments)) {
                    $result['courses'][] = [
                        'id' => $course->id,
                        'fullname' => format_string($course->fullname),
                        'shortname' => format_string($course->shortname),
                        'timemodified' => $course->timemodified,
                        'assignments' => $courseassignments
                    ];
                }

            } catch (\Exception $e) {
                $result['warnings'][] = [
                    'item' => 'course',
                    'itemid' => $courseid,
                    'warningcode' => 'exception',
                    'message' => $e->getMessage()
                ];
            }
        }

        return $result;
    }

    /**
     * Describes the return value.
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Course full name'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course short name'),
                    'timemodified' => new external_value(PARAM_INT, 'Last modified time'),
                    'assignments' => new external_multiple_structure(
                        new external_single_structure([
                            'id' => new external_value(PARAM_INT, 'Assignment ID'),
                            'cmid' => new external_value(PARAM_INT, 'Course module ID'),
                            'course' => new external_value(PARAM_INT, 'Course ID'),
                            'name' => new external_value(PARAM_TEXT, 'Assignment name'),
                            'nosubmissions' => new external_value(PARAM_INT, 'No submissions'),
                            'submissiondrafts' => new external_value(PARAM_INT, 'Submission drafts'),
                            'sendnotifications' => new external_value(PARAM_INT, 'Send notifications'),
                            'sendlatenotifications' => new external_value(PARAM_INT, 'Send late notifications'),
                            'sendstudentnotifications' => new external_value(PARAM_INT, 'Send student notifications'),
                            'duedate' => new external_value(PARAM_INT, 'Due date'),
                            'allowsubmissionsfromdate' => new external_value(PARAM_INT, 'Allow submissions from date'),
                            'grade' => new external_value(PARAM_INT, 'Grade'),
                            'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                            'completionsubmit' => new external_value(PARAM_INT, 'Completion submit'),
                            'cutoffdate' => new external_value(PARAM_INT, 'Cut-off date'),
                            'gradingduedate' => new external_value(PARAM_INT, 'Grading due date'),
                            'teamsubmission' => new external_value(PARAM_INT, 'Team submission'),
                            'requireallteammemberssubmit' => new external_value(PARAM_INT, 'Require all team members submit'),
                            'teamsubmissiongroupingid' => new external_value(PARAM_INT, 'Team submission grouping ID'),
                            'blindmarking' => new external_value(PARAM_INT, 'Blind marking'),
                            'revealidentities' => new external_value(PARAM_INT, 'Reveal identities'),
                            'attemptreopenmethod' => new external_value(PARAM_TEXT, 'Attempt reopen method'),
                            'maxattempts' => new external_value(PARAM_INT, 'Max attempts'),
                            'markingworkflow' => new external_value(PARAM_INT, 'Marking workflow'),
                            'markingallocation' => new external_value(PARAM_INT, 'Marking allocation'),
                            'requiresubmissionstatement' => new external_value(PARAM_INT, 'Require submission statement'),
                            'preventsubmissionnotingroup' => new external_value(PARAM_INT, 'Prevent submission not in group', VALUE_OPTIONAL),
                            'intro' => new external_value(PARAM_RAW, 'Assignment intro'),
                            'introformat' => new external_value(PARAM_INT, 'Intro format'),
                            'introfiles' => new external_multiple_structure(
                                new external_single_structure([]),
                                'Intro files',
                                VALUE_OPTIONAL
                            ),
                            'introattachments' => new external_multiple_structure(
                                new external_single_structure([]),
                                'Intro attachments',
                                VALUE_OPTIONAL
                            ),
                        ])
                    )
                ])
            ),
            'warnings' => new external_multiple_structure(
                new external_single_structure([
                    'item' => new external_value(PARAM_TEXT, 'Item'),
                    'itemid' => new external_value(PARAM_INT, 'Item ID'),
                    'warningcode' => new external_value(PARAM_TEXT, 'Warning code'),
                    'message' => new external_value(PARAM_TEXT, 'Warning message')
                ])
            )
        ]);
    }
}