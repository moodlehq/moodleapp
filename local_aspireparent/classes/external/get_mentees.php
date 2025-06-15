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

/**
 * Get mentees external service
 *
 * @package    local_aspireparent
 * @copyright  2024 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_aspireparent\external;

defined('MOODLE_INTERNAL') || die();

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_user;
use context_course;
use moodle_url;

require_once($CFG->libdir . '/externallib.php');
require_once($CFG->dirroot . '/user/lib.php');

/**
 * Get mentees external service class
 */
class get_mentees extends external_api {

    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters(
            array(
                'userid' => new external_value(PARAM_INT, 'The mentor user id (0 for current user)', VALUE_DEFAULT, 0)
            )
        );
    }

    /**
     * Get mentees for a given user (mentor)
     * @param int $userid The mentor user id (0 for current user)
     * @return array List of mentees
     */
    public static function execute($userid = 0) {
        global $DB, $USER, $CFG, $PAGE;

        $params = self::validate_parameters(self::execute_parameters(), array('userid' => $userid));
        
        if ($userid == 0) {
            $userid = $USER->id;
        }

        // Check if user can view mentees
        $context = context_user::instance($userid);
        self::validate_context($context);

        // Only allow users to view their own mentees or if they have capability
        if ($userid != $USER->id && !has_capability('moodle/user:viewdetails', $context)) {
            throw new \moodle_exception('nopermissions', 'error', '', 'view mentees');
        }

        // Get mentees using the same query as the mentees block
        // In Moodle's parent/mentor system:
        // - The parent (ra.userid) has a role assignment
        // - In the context of the student (c.instanceid = student's user id)
        // - At the user context level (c.contextlevel = CONTEXT_USER)
        $sql = "SELECT DISTINCT u.*
                FROM {role_assignments} ra
                JOIN {context} c ON ra.contextid = c.id
                JOIN {user} u ON c.instanceid = u.id
                WHERE ra.userid = :userid
                AND c.contextlevel = :contextlevel
                AND u.deleted = 0
                AND u.confirmed = 1
                AND u.id != :userid2
                ORDER BY u.firstname, u.lastname";

        $params = array(
            'userid' => $userid,
            'userid2' => $userid,  // To exclude the parent from results
            'contextlevel' => CONTEXT_USER
        );

        $mentees = $DB->get_records_sql($sql, $params);
        
        // Debug: Let's also check what role assignments exist for this user
        if (empty($mentees)) {
            // Try to debug by checking all role assignments for this user
            $debugsql = "SELECT ra.*, c.contextlevel, c.instanceid, r.shortname as rolename
                        FROM {role_assignments} ra
                        JOIN {context} c ON ra.contextid = c.id
                        JOIN {role} r ON ra.roleid = r.id
                        WHERE ra.userid = :userid";
            $debugassignments = $DB->get_records_sql($debugsql, array('userid' => $userid));
            
            // You might want to log this or handle it differently
            // For now, we'll just continue with empty results
        }
        
        $result = array();
        foreach ($mentees as $mentee) {
            $usercontext = context_user::instance($mentee->id);
            
            // Get user picture URL
            $userpicture = new \user_picture($mentee);
            $userpicture->size = 1; // Size f1
            $profileimageurl = $userpicture->get_url($PAGE)->out(false);
            
            $userpicture->size = 0; // Size f2 (small)
            $profileimageurlsmall = $userpicture->get_url($PAGE)->out(false);
            
            $userdata = array(
                'id' => $mentee->id,
                'username' => $mentee->username,
                'firstname' => $mentee->firstname,
                'lastname' => $mentee->lastname,
                'fullname' => fullname($mentee),
                'email' => $mentee->email,
                'profileimageurl' => $profileimageurl,
                'profileimageurlsmall' => $profileimageurlsmall
            );
            
            // Add custom fields if available
            require_once($CFG->dirroot . '/user/profile/lib.php');
            $customfields = array();
            
            // Load custom profile fields
            profile_load_custom_fields($mentee);
            
            if (isset($mentee->profile)) {
                foreach ($mentee->profile as $shortname => $value) {
                    if (!empty($value)) {
                        // Get field info
                        $field = $DB->get_record('user_info_field', array('shortname' => $shortname));
                        if ($field) {
                            $customfields[] = array(
                                'type' => $field->datatype,
                                'name' => $field->name,
                                'shortname' => $shortname,
                                'value' => $value,
                                'displayvalue' => $value // Could be formatted based on field type
                            );
                        }
                    }
                }
            }
            
            if (!empty($customfields)) {
                $userdata['customfields'] = $customfields;
            }
            
            $result[] = $userdata;
        }

        return array('mentees' => $result);
    }

    /**
     * Returns description of method return value
     * @return external_description
     */
    public static function execute_returns() {
        return new external_single_structure(
            array(
                'mentees' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'id' => new external_value(PARAM_INT, 'User id'),
                            'username' => new external_value(PARAM_RAW, 'Username'),
                            'firstname' => new external_value(PARAM_TEXT, 'First name'),
                            'lastname' => new external_value(PARAM_TEXT, 'Last name'),
                            'fullname' => new external_value(PARAM_TEXT, 'Full name'),
                            'email' => new external_value(PARAM_EMAIL, 'Email address'),
                            'profileimageurl' => new external_value(PARAM_URL, 'Profile image URL'),
                            'profileimageurlsmall' => new external_value(PARAM_URL, 'Profile image URL small'),
                            'customfields' => new external_multiple_structure(
                                new external_single_structure(
                                    array(
                                        'type' => new external_value(PARAM_ALPHANUMEXT, 'Field type'),
                                        'name' => new external_value(PARAM_TEXT, 'Field name'),
                                        'shortname' => new external_value(PARAM_ALPHANUMEXT, 'Field shortname'),
                                        'value' => new external_value(PARAM_RAW, 'Field value'),
                                        'displayvalue' => new external_value(PARAM_RAW, 'Field display value')
                                    )
                                ), 'Custom fields', VALUE_OPTIONAL
                            )
                        )
                    )
                )
            )
        );
    }
}