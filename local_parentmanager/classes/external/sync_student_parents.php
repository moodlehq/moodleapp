<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

namespace local_parentmanager\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use core_external\external_multiple_structure;

/**
 * External function to sync parents for a student from Odoo API
 *
 * @package    local_parentmanager\external
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class sync_student_parents extends external_api {

    /**
     * Returns description of method parameters
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'studentid' => new external_value(PARAM_INT, 'Student user ID'),
        ]);
    }

    /**
     * Sync parents for a student from Odoo API
     *
     * @param int $studentid Student user ID
     * @return array Result
     */
    public static function execute($studentid) {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/local/parentmanager/lib.php');
        require_once($CFG->dirroot . '/user/profile/lib.php');

        $params = self::validate_parameters(self::execute_parameters(), [
            'studentid' => $studentid,
        ]);

        $context = \context_system::instance();
        self::validate_context($context);
        require_capability('moodle/user:create', $context);

        // Get student
        $student = $DB->get_record('user', ['id' => $params['studentid'], 'deleted' => 0], '*', MUST_EXIST);

        // Get student sequence from custom field
        profile_load_data($student);
        $studentsequence = isset($student->profile_field_ID) ? $student->profile_field_ID : null;

        if (!$studentsequence) {
            throw new \moodle_exception('nostudentsequence', 'local_parentmanager');
        }

        // Sync parents
        $result = local_parentmanager_sync_student_parents($params['studentid'], $studentsequence);

        return $result;
    }

    /**
     * Returns description of method result value
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success status'),
            'student_id' => new external_value(PARAM_INT, 'Student user ID'),
            'student_sequence' => new external_value(PARAM_TEXT, 'Student sequence number'),
            'parents_created' => new external_value(PARAM_INT, 'Number of parent accounts created'),
            'parents_updated' => new external_value(PARAM_INT, 'Number of parent accounts updated'),
            'parents_linked' => new external_value(PARAM_INT, 'Number of parents linked to student'),
            'errors' => new external_multiple_structure(
                new external_value(PARAM_TEXT, 'Error message'),
                'List of errors encountered'
            )
        ]);
    }
}
