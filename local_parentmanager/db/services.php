<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Web service definitions for local_parentmanager
 *
 * @package    local_parentmanager
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_parentmanager_sync_student_parents' => [
        'classname' => 'local_parentmanager\external\sync_student_parents',
        'methodname' => 'execute',
        'description' => 'Sync parents for a student from Odoo API',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'moodle/user:create',
        'services' => [MOODLE_OFFICIAL_MOBILE_SERVICE]
    ],
];
