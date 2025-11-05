<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * CLI script to manually sync parents from Odoo API
 *
 * @package    local_parentmanager
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->dirroot . '/local/parentmanager/lib.php');

// Get CLI options
list($options, $unrecognized) = cli_get_params(
    [
        'help' => false,
        'studentid' => null,
        'sequence' => null,
    ],
    [
        'h' => 'help',
        's' => 'studentid',
        'q' => 'sequence',
    ]
);

if ($options['help'] || (!$options['studentid'] && !$options['sequence'])) {
    $help = "Sync parents from Odoo API for students.

Options:
-h, --help              Print this help
-s, --studentid=ID      Sync parents for specific student ID
-q, --sequence=SEQ      Sync parents for student with sequence number

Examples:
# Sync parents for student ID 123
php sync_parents.php --studentid=123

# Sync parents for student with sequence STU001
php sync_parents.php --sequence=STU001

# Run scheduled task to sync all students
php admin/cli/scheduled_task.php --execute=\\local_parentmanager\\task\\sync_parents
";

    echo $help;
    exit(0);
}

// Get student
if ($options['studentid']) {
    $student = $DB->get_record('user', ['id' => $options['studentid'], 'deleted' => 0], '*', MUST_EXIST);

    // Get sequence field from settings
    $sequencefield = get_config('local_parentmanager', 'sequencefield') ?: 'ID';

    // Get sequence
    require_once($CFG->dirroot . '/user/profile/lib.php');
    profile_load_data($student);
    $fieldname = 'profile_field_' . $sequencefield;
    $sequence = isset($student->$fieldname) ? $student->$fieldname : null;

    if (!$sequence) {
        cli_error("Student {$student->id} does not have a sequence number in profile field 'ID'");
    }
} else {
    // Find by sequence
    $sequence = $options['sequence'];
    $sequencefield = get_config('local_parentmanager', 'sequencefield') ?: 'ID';

    $sql = "SELECT u.*
            FROM {user} u
            JOIN {user_info_field} f ON f.shortname = :fieldname
            JOIN {user_info_data} d ON d.userid = u.id AND d.fieldid = f.id
            WHERE d.data = :sequence
            AND u.deleted = 0";

    $student = $DB->get_record_sql($sql, ['fieldname' => $sequencefield, 'sequence' => $sequence]);

    if (!$student) {
        cli_error("No student found with sequence: {$sequence}");
    }
}

cli_heading("Syncing Parents for Student");
echo "Student ID: {$student->id}\n";
echo "Name: {$student->firstname} {$student->lastname}\n";
echo "Email: {$student->email}\n";
echo "Sequence: {$sequence}\n";
echo str_repeat('-', 60) . "\n";

$result = local_parentmanager_sync_student_parents($student->id, $sequence);

if ($result['success']) {
    cli_heading("✓ Sync Complete", 2);
    echo "Parents created: {$result['parents_created']}\n";
    echo "Parents updated: {$result['parents_updated']}\n";
    echo "Parents linked: {$result['parents_linked']}\n";
} else {
    cli_heading("✗ Sync Failed", 2);
}

if (!empty($result['errors'])) {
    cli_heading("Errors", 2);
    foreach ($result['errors'] as $error) {
        echo "  - {$error}\n";
    }
}

exit(0);
