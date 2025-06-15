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
use context_module;

/**
 * External function to get mentee assignment submissions.
 */
class get_mentee_assignment_submissions extends external_api {

    /**
     * Describes the parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'assignid' => new external_value(PARAM_INT, 'Assignment instance ID'),
            'userid' => new external_value(PARAM_INT, 'User ID of the mentee'),
        ]);
    }

    /**
     * Get assignment submissions for a mentee.
     *
     * @param int $assignid Assignment instance ID
     * @param int $userid User ID of the mentee
     * @return array
     */
    public static function execute($assignid, $userid) {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'assignid' => $assignid,
            'userid' => $userid,
        ]);

        // Check if the current user is a parent of the mentee.
        $mentorcontext = context_user::instance($params['userid']);
        $mentorroles = $DB->get_records('role', ['archetype' => 'parent']);
        
        $isparent = false;
        foreach ($mentorroles as $role) {
            if (user_has_role_assignment($USER->id, $role->id, $mentorcontext->id)) {
                $isparent = true;
                break;
            }
        }

        if (!$isparent && $USER->id != $params['userid']) {
            throw new \moodle_exception('nopermissions', 'error', '', 'view mentee assignment submissions');
        }

        // Get the assignment and course module.
        $assignment = $DB->get_record('assign', ['id' => $params['assignid']], '*', MUST_EXIST);
        $cm = get_coursemodule_from_instance('assign', $assignment->id, $assignment->course, false, MUST_EXIST);
        $context = context_module::instance($cm->id);

        // Create assignment instance.
        $assign = new \assign($context, $cm, $assignment->course);

        // Get submission and grade for the mentee.
        $submission = $assign->get_user_submission($params['userid'], false);
        $grade = $assign->get_user_grade($params['userid'], false);

        $result = [
            'submission' => null,
            'grade' => null,
            'feedback' => [],
            'previousattempts' => []
        ];

        // Process submission data.
        if ($submission) {
            $result['submission'] = [
                'id' => $submission->id,
                'userid' => $submission->userid,
                'attemptnumber' => $submission->attemptnumber,
                'timecreated' => $submission->timecreated,
                'timemodified' => $submission->timemodified,
                'timestarted' => $submission->timestarted ?? 0,
                'status' => $submission->status,
                'groupid' => $submission->groupid,
                'assignment' => $submission->assignment,
                'latest' => $submission->latest,
            ];

            // Get submission plugins data.
            $submissionplugins = $assign->get_submission_plugins();
            $plugins = [];
            foreach ($submissionplugins as $plugin) {
                if ($plugin->is_enabled() && $plugin->is_visible()) {
                    $plugindata = $plugin->get_submission_plugin_data($submission, true);
                    if ($plugindata) {
                        $plugins[] = [
                            'type' => $plugin->get_type(),
                            'name' => $plugin->get_name(),
                            'data' => json_encode($plugindata)
                        ];
                    }
                }
            }
            $result['submission']['plugins'] = $plugins;
        }

        // Process grade data.
        if ($grade) {
            $result['grade'] = [
                'id' => $grade->id,
                'assignment' => $grade->assignment,
                'userid' => $grade->userid,
                'timecreated' => $grade->timecreated,
                'timemodified' => $grade->timemodified,
                'grader' => $grade->grader,
                'grade' => $grade->grade,
                'attemptnumber' => $grade->attemptnumber,
            ];

            // Get feedback plugins data.
            $feedbackplugins = $assign->get_feedback_plugins();
            $feedback = [];
            foreach ($feedbackplugins as $plugin) {
                if ($plugin->is_enabled() && $plugin->is_visible()) {
                    $plugindata = $plugin->get_feedback_plugin_data($grade, true);
                    if ($plugindata) {
                        $feedback[] = [
                            'type' => $plugin->get_type(),
                            'name' => $plugin->get_name(),
                            'data' => json_encode($plugindata)
                        ];
                    }
                }
            }
            $result['feedback'] = $feedback;
        }

        // Get previous attempts if applicable.
        if ($assign->get_instance()->attemptreopenmethod != ASSIGN_ATTEMPT_REOPEN_METHOD_NONE) {
            $previousattempts = $assign->get_all_submissions($params['userid']);
            foreach ($previousattempts as $attempt) {
                if ($attempt->attemptnumber < $submission->attemptnumber) {
                    $result['previousattempts'][] = [
                        'attemptnumber' => $attempt->attemptnumber,
                        'submission' => [
                            'status' => $attempt->status,
                            'timemodified' => $attempt->timemodified,
                        ],
                        'grade' => null, // Could be expanded to include grade info
                    ];
                }
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
            'submission' => new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Submission ID'),
                'userid' => new external_value(PARAM_INT, 'User ID'),
                'attemptnumber' => new external_value(PARAM_INT, 'Attempt number'),
                'timecreated' => new external_value(PARAM_INT, 'Time created'),
                'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                'timestarted' => new external_value(PARAM_INT, 'Time started'),
                'status' => new external_value(PARAM_TEXT, 'Status'),
                'groupid' => new external_value(PARAM_INT, 'Group ID'),
                'assignment' => new external_value(PARAM_INT, 'Assignment ID'),
                'latest' => new external_value(PARAM_INT, 'Is latest attempt'),
                'plugins' => new external_multiple_structure(
                    new external_single_structure([
                        'type' => new external_value(PARAM_TEXT, 'Plugin type'),
                        'name' => new external_value(PARAM_TEXT, 'Plugin name'),
                        'data' => new external_value(PARAM_RAW, 'Plugin data'),
                    ])
                ),
            ], 'Submission info', VALUE_OPTIONAL),
            'grade' => new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Grade ID'),
                'assignment' => new external_value(PARAM_INT, 'Assignment ID'),
                'userid' => new external_value(PARAM_INT, 'User ID'),
                'timecreated' => new external_value(PARAM_INT, 'Time created'),
                'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                'grader' => new external_value(PARAM_INT, 'Grader user ID'),
                'grade' => new external_value(PARAM_TEXT, 'Grade'),
                'attemptnumber' => new external_value(PARAM_INT, 'Attempt number'),
            ], 'Grade info', VALUE_OPTIONAL),
            'feedback' => new external_multiple_structure(
                new external_single_structure([
                    'type' => new external_value(PARAM_TEXT, 'Plugin type'),
                    'name' => new external_value(PARAM_TEXT, 'Plugin name'),
                    'data' => new external_value(PARAM_RAW, 'Plugin data'),
                ])
            ),
            'previousattempts' => new external_multiple_structure(
                new external_single_structure([
                    'attemptnumber' => new external_value(PARAM_INT, 'Attempt number'),
                    'submission' => new external_single_structure([
                        'status' => new external_value(PARAM_TEXT, 'Status'),
                        'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                    ], 'Submission info', VALUE_OPTIONAL),
                    'grade' => new external_value(PARAM_RAW, 'Grade info', VALUE_OPTIONAL),
                ])
            ),
        ]);
    }
}