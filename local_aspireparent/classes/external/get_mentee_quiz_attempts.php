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
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use context_user;
use context_module;

/**
 * External function to get mentee quiz attempts.
 */
class get_mentee_quiz_attempts extends external_api {

    /**
     * Describes the parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'quizid' => new external_value(PARAM_INT, 'Quiz instance ID'),
            'userid' => new external_value(PARAM_INT, 'User ID of the mentee'),
            'status' => new external_value(PARAM_ALPHA, 'Quiz attempt status to return', VALUE_DEFAULT, 'all'),
            'includepreviews' => new external_value(PARAM_BOOL, 'Include preview attempts', VALUE_DEFAULT, false),
        ]);
    }

    /**
     * Get quiz attempts for a mentee.
     *
     * @param int $quizid Quiz instance ID
     * @param int $userid User ID of the mentee
     * @param string $status Status filter
     * @param bool $includepreviews Include preview attempts
     * @return array
     */
    public static function execute($quizid, $userid, $status = 'all', $includepreviews = false) {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'quizid' => $quizid,
            'userid' => $userid,
            'status' => $status,
            'includepreviews' => $includepreviews,
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
            throw new \moodle_exception('nopermissions', 'error', '', 'view mentee quiz attempts');
        }

        // Get the quiz and course module.
        $quiz = $DB->get_record('quiz', ['id' => $params['quizid']], '*', MUST_EXIST);
        $cm = get_coursemodule_from_instance('quiz', $quiz->id, $quiz->course, false, MUST_EXIST);
        $context = context_module::instance($cm->id);

        // Get attempts for the mentee.
        $attempts = quiz_get_user_attempts($quiz->id, $params['userid'], $params['status'], $params['includepreviews']);

        $result = [];
        foreach ($attempts as $attempt) {
            $attemptdata = [
                'id' => $attempt->id,
                'quiz' => $attempt->quiz,
                'userid' => $attempt->userid,
                'attempt' => $attempt->attempt,
                'uniqueid' => $attempt->uniqueid,
                'layout' => $attempt->layout,
                'currentpage' => $attempt->currentpage,
                'preview' => $attempt->preview,
                'state' => $attempt->state,
                'timestart' => $attempt->timestart,
                'timefinish' => $attempt->timefinish,
                'timemodified' => $attempt->timemodified,
                'timecheckstate' => $attempt->timecheckstate,
                'sumgrades' => $attempt->sumgrades,
            ];

            // Add grade information if attempt is finished.
            if ($attempt->state == \quiz_attempt::FINISHED) {
                $grade = quiz_rescale_grade($attempt->sumgrades, $quiz, false);
                $attemptdata['grade'] = $grade;
                $attemptdata['gradetopass'] = $quiz->gradetopass;
            }

            $result[] = $attemptdata;
        }

        return ['attempts' => $result, 'warnings' => []];
    }

    /**
     * Describes the return value.
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'attempts' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Attempt ID'),
                    'quiz' => new external_value(PARAM_INT, 'Quiz ID'),
                    'userid' => new external_value(PARAM_INT, 'User ID'),
                    'attempt' => new external_value(PARAM_INT, 'Attempt number'),
                    'uniqueid' => new external_value(PARAM_INT, 'Unique attempt ID'),
                    'layout' => new external_value(PARAM_TEXT, 'Layout'),
                    'currentpage' => new external_value(PARAM_INT, 'Current page'),
                    'preview' => new external_value(PARAM_INT, 'Is preview'),
                    'state' => new external_value(PARAM_TEXT, 'State'),
                    'timestart' => new external_value(PARAM_INT, 'Time started'),
                    'timefinish' => new external_value(PARAM_INT, 'Time finished'),
                    'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                    'timecheckstate' => new external_value(PARAM_INT, 'Time check state', VALUE_OPTIONAL),
                    'sumgrades' => new external_value(PARAM_FLOAT, 'Sum of grades', VALUE_OPTIONAL),
                    'grade' => new external_value(PARAM_FLOAT, 'Grade', VALUE_OPTIONAL),
                    'gradetopass' => new external_value(PARAM_FLOAT, 'Grade to pass', VALUE_OPTIONAL),
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