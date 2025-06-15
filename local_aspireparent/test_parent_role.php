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
 * Test script to debug parent role assignments.
 * 
 * Usage: Navigate to /local/aspireparent/test_parent_role.php?userid=XXXX
 * where XXXX is the mentee's user ID
 */

require_once('../../config.php');
require_once($CFG->libdir . '/adminlib.php');

require_login();

$userid = optional_param('userid', 0, PARAM_INT);

$PAGE->set_context(context_system::instance());
$PAGE->set_url('/local/aspireparent/test_parent_role.php');
$PAGE->set_title('Test Parent Role');
$PAGE->set_heading('Test Parent Role Assignment');

echo $OUTPUT->header();

if (!$userid) {
    echo html_writer::tag('p', 'Please provide a userid parameter in the URL');
    echo $OUTPUT->footer();
    exit;
}

$menteeuser = $DB->get_record('user', ['id' => $userid]);
if (!$menteeuser) {
    echo html_writer::tag('p', 'User not found');
    echo $OUTPUT->footer();
    exit;
}

echo html_writer::tag('h3', 'Testing parent role for:');
echo html_writer::tag('p', 'Current user: ' . $USER->firstname . ' ' . $USER->lastname . ' (ID: ' . $USER->id . ')');
echo html_writer::tag('p', 'Mentee user: ' . $menteeuser->firstname . ' ' . $menteeuser->lastname . ' (ID: ' . $menteeuser->id . ')');

// Check role assignments
$mentorcontext = context_user::instance($userid);
echo html_writer::tag('h3', 'Role assignments in user context:');

$roleassignments = $DB->get_records('role_assignments', [
    'userid' => $USER->id,
    'contextid' => $mentorcontext->id
]);

if (empty($roleassignments)) {
    echo html_writer::tag('p', 'No role assignments found in user context', ['style' => 'color: red;']);
} else {
    foreach ($roleassignments as $ra) {
        $role = $DB->get_record('role', ['id' => $ra->roleid]);
        echo html_writer::start_tag('div', ['style' => 'border: 1px solid #ccc; padding: 10px; margin: 10px 0;']);
        echo html_writer::tag('p', 'Role: ' . $role->name . ' (' . $role->shortname . ')');
        echo html_writer::tag('p', 'Archetype: ' . $role->archetype);
        echo html_writer::tag('p', 'Role ID: ' . $role->id);
        echo html_writer::end_tag('div');
    }
}

// Check all parent-like roles
echo html_writer::tag('h3', 'All roles with parent archetype:');
$parentroles = $DB->get_records('role', ['archetype' => 'parent']);
if (empty($parentroles)) {
    echo html_writer::tag('p', 'No roles found with parent archetype', ['style' => 'color: orange;']);
} else {
    foreach ($parentroles as $role) {
        echo html_writer::tag('p', 'Role: ' . $role->name . ' (' . $role->shortname . ')');
    }
}

// Check common parent role names
echo html_writer::tag('h3', 'Roles with parent-like names:');
$sql = "SELECT * FROM {role} WHERE " . $DB->sql_like('shortname', ':parent1') . 
       " OR " . $DB->sql_like('shortname', ':parent2') .
       " OR " . $DB->sql_like('shortname', ':mentor') .
       " OR " . $DB->sql_like('shortname', ':guardian');
$parentlikeroles = $DB->get_records_sql($sql, [
    'parent1' => '%parent%',
    'parent2' => '%parents%',
    'mentor' => '%mentor%',
    'guardian' => '%guardian%'
]);

foreach ($parentlikeroles as $role) {
    echo html_writer::tag('p', 'Role: ' . $role->name . ' (' . $role->shortname . ') - Archetype: ' . $role->archetype);
}

// Test the permission check
echo html_writer::tag('h3', 'Permission check result:');
require_once(__DIR__ . '/classes/external/check_parent_permission.php');
$isparent = \local_aspireparent\external\check_parent_permission::is_parent_of($userid);
if ($isparent) {
    echo html_writer::tag('p', 'Permission check: PASSED', ['style' => 'color: green; font-weight: bold;']);
} else {
    echo html_writer::tag('p', 'Permission check: FAILED', ['style' => 'color: red; font-weight: bold;']);
}

echo $OUTPUT->footer();