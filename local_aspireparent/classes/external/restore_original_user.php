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
 * External function to restore original user after login as.
 *
 * @package    local_aspireparent
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_aspireparent\external;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/externallib.php');

class restore_original_user extends \external_api {
    
    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new \external_function_parameters(array());
    }
    
    /**
     * Restore the original user session.
     *
     * @return array Result of the operation
     */
    public static function execute() {
        global $USER, $SESSION;
        
        // Check if we're currently logged in as another user
        if (!\core\session\manager::is_loggedinas()) {
            throw new \moodle_exception('notloggedinas', 'local_aspireparent');
        }
        
        // Get the original user ID
        $originaluserid = $USER->realuserid;
        
        // Clear the login as session
        unset($SESSION->realuser);
        unset($USER->realuserid);
        
        // Force a new session with the original user
        \core\session\manager::set_user(get_complete_user_data('id', $originaluserid));
        
        return array(
            'success' => true,
            'userid' => $USER->id,
            'username' => fullname($USER)
        );
    }
    
    /**
     * Returns description of method result value.
     *
     * @return external_description
     */
    public static function execute_returns() {
        return new \external_single_structure(
            array(
                'success' => new \external_value(PARAM_BOOL, 'Whether the restore was successful'),
                'userid' => new \external_value(PARAM_INT, 'The restored user ID'),
                'username' => new \external_value(PARAM_TEXT, 'The restored user full name'),
            )
        );
    }
}