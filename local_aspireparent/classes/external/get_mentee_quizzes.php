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

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use context_user;
use context_course;
use context_module;

/**
 * External function to get mentee quizzes.
 */
class get_mentee_quizzes extends external_api {

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
        ]);
    }

    /**
     * Get quizzes for a mentee.
     *
     * @param array $courseids Course IDs
     * @param int $userid User ID of the mentee
     * @return array
     */
    public static function execute($courseids, $userid) {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'courseids' => $courseids,
            'userid' => $userid,
        ]);

        // Check if the current user is a parent of the mentee.
        require_once(__DIR__ . '/check_parent_permission.php');
        
        if (!check_parent_permission::is_parent_of($params['userid'])) {
            throw new \moodle_exception('nopermissions', 'error', '', 'view mentee quizzes');
        }

        $result = ['quizzes' => [], 'warnings' => []];

        foreach ($params['courseids'] as $courseid) {
            try {
                $course = get_course($courseid);
                $coursecontext = context_course::instance($courseid);

                // Check if mentee is enrolled in the course.
                if (!is_enrolled($coursecontext, $params['userid'])) {
                    continue;
                }

                // Get all quizzes in the course.
                $quizzes = $DB->get_records('quiz', ['course' => $courseid]);
                
                foreach ($quizzes as $quiz) {
                    // Get the course module.
                    $cm = get_coursemodule_from_instance('quiz', $quiz->id, $courseid);
                    if (!$cm || !$cm->visible) {
                        continue;
                    }

                    // Get additional quiz data.
                    $quizdata = [
                        'id' => $quiz->id,
                        'course' => $quiz->course,
                        'coursemodule' => $cm->id,
                        'name' => format_string($quiz->name),
                        'intro' => format_module_intro('quiz', $quiz, $cm->id),
                        'introformat' => FORMAT_HTML,
                        'timeopen' => $quiz->timeopen,
                        'timeclose' => $quiz->timeclose,
                        'timelimit' => $quiz->timelimit,
                        'overduehandling' => $quiz->overduehandling,
                        'graceperiod' => $quiz->graceperiod,
                        'preferredbehaviour' => $quiz->preferredbehaviour,
                        'canredoquestions' => $quiz->canredoquestions,
                        'attempts' => $quiz->attempts,
                        'attemptonlast' => $quiz->attemptonlast,
                        'grademethod' => $quiz->grademethod,
                        'decimalpoints' => $quiz->decimalpoints,
                        'questiondecimalpoints' => $quiz->questiondecimalpoints,
                        'reviewattempt' => $quiz->reviewattempt,
                        'reviewcorrectness' => $quiz->reviewcorrectness,
                        'reviewmarks' => $quiz->reviewmarks,
                        'reviewspecificfeedback' => $quiz->reviewspecificfeedback,
                        'reviewgeneralfeedback' => $quiz->reviewgeneralfeedback,
                        'reviewrightanswer' => $quiz->reviewrightanswer,
                        'reviewoverallfeedback' => $quiz->reviewoverallfeedback,
                        'questionsperpage' => $quiz->questionsperpage,
                        'navmethod' => $quiz->navmethod,
                        'shuffleanswers' => $quiz->shuffleanswers,
                        'sumgrades' => $quiz->sumgrades,
                        'grade' => $quiz->grade,
                        'timecreated' => $quiz->timecreated,
                        'timemodified' => $quiz->timemodified,
                        'password' => !empty($quiz->password) ? '1' : '0', // Don't expose actual password
                        'subnet' => $quiz->subnet,
                        'browsersecurity' => $quiz->browsersecurity,
                        'delay1' => $quiz->delay1,
                        'delay2' => $quiz->delay2,
                        'showuserpicture' => $quiz->showuserpicture,
                        'showblocks' => $quiz->showblocks,
                        'completionattemptsexhausted' => $quiz->completionattemptsexhausted,
                        'completionminattempts' => $quiz->completionminattempts,
                        'allowofflineattempts' => $quiz->allowofflineattempts,
                    ];

                    $result['quizzes'][] = $quizdata;
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
            'quizzes' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Quiz ID'),
                    'course' => new external_value(PARAM_INT, 'Course ID'),
                    'coursemodule' => new external_value(PARAM_INT, 'Course module ID'),
                    'name' => new external_value(PARAM_TEXT, 'Quiz name'),
                    'intro' => new external_value(PARAM_RAW, 'Quiz introduction'),
                    'introformat' => new external_value(PARAM_INT, 'Intro format'),
                    'timeopen' => new external_value(PARAM_INT, 'Time open'),
                    'timeclose' => new external_value(PARAM_INT, 'Time close'),
                    'timelimit' => new external_value(PARAM_INT, 'Time limit'),
                    'overduehandling' => new external_value(PARAM_TEXT, 'Overdue handling'),
                    'graceperiod' => new external_value(PARAM_INT, 'Grace period'),
                    'preferredbehaviour' => new external_value(PARAM_TEXT, 'Preferred behaviour'),
                    'canredoquestions' => new external_value(PARAM_INT, 'Can redo questions'),
                    'attempts' => new external_value(PARAM_INT, 'Number of attempts allowed'),
                    'attemptonlast' => new external_value(PARAM_INT, 'Attempt on last'),
                    'grademethod' => new external_value(PARAM_INT, 'Grade method'),
                    'decimalpoints' => new external_value(PARAM_INT, 'Decimal points'),
                    'questiondecimalpoints' => new external_value(PARAM_INT, 'Question decimal points'),
                    'reviewattempt' => new external_value(PARAM_INT, 'Review attempt'),
                    'reviewcorrectness' => new external_value(PARAM_INT, 'Review correctness'),
                    'reviewmarks' => new external_value(PARAM_INT, 'Review marks'),
                    'reviewspecificfeedback' => new external_value(PARAM_INT, 'Review specific feedback'),
                    'reviewgeneralfeedback' => new external_value(PARAM_INT, 'Review general feedback'),
                    'reviewrightanswer' => new external_value(PARAM_INT, 'Review right answer'),
                    'reviewoverallfeedback' => new external_value(PARAM_INT, 'Review overall feedback'),
                    'questionsperpage' => new external_value(PARAM_INT, 'Questions per page'),
                    'navmethod' => new external_value(PARAM_TEXT, 'Navigation method'),
                    'shuffleanswers' => new external_value(PARAM_INT, 'Shuffle answers'),
                    'sumgrades' => new external_value(PARAM_FLOAT, 'Sum of grades'),
                    'grade' => new external_value(PARAM_FLOAT, 'Grade'),
                    'timecreated' => new external_value(PARAM_INT, 'Time created'),
                    'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                    'password' => new external_value(PARAM_TEXT, 'Has password'),
                    'subnet' => new external_value(PARAM_TEXT, 'Subnet'),
                    'browsersecurity' => new external_value(PARAM_TEXT, 'Browser security'),
                    'delay1' => new external_value(PARAM_INT, 'Delay 1'),
                    'delay2' => new external_value(PARAM_INT, 'Delay 2'),
                    'showuserpicture' => new external_value(PARAM_INT, 'Show user picture'),
                    'showblocks' => new external_value(PARAM_INT, 'Show blocks'),
                    'completionattemptsexhausted' => new external_value(PARAM_INT, 'Completion attempts exhausted'),
                    'completionminattempts' => new external_value(PARAM_INT, 'Completion minimum attempts'),
                    'allowofflineattempts' => new external_value(PARAM_INT, 'Allow offline attempts'),
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