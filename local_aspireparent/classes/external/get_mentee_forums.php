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
 * External function to get mentee forums.
 */
class get_mentee_forums extends external_api {

    /**
     * Describes the parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'courseids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'Course ID'),
                'Course IDs',
                VALUE_DEFAULT,
                []
            ),
            'userid' => new external_value(PARAM_INT, 'User ID of the mentee'),
        ]);
    }

    /**
     * Get forums for a mentee.
     *
     * @param array $courseids Course IDs
     * @param int $userid User ID of the mentee
     * @return array
     */
    public static function execute($courseids = [], $userid = 0) {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'courseids' => $courseids,
            'userid' => $userid,
        ]);

        // Check if the current user is a parent of the mentee.
        require_once(__DIR__ . '/check_parent_permission.php');
        
        if (!check_parent_permission::is_parent_of($params['userid'])) {
            throw new \moodle_exception('nopermissions', 'error', '', 'view mentee forums');
        }

        $result = [];

        if (empty($params['courseids'])) {
            // Get all courses the mentee is enrolled in
            $courses = enrol_get_users_courses($params['userid'], true);
            $courseids = array_keys($courses);
        } else {
            $courseids = $params['courseids'];
        }

        foreach ($courseids as $courseid) {
            try {
                $course = get_course($courseid);
                $coursecontext = context_course::instance($courseid);

                // Check if mentee is enrolled in the course.
                if (!is_enrolled($coursecontext, $params['userid'])) {
                    continue;
                }

                // Get all forums in the course.
                $forums = $DB->get_records('forum', ['course' => $courseid]);
                
                foreach ($forums as $forum) {
                    // Get the course module.
                    $cm = get_coursemodule_from_instance('forum', $forum->id, $courseid);
                    if (!$cm || !$cm->visible) {
                        continue;
                    }

                    $forumdata = [
                        'id' => $forum->id,
                        'course' => $forum->course,
                        'type' => $forum->type,
                        'name' => format_string($forum->name),
                        'intro' => format_module_intro('forum', $forum, $cm->id),
                        'introformat' => FORMAT_HTML,
                        'introfiles' => [],
                        'assessed' => $forum->assessed,
                        'assesstimestart' => $forum->assesstimestart,
                        'assesstimefinish' => $forum->assesstimefinish,
                        'scale' => $forum->scale,
                        'grade_forum' => $forum->grade_forum,
                        'grade_forum_notify' => $forum->grade_forum_notify,
                        'maxbytes' => $forum->maxbytes,
                        'maxattachments' => $forum->maxattachments,
                        'forcesubscribe' => $forum->forcesubscribe,
                        'trackingtype' => $forum->trackingtype,
                        'rsstype' => $forum->rsstype,
                        'rssarticles' => $forum->rssarticles,
                        'timemodified' => $forum->timemodified,
                        'warnafter' => $forum->warnafter,
                        'blockafter' => $forum->blockafter,
                        'blockperiod' => $forum->blockperiod,
                        'completiondiscussions' => $forum->completiondiscussions,
                        'completionreplies' => $forum->completionreplies,
                        'completionposts' => $forum->completionposts,
                        'cmid' => $cm->id,
                        'numdiscussions' => 0,
                        'cancreatediscussions' => false,
                        'lockdiscussionafter' => $forum->lockdiscussionafter,
                        'istracked' => false,
                    ];

                    // Check if it's an announcement forum
                    if ($forum->type === 'news') {
                        $forumdata['isnews'] = true;
                    }

                    $result[] = $forumdata;
                }

            } catch (\Exception $e) {
                // Skip forums that can't be accessed
                continue;
            }
        }

        return $result;
    }

    /**
     * Describes the return value.
     *
     * @return external_multiple_structure
     */
    public static function execute_returns() {
        return new external_multiple_structure(
            new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Forum ID'),
                'course' => new external_value(PARAM_INT, 'Course ID'),
                'type' => new external_value(PARAM_TEXT, 'Forum type'),
                'name' => new external_value(PARAM_TEXT, 'Forum name'),
                'intro' => new external_value(PARAM_RAW, 'Forum introduction'),
                'introformat' => new external_value(PARAM_INT, 'Intro format'),
                'introfiles' => new external_multiple_structure(
                    new external_single_structure([]),
                    'Intro files',
                    VALUE_OPTIONAL
                ),
                'assessed' => new external_value(PARAM_INT, 'Assessed'),
                'assesstimestart' => new external_value(PARAM_INT, 'Assess time start'),
                'assesstimefinish' => new external_value(PARAM_INT, 'Assess time finish'),
                'scale' => new external_value(PARAM_INT, 'Scale'),
                'grade_forum' => new external_value(PARAM_INT, 'Grade forum'),
                'grade_forum_notify' => new external_value(PARAM_INT, 'Grade forum notify'),
                'maxbytes' => new external_value(PARAM_INT, 'Max bytes'),
                'maxattachments' => new external_value(PARAM_INT, 'Max attachments'),
                'forcesubscribe' => new external_value(PARAM_INT, 'Force subscribe'),
                'trackingtype' => new external_value(PARAM_INT, 'Tracking type'),
                'rsstype' => new external_value(PARAM_INT, 'RSS type'),
                'rssarticles' => new external_value(PARAM_INT, 'RSS articles'),
                'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                'warnafter' => new external_value(PARAM_INT, 'Warn after'),
                'blockafter' => new external_value(PARAM_INT, 'Block after'),
                'blockperiod' => new external_value(PARAM_INT, 'Block period'),
                'completiondiscussions' => new external_value(PARAM_INT, 'Completion discussions'),
                'completionreplies' => new external_value(PARAM_INT, 'Completion replies'),
                'completionposts' => new external_value(PARAM_INT, 'Completion posts'),
                'cmid' => new external_value(PARAM_INT, 'Course module ID'),
                'numdiscussions' => new external_value(PARAM_INT, 'Number of discussions', VALUE_OPTIONAL),
                'cancreatediscussions' => new external_value(PARAM_BOOL, 'Can create discussions', VALUE_OPTIONAL),
                'lockdiscussionafter' => new external_value(PARAM_INT, 'Lock discussion after'),
                'istracked' => new external_value(PARAM_BOOL, 'Is tracked', VALUE_OPTIONAL),
            ])
        );
    }
}