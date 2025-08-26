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
require_once($CFG->dirroot . '/message/lib.php');

use external_api;
use external_function_parameters;
use external_single_structure;
use external_value;
use context_system;
use context_course;
use context_user;

/**
 * External service to send a message from parent to teacher.
 *
 * @package    local_aspireparent
 * @copyright  2024 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class send_message_to_teacher extends external_api {

    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'teacherid' => new external_value(PARAM_INT, 'Teacher user ID'),
            'menteeid' => new external_value(PARAM_INT, 'Mentee user ID'),
            'message' => new external_value(PARAM_TEXT, 'Message text'),
        ]);
    }

    /**
     * Send a message from parent to teacher.
     *
     * @param int $teacherid Teacher user ID
     * @param int $menteeid Mentee user ID
     * @param string $message Message text
     * @return array Result
     */
    public static function execute($teacherid, $menteeid, $message) {
        global $DB, $USER;

        // Validate parameters.
        $params = self::validate_parameters(self::execute_parameters(), [
            'teacherid' => $teacherid,
            'menteeid' => $menteeid,
            'message' => $message,
        ]);

        // Validate context.
        $context = context_system::instance();
        self::validate_context($context);

        // Check if current user is a parent of the mentee.
        $sql = "SELECT DISTINCT u.id
                FROM {role_assignments} ra
                JOIN {context} c ON ra.contextid = c.id
                JOIN {user} u ON c.instanceid = u.id
                WHERE ra.userid = :parentid
                AND c.contextlevel = :contextlevel
                AND u.id = :menteeid";
        
        $isparent = $DB->record_exists_sql($sql, [
            'parentid' => $USER->id,
            'contextlevel' => CONTEXT_USER,
            'menteeid' => $params['menteeid'],
        ]);

        if (!$isparent) {
            throw new \moodle_exception('notparentofmentee', 'local_aspireparent');
        }

        // Check if teacher teaches the mentee.
        $sql = "SELECT DISTINCT c.id, c.fullname
                FROM {course} c
                JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :coursecontext
                JOIN {role_assignments} ra_teacher ON ra_teacher.contextid = ctx.id
                JOIN {role} r ON ra_teacher.roleid = r.id
                JOIN {enrol} e ON e.courseid = c.id
                JOIN {user_enrolments} ue ON ue.enrolid = e.id
                WHERE ra_teacher.userid = :teacherid
                AND LOWER(r.shortname) LIKE '%teacher%'
                AND ue.userid = :menteeid
                AND e.status = 0
                AND ue.status = 0";

        $courses = $DB->get_records_sql($sql, [
            'coursecontext' => CONTEXT_COURSE,
            'teacherid' => $params['teacherid'],
            'menteeid' => $params['menteeid'],
        ]);

        if (empty($courses)) {
            throw new \moodle_exception('teacherdoesnotteachmentee', 'local_aspireparent');
        }

        // Get or create conversation between parent and teacher.
        $conversationid = \core_message\api::get_conversation_between_users([$USER->id, $params['teacherid']]);
        
        if (empty($conversationid)) {
            // Create individual conversation.
            $conversation = \core_message\api::create_conversation(
                \core_message\api::MESSAGE_CONVERSATION_TYPE_INDIVIDUAL,
                [$USER->id, $params['teacherid']]
            );
            $conversationid = $conversation->id;
        }

        // Add context to the message about which child and course this is about.
        $mentee = $DB->get_record('user', ['id' => $params['menteeid']], 'firstname, lastname');
        $coursenames = implode(', ', array_column($courses, 'fullname'));
        
        $contextmessage = "\n\n" . get_string('messagefromparentcontext', 'local_aspireparent', [
            'parent' => fullname($USER),
            'child' => fullname($mentee),
            'courses' => $coursenames,
        ]);
        
        $fullmessage = $params['message'] . $contextmessage;

        // Send the message.
        $messageid = \core_message\api::send_message_to_conversation(
            $USER->id,
            $conversationid,
            $fullmessage,
            FORMAT_MOODLE
        );

        return [
            'sent' => true,
            'messageid' => $messageid,
            'conversationid' => $conversationid,
        ];
    }

    /**
     * Returns description of method result value.
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'sent' => new external_value(PARAM_BOOL, 'Whether the message was sent'),
            'messageid' => new external_value(PARAM_INT, 'Message ID'),
            'conversationid' => new external_value(PARAM_INT, 'Conversation ID'),
        ]);
    }
}