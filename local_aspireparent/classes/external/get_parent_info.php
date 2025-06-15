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
 * Get parent info external service
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
use context_system;

require_once($CFG->libdir . '/externallib.php');

/**
 * Get parent info external service class
 */
class get_parent_info extends external_api {

    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters(array());
    }

    /**
     * Get parent role information for current user
     * @return array Parent role information
     */
    public static function execute() {
        global $DB, $USER;

        // Validate context
        $context = context_system::instance();
        self::validate_context($context);

        // Define parent role shortnames
        $parentroleshortnames = array('parent', 'parents', 'mentor', 'guardian');
        
        // Check if user has any parent/mentor roles
        $sql = "SELECT DISTINCT r.id, r.shortname, r.name
                FROM {role} r
                JOIN {role_assignments} ra ON ra.roleid = r.id
                WHERE ra.userid = :userid
                AND r.shortname IN ('" . implode("','", $parentroleshortnames) . "')";
        
        $params = array('userid' => $USER->id);
        $roles = $DB->get_records_sql($sql, $params);
        
        $isparent = !empty($roles);
        
        // Count mentees
        $menteecountsql = "SELECT COUNT(DISTINCT u.id)
                          FROM {role_assignments} ra
                          JOIN {context} c ON ra.contextid = c.id
                          JOIN {user} u ON c.instanceid = u.id
                          WHERE ra.userid = :userid
                          AND c.contextlevel = :contextlevel
                          AND u.deleted = 0
                          AND u.confirmed = 1";
        
        $menteeparams = array(
            'userid' => $USER->id,
            'contextlevel' => CONTEXT_USER
        );
        
        $menteecount = $DB->count_records_sql($menteecountsql, $menteeparams);
        
        $rolesdata = array();
        foreach ($roles as $role) {
            $rolesdata[] = array(
                'id' => $role->id,
                'shortname' => $role->shortname,
                'name' => $role->name
            );
        }
        
        return array(
            'isparent' => $isparent,
            'roles' => $rolesdata,
            'menteecount' => $menteecount
        );
    }

    /**
     * Returns description of method return value
     * @return external_description
     */
    public static function execute_returns() {
        return new external_single_structure(
            array(
                'isparent' => new external_value(PARAM_BOOL, 'Whether user has parent/mentor role'),
                'roles' => new external_multiple_structure(
                    new external_single_structure(
                        array(
                            'id' => new external_value(PARAM_INT, 'Role id'),
                            'shortname' => new external_value(PARAM_ALPHANUMEXT, 'Role shortname'),
                            'name' => new external_value(PARAM_TEXT, 'Role name')
                        )
                    )
                ),
                'menteecount' => new external_value(PARAM_INT, 'Number of mentees')
            )
        );
    }
}