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
 * External function to allow parents to login as their mentees.
 *
 * @package    local_aspireparent
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_aspireparent\external;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/externallib.php');
require_once($CFG->dirroot . '/local/aspireparent/lib.php');

class login_as_mentee extends \external_api {
    
    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new \external_function_parameters(
            array(
                'menteeid' => new \external_value(PARAM_INT, 'The mentee user ID to login as'),
            )
        );
    }
    
    /**
     * Allow parent to login as their mentee.
     *
     * @param int $menteeid The mentee user ID
     * @return array Result of the operation
     */
    public static function execute($menteeid) {
        global $DB, $USER;
        
        // Validate parameters
        $params = self::validate_parameters(self::execute_parameters(), array(
            'menteeid' => $menteeid
        ));
        
        $menteeid = $params['menteeid'];
        
        // Check if current user is a parent
        if (!local_aspireparent_is_parent($USER->id)) {
            throw new \moodle_exception('notaparent', 'local_aspireparent');
        }
        
        // Check if the user is parent of this specific mentee
        if (!local_aspireparent_is_parent_of($USER->id, $menteeid)) {
            throw new \moodle_exception('notparentof', 'local_aspireparent');
        }
        
        // Get mentee user
        $mentee = $DB->get_record('user', array('id' => $menteeid), '*', MUST_EXIST);
        
        // Check mentee is not deleted or suspended
        if ($mentee->deleted || $mentee->suspended) {
            throw new \moodle_exception('userdeleted', 'local_aspireparent');
        }
        
        // Create a context for logging in as
        $context = \context_user::instance($menteeid);
        
        // Use Moodle's login as functionality
        try {
            \core\session\manager::loginas($menteeid, $context);
            
            return array(
                'success' => true,
                'menteeid' => $menteeid,
                'menteename' => fullname($mentee),
                'loginastoken' => sesskey(), // Return session key for subsequent requests
                'originaluserid' => $USER->realuserid // Store original user ID
            );
        } catch (\Exception $e) {
            throw new \moodle_exception('loginasfailed', 'local_aspireparent', '', $e->getMessage());
        }
    }
    
    /**
     * Returns description of method result value.
     *
     * @return external_description
     */
    public static function execute_returns() {
        return new \external_single_structure(
            array(
                'success' => new \external_value(PARAM_BOOL, 'Whether the login as was successful'),
                'menteeid' => new \external_value(PARAM_INT, 'The mentee user ID'),
                'menteename' => new \external_value(PARAM_TEXT, 'The mentee full name'),
                'loginastoken' => new \external_value(PARAM_ALPHANUM, 'Session key for subsequent requests'),
                'originaluserid' => new \external_value(PARAM_INT, 'Original parent user ID'),
            )
        );
    }
}