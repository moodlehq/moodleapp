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

global $CFG;

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use context_course;
use context_user;

require_once($CFG->libdir . '/externallib.php');
require_once($CFG->dirroot . '/local/aspireparent/classes/external/check_parent_permission.php');

/**
 * External service to get teachers in a course for a mentee.
 *
 * @package    local_aspireparent
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_mentee_course_teachers extends external_api {

    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
            'menteeid' => new external_value(PARAM_INT, 'Mentee user ID'),
        ]);
    }

    /**
     * Get teachers in a course for a mentee.
     *
     * @param int $courseid Course ID
     * @param int $menteeid Mentee user ID
     * @return array List of teachers
     */
    public static function execute($courseid, $menteeid) {
        global $DB, $USER, $PAGE;

        // Validate parameters.
        $params = self::validate_parameters(self::execute_parameters(), [
            'courseid' => $courseid,
            'menteeid' => $menteeid,
        ]);

        // Check if current user is parent of the mentee.
        if (!check_parent_permission::is_parent_of($menteeid)) {
            throw new \moodle_exception('nopermission', 'local_aspireparent');
        }

        // Get course context.
        $coursecontext = context_course::instance($params['courseid']);

        // Get all users with teacher roles in the course.
        $teacherRoles = ['teacher', 'editingteacher', 'instructor', 'tutor', 'trainer', 'facilitator'];
        
        // Get role IDs for teacher roles.
        $roleIds = [];
        foreach ($teacherRoles as $shortname) {
            $role = $DB->get_record('role', ['shortname' => $shortname]);
            if ($role) {
                $roleIds[] = $role->id;
            }
        }
        
        // Also check for roles with teacher archetype.
        $teacherArchetypeRoles = $DB->get_records('role', ['archetype' => 'teacher']);
        foreach ($teacherArchetypeRoles as $role) {
            if (!in_array($role->id, $roleIds)) {
                $roleIds[] = $role->id;
            }
        }
        
        if (empty($roleIds)) {
            return ['teachers' => []];
        }

        // Get users with teacher roles in the course.
        $teachers = [];
        $roleAssignments = $DB->get_records_sql("
            SELECT DISTINCT u.*, ra.roleid
            FROM {user} u
            JOIN {role_assignments} ra ON ra.userid = u.id
            WHERE ra.contextid = :contextid
            AND ra.roleid IN (" . implode(',', $roleIds) . ")
            AND u.deleted = 0
            AND u.suspended = 0
            ORDER BY u.lastname, u.firstname",
            ['contextid' => $coursecontext->id]
        );

        foreach ($roleAssignments as $teacher) {
            // Get user picture URL.
            $userPicture = new \user_picture($teacher);
            $userPicture->size = 1; // Size 1 is 100x100.
            $pictureUrl = $userPicture->get_url($PAGE)->out(false);

            $teachers[] = [
                'id' => $teacher->id,
                'fullname' => fullname($teacher),
                'firstname' => $teacher->firstname,
                'lastname' => $teacher->lastname,
                'email' => $teacher->email,
                'profileimageurl' => $pictureUrl,
                'roleid' => $teacher->roleid,
            ];
        }

        return ['teachers' => $teachers];
    }

    /**
     * Returns description of method result value.
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'teachers' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'User ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Full name'),
                    'firstname' => new external_value(PARAM_TEXT, 'First name'),
                    'lastname' => new external_value(PARAM_TEXT, 'Last name'),
                    'email' => new external_value(PARAM_TEXT, 'Email address'),
                    'profileimageurl' => new external_value(PARAM_URL, 'Profile image URL'),
                    'roleid' => new external_value(PARAM_INT, 'Role ID'),
                ])
            ),
        ]);
    }
}