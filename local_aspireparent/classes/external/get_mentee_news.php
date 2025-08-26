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
require_once($CFG->dirroot . '/mod/forum/lib.php');

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use context_system;
use context_course;
use context_module;
use core_external\util as external_util;

/**
 * External function to get news for a mentee.
 */
class get_mentee_news extends external_api {

    /**
     * Describes the parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User ID of the mentee', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Get news items for a mentee across all their courses.
     *
     * @param int $userid User ID of the mentee
     * @return array
     */
    public static function execute($userid = 0) {
        global $DB, $USER, $CFG;

        $params = self::validate_parameters(self::execute_parameters(), [
            'userid' => $userid,
        ]);

        // If userid is 0, use current user
        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }

        // Check if the current user is a parent of the mentee
        require_once(__DIR__ . '/check_parent_permission.php');
        
        // Allow if user is viewing their own data OR is a parent
        if ($params['userid'] != $USER->id && !check_parent_permission::is_parent_of($params['userid'])) {
            throw new \moodle_exception('nopermissions', 'error', '', 'view mentee news');
        }

        $newsitems = [];

        // Get all courses the mentee is enrolled in
        $courses = enrol_get_users_courses($params['userid'], true);
        
        // Add site home course for site-wide announcements
        $siteid = isset($CFG->siteid) ? $CFG->siteid : SITEID;
        if (!isset($courses[$siteid])) {
            $sitecourse = $DB->get_record('course', ['id' => $siteid]);
            if ($sitecourse) {
                $courses[$siteid] = $sitecourse;
            }
        }

        foreach ($courses as $course) {
            try {
                $coursecontext = context_course::instance($course->id);

                // Get all forums in the course
                $forums = $DB->get_records('forum', ['course' => $course->id]);
                
                foreach ($forums as $forum) {
                    // Only include news and announcement forums
                    if ($forum->type !== 'news' && 
                        $forum->type !== 'general' &&
                        stripos($forum->name, 'announcement') === false &&
                        stripos($forum->name, 'news') === false) {
                        continue;
                    }

                    // Get the course module
                    $cm = get_coursemodule_from_instance('forum', $forum->id, $course->id);
                    if (!$cm || !$cm->visible) {
                        continue;
                    }

                    // Get module context
                    $modcontext = context_module::instance($cm->id);

                    // Get discussions from this forum
                    $sql = "SELECT d.*, p.subject, p.message, p.messageformat, p.created, p.modified,
                                   u.firstname, u.lastname, u.firstnamephonetic, u.lastnamephonetic, 
                                   u.middlename, u.alternatename
                            FROM {forum_discussions} d
                            JOIN {forum_posts} p ON p.id = d.firstpost
                            JOIN {user} u ON u.id = d.userid
                            WHERE d.forum = :forumid
                            ORDER BY d.timemodified DESC
                            LIMIT 100";
                    
                    $discussions = $DB->get_records_sql($sql, ['forumid' => $forum->id]);
                    
                    foreach ($discussions as $discussion) {
                        // Format user name
                        $userfullname = fullname($discussion);
                        
                        // Format the message
                        $options = ['noclean' => true, 'para' => false, 'filter' => true];
                        list($message, $messageformat) = external_util::format_text(
                            $discussion->message,
                            $discussion->messageformat,
                            $modcontext,
                            'mod_forum',
                            'post',
                            $discussion->firstpost,
                            $options
                        );
                        
                        $newsitems[] = [
                            'id' => $discussion->id,
                            'name' => $discussion->name,
                            'subject' => external_util::format_string($discussion->subject, $modcontext),
                            'message' => $message,
                            'created' => $discussion->created,
                            'modified' => $discussion->modified,
                            'courseId' => $course->id,
                            'courseName' => $course->shortname,
                            'courseFullname' => external_util::format_string($course->fullname, $coursecontext),
                            'discussionId' => $discussion->id,
                            'forumId' => $forum->id,
                            'forumName' => external_util::format_string($forum->name, $modcontext),
                            'userfullname' => $userfullname,
                            'usermodifiedfullname' => $userfullname,
                            'numreplies' => $discussion->numreplies,
                            'numunread' => 0,
                            'pinned' => $discussion->pinned ? true : false,
                        ];
                    }
                }

            } catch (\Exception $e) {
                // Skip courses/forums that can't be accessed
                continue;
            }
        }
        
        // Also check for site-wide announcement forums (like forum 1500)
        $knownSiteForumIds = [1500];
        
        foreach ($knownSiteForumIds as $forumid) {
            try {
                $forum = $DB->get_record('forum', ['id' => $forumid]);
                if (!$forum) {
                    continue;
                }
                
                $cm = get_coursemodule_from_instance('forum', $forum->id, $forum->course);
                if (!$cm || !$cm->visible) {
                    continue;
                }
                
                $modcontext = context_module::instance($cm->id);
                $coursecontext = context_course::instance($forum->course);
                
                // Get the course info
                $course = $DB->get_record('course', ['id' => $forum->course]);
                
                // Get discussions
                $sql = "SELECT d.*, p.subject, p.message, p.messageformat, p.created, p.modified,
                               u.firstname, u.lastname, u.firstnamephonetic, u.lastnamephonetic, 
                               u.middlename, u.alternatename
                        FROM {forum_discussions} d
                        JOIN {forum_posts} p ON p.id = d.firstpost
                        JOIN {user} u ON u.id = d.userid
                        WHERE d.forum = :forumid
                        ORDER BY d.timemodified DESC
                        LIMIT 100";
                
                $discussions = $DB->get_records_sql($sql, ['forumid' => $forum->id]);
                
                foreach ($discussions as $discussion) {
                    // Format user name
                    $userfullname = fullname($discussion);
                    
                    // Format the message
                    $options = ['noclean' => true, 'para' => false, 'filter' => true];
                    list($message, $messageformat) = external_util::format_text(
                        $discussion->message,
                        $discussion->messageformat,
                        $modcontext,
                        'mod_forum',
                        'post',
                        $discussion->firstpost,
                        $options
                    );
                    
                    $newsitems[] = [
                        'id' => $discussion->id,
                        'name' => $discussion->name,
                        'subject' => external_util::format_string($discussion->subject, $modcontext),
                        'message' => $message,
                        'created' => $discussion->created,
                        'modified' => $discussion->modified,
                        'courseId' => $course->id,
                        'courseName' => $course->shortname,
                        'courseFullname' => external_util::format_string($course->fullname, $coursecontext),
                        'discussionId' => $discussion->id,
                        'forumId' => $forum->id,
                        'forumName' => external_util::format_string($forum->name, $modcontext),
                        'userfullname' => $userfullname,
                        'usermodifiedfullname' => $userfullname,
                        'numreplies' => $discussion->numreplies,
                        'numunread' => 0,
                        'pinned' => $discussion->pinned ? true : false,
                    ];
                }
                
            } catch (\Exception $e) {
                // Skip if we can't access this forum
                continue;
            }
        }

        // Sort by created date, newest first
        usort($newsitems, function($a, $b) {
            return $b['created'] - $a['created'];
        });

        return ['newsitems' => $newsitems];
    }

    /**
     * Describes the return value.
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'newsitems' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Discussion ID'),
                    'name' => new external_value(PARAM_TEXT, 'Discussion name'),
                    'subject' => new external_value(PARAM_TEXT, 'Post subject'),
                    'message' => new external_value(PARAM_RAW, 'Post message'),
                    'created' => new external_value(PARAM_INT, 'Created timestamp'),
                    'modified' => new external_value(PARAM_INT, 'Modified timestamp'),
                    'courseId' => new external_value(PARAM_INT, 'Course ID'),
                    'courseName' => new external_value(PARAM_TEXT, 'Course short name'),
                    'courseFullname' => new external_value(PARAM_TEXT, 'Course full name'),
                    'discussionId' => new external_value(PARAM_INT, 'Discussion ID'),
                    'forumId' => new external_value(PARAM_INT, 'Forum ID'),
                    'forumName' => new external_value(PARAM_TEXT, 'Forum name'),
                    'userfullname' => new external_value(PARAM_TEXT, 'User full name'),
                    'usermodifiedfullname' => new external_value(PARAM_TEXT, 'User modified full name'),
                    'numreplies' => new external_value(PARAM_INT, 'Number of replies'),
                    'numunread' => new external_value(PARAM_INT, 'Number of unread'),
                    'pinned' => new external_value(PARAM_BOOL, 'Is pinned'),
                ])
            )
        ]);
    }
}