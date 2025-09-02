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
 * External function to get a token for a mentee.
 *
 * @package    local_aspireparent
 * @copyright  2024 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_aspireparent\external;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/externallib.php');
require_once($CFG->dirroot . '/local/aspireparent/lib.php');
require_once($CFG->dirroot . '/webservice/lib.php');

class get_mentee_token extends \external_api {
    
    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new \external_function_parameters(
            array(
                'menteeid' => new \external_value(PARAM_INT, 'The mentee user ID to get token for'),
                'service' => new \external_value(PARAM_ALPHANUMEXT, 'The service to generate token for', VALUE_DEFAULT, 'moodle_mobile_app'),
            )
        );
    }
    
    /**
     * Get a token for the mentee.
     *
     * @param int $menteeid The mentee user ID
     * @param string $service The service name
     * @return array Token information
     */
    public static function execute($menteeid, $service = 'moodle_mobile_app') {
        global $DB, $USER, $CFG;
        
        // Validate parameters
        $params = self::validate_parameters(self::execute_parameters(), array(
            'menteeid' => $menteeid,
            'service' => $service
        ));
        
        $menteeid = $params['menteeid'];
        $service = $params['service'];
        
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
        
        // Get the service
        $servicerecord = $DB->get_record('external_services', array('shortname' => $service));
        if (!$servicerecord) {
            throw new \moodle_exception('servicenotavailable', 'webservice');
        }
        
        // Check if a token already exists for this user and service
        $existingtoken = $DB->get_record('external_tokens', array(
            'userid' => $menteeid,
            'externalserviceid' => $servicerecord->id,
            'tokentype' => EXTERNAL_TOKEN_PERMANENT
        ));
        
        if ($existingtoken) {
            // Check if token is still valid
            if (empty($existingtoken->validuntil) || $existingtoken->validuntil > time()) {
                // Token is still valid, return it
                return array(
                    'token' => $existingtoken->token,
                    'menteeid' => $menteeid,
                    'menteename' => fullname($mentee),
                    'privatetoken' => null // We don't generate private tokens for mentees
                );
            } else {
                // Token expired, delete it
                $DB->delete_records('external_tokens', array('id' => $existingtoken->id));
            }
        }
        
        // Generate a new token
        try {
            // Log the attempt
            error_log('local_aspireparent_get_mentee_token: Generating token for mentee ' . $menteeid . ' by parent ' . $USER->id);
            
            // Create web service manager
            $webservicemanager = new \webservice();
            
            // Generate the token
            $tokenobject = $webservicemanager->generate_user_ws_token($servicerecord->shortname, $menteeid);
            
            // The method returns an object, we need the token string
            if (is_object($tokenobject) && isset($tokenobject->token)) {
                $tokenstring = $tokenobject->token;
                $tokenid = $tokenobject->id;
            } else if (is_string($tokenobject)) {
                // Sometimes it returns just the token string
                $tokenstring = $tokenobject;
                // Try to find the token record
                $tokenrecord = $DB->get_record('external_tokens', array('token' => $tokenstring));
                $tokenid = $tokenrecord ? $tokenrecord->id : 0;
            } else {
                throw new \moodle_exception('tokennotgenerated', 'local_aspireparent');
            }
            
            error_log('local_aspireparent_get_mentee_token: Token generated successfully for mentee ' . $menteeid);
            
            // Log this action if we have a token ID
            if ($tokenid) {
                $event = \core\event\webservice_token_created::create(array(
                    'objectid' => $tokenid,
                    'relateduserid' => $menteeid,
                    'context' => \context_system::instance(),
                    'other' => array(
                        'auto' => false,
                        'parentid' => $USER->id,
                        'service' => $service
                    )
                ));
                $event->trigger();
            }
            
            return array(
                'token' => $tokenstring,
                'menteeid' => $menteeid,
                'menteename' => fullname($mentee),
                'privatetoken' => null
            );
        } catch (\Exception $e) {
            error_log('local_aspireparent_get_mentee_token: Error generating token: ' . $e->getMessage());
            throw new \moodle_exception('tokennotgenerated', 'local_aspireparent', '', $e->getMessage());
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
                'token' => new \external_value(PARAM_ALPHANUM, 'The token for the mentee'),
                'menteeid' => new \external_value(PARAM_INT, 'The mentee user ID'),
                'menteename' => new \external_value(PARAM_TEXT, 'The mentee full name'),
                'privatetoken' => new \external_value(PARAM_ALPHANUM, 'Private token', VALUE_OPTIONAL),
            )
        );
    }
}