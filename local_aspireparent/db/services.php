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
 * Web service definitions for local_aspireparent
 *
 * @package    local_aspireparent
 * @copyright  2024 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$services = array(
    'Aspire Parent Service' => array(
        'functions' => array(
            'local_aspireparent_get_mentees',
            'local_aspireparent_get_parent_info'
        ),
        'restrictedusers' => 0,
        'enabled' => 1,
        'shortname' => 'local_aspireparent_service',
        'downloadfiles' => 1,
        'uploadfiles' => 0
    )
);

$functions = array(
    'local_aspireparent_get_mentees' => array(
        'classname' => 'local_aspireparent\external\get_mentees',
        'methodname' => 'execute',
        'description' => 'Get list of mentees for a parent/mentor user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_parent_info' => array(
        'classname' => 'local_aspireparent\external\get_parent_info',
        'methodname' => 'execute',
        'description' => 'Get parent role information for current user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    )
);