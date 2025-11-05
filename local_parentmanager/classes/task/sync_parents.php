<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

namespace local_parentmanager\task;

/**
 * Scheduled task to sync parents from Odoo API
 *
 * @package    local_parentmanager
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class sync_parents extends \core\task\scheduled_task {

    /**
     * Get task name
     */
    public function get_name() {
        return get_string('syncparentstask', 'local_parentmanager');
    }

    /**
     * Execute task
     */
    public function execute() {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/local/parentmanager/lib.php');

        // Check if auto sync is enabled
        if (!get_config('local_parentmanager', 'enableautosync')) {
            mtrace('Automatic sync is disabled. Skipping...');
            return;
        }

        mtrace('Starting parent synchronization from Odoo API...');

        $totalstudents = 0;
        $parentscreated = 0;
        $parentsupdated = 0;
        $parentslinked = 0;
        $errors = 0;

        // Get sequence field and student role from settings
        $sequencefield = get_config('local_parentmanager', 'sequencefield') ?: 'ID';
        $studentrole = get_config('local_parentmanager', 'studentrole') ?: 'student';

        // Get all students with sequence numbers
        // Students have the 'student' role assigned
        $sql = "SELECT DISTINCT u.id, u.firstname, u.lastname, u.email, uif.data as sequence
                FROM {user} u
                JOIN {role_assignments} ra ON ra.userid = u.id
                JOIN {role} r ON r.id = ra.roleid
                LEFT JOIN {user_info_field} f ON f.shortname = :sequencefield
                LEFT JOIN {user_info_data} uif ON uif.userid = u.id AND uif.fieldid = f.id
                WHERE u.deleted = 0
                AND r.shortname = :studentrole
                AND uif.data IS NOT NULL
                AND uif.data != ''
                ORDER BY u.lastname, u.firstname";

        $students = $DB->get_records_sql($sql, [
            'sequencefield' => $sequencefield,
            'studentrole' => $studentrole
        ]);

        mtrace('Found ' . count($students) . ' students with sequence numbers');

        foreach ($students as $student) {
            $totalstudents++;

            mtrace("\n[{$totalstudents}] Processing student: {$student->firstname} {$student->lastname} (Seq: {$student->sequence})");

            $result = local_parentmanager_sync_student_parents($student->id, $student->sequence);

            if ($result['success']) {
                $parentscreated += $result['parents_created'];
                $parentsupdated += $result['parents_updated'];
                $parentslinked += $result['parents_linked'];

                mtrace("  ✓ Created: {$result['parents_created']}, Updated: {$result['parents_updated']}, Linked: {$result['parents_linked']}");
            } else {
                $errors++;
                mtrace("  ✗ Failed");
            }

            if (!empty($result['errors'])) {
                foreach ($result['errors'] as $error) {
                    mtrace("    Error: {$error}");
                }
            }

            // Sleep briefly to avoid overwhelming the API
            usleep(100000); // 0.1 seconds
        }

        mtrace("\n" . str_repeat('=', 60));
        mtrace('Synchronization complete!');
        mtrace('Students processed: ' . $totalstudents);
        mtrace('Parents created: ' . $parentscreated);
        mtrace('Parents updated: ' . $parentsupdated);
        mtrace('Parents linked: ' . $parentslinked);
        mtrace('Errors: ' . $errors);
        mtrace(str_repeat('=', 60));
    }
}
