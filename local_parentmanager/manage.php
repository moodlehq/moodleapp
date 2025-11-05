<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Parent Manager - Management Interface
 *
 * @package    local_parentmanager
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');
require_once($CFG->dirroot . '/local/parentmanager/lib.php');

admin_externalpage_setup('local_parentmanager_manage');

$action = optional_param('action', '', PARAM_ALPHA);
$studentid = optional_param('studentid', 0, PARAM_INT);
$confirm = optional_param('confirm', 0, PARAM_INT);

$PAGE->set_url('/local/parentmanager/manage.php');
$PAGE->set_title(get_string('manageparents', 'local_parentmanager'));
$PAGE->set_heading(get_string('manageparents', 'local_parentmanager'));

// Handle actions
if ($action && confirm_sesskey()) {
    switch ($action) {
        case 'syncstudent':
            if ($studentid && $confirm) {
                require_once($CFG->dirroot . '/user/profile/lib.php');
                $student = $DB->get_record('user', ['id' => $studentid], '*', MUST_EXIST);

                // Get sequence field from settings
                $sequencefield = get_config('local_parentmanager', 'sequencefield') ?: 'ID';

                profile_load_data($student);
                $fieldname = 'profile_field_' . $sequencefield;
                $sequence = $student->$fieldname ?? null;

                if ($sequence) {
                    $result = local_parentmanager_sync_student_parents($studentid, $sequence);
                    if ($result['success']) {
                        \core\notification::success(get_string('syncsuccessful', 'local_parentmanager', $result));
                        // Show individual errors if any occurred during sync
                        if (!empty($result['errors'])) {
                            foreach ($result['errors'] as $error) {
                                \core\notification::warning($error);
                            }
                        }
                    } else {
                        \core\notification::error(get_string('syncfailed', 'local_parentmanager'));
                        // Show specific error details
                        if (!empty($result['errors'])) {
                            foreach ($result['errors'] as $error) {
                                \core\notification::error($error);
                            }
                        }
                    }
                }
            }
            redirect(new moodle_url('/local/parentmanager/manage.php'));
            break;

        case 'testapi':
            $testsequence = optional_param('testsequence', '', PARAM_TEXT);
            if ($testsequence) {
                $apidata = local_parentmanager_get_student_parents_from_api($testsequence);
                if ($apidata) {
                    \core\notification::success(get_string('apitestsuccess', 'local_parentmanager'));
                } else {
                    \core\notification::error(get_string('apitestfailed', 'local_parentmanager'));
                }
            }
            redirect(new moodle_url('/local/parentmanager/manage.php', ['tab' => 'test']));
            break;

        case 'resetpassword':
            $parentid = optional_param('parentid', 0, PARAM_INT);
            if ($parentid && $confirm) {
                $result = local_parentmanager_reset_parent_password($parentid);
                if ($result['success']) {
                    // Store password in session to display once
                    $_SESSION['parent_password_reset'] = $result;
                    \core\notification::success('Password reset successful');
                } else {
                    \core\notification::error($result['error']);
                }
            }
            redirect(new moodle_url('/local/parentmanager/manage.php', ['tab' => 'links']));
            break;
    }
}

$tab = optional_param('tab', 'overview', PARAM_ALPHA);

echo $OUTPUT->header();

// Tab navigation
$tabs = [
    new tabobject('overview', new moodle_url('/local/parentmanager/manage.php', ['tab' => 'overview']), get_string('overview', 'local_parentmanager')),
    new tabobject('links', new moodle_url('/local/parentmanager/manage.php', ['tab' => 'links']), get_string('parentlinks', 'local_parentmanager')),
    new tabobject('students', new moodle_url('/local/parentmanager/manage.php', ['tab' => 'students']), get_string('students', 'local_parentmanager')),
    new tabobject('test', new moodle_url('/local/parentmanager/manage.php', ['tab' => 'test']), get_string('testapi', 'local_parentmanager')),
];
echo $OUTPUT->tabtree($tabs, $tab);

// Display password reset result if available
if (isset($_SESSION['parent_password_reset'])) {
    $result = $_SESSION['parent_password_reset'];
    echo html_writer::start_div('alert alert-success');
    echo html_writer::tag('h4', 'Password Reset Successful');
    echo html_writer::tag('p', 'New credentials for: ' . $result['firstname'] . ' ' . $result['lastname']);
    echo html_writer::tag('p', 'Email: ' . $result['email']);
    echo html_writer::tag('p', 'Username: ' . $result['username']);
    echo html_writer::tag('p', 'Password: ' . html_writer::tag('strong', $result['password']));
    echo html_writer::tag('p', 'IMPORTANT: Copy this password now! It will not be shown again.', ['class' => 'text-danger']);
    echo html_writer::end_div();
    unset($_SESSION['parent_password_reset']);
}

switch ($tab) {
    case 'overview':
        display_overview();
        break;
    case 'links':
        display_parent_links();
        break;
    case 'students':
        display_students();
        break;
    case 'test':
        display_api_test();
        break;
}

echo $OUTPUT->footer();

/**
 * Display overview statistics
 */
function display_overview() {
    global $DB, $OUTPUT;

    // Get statistics
    $stats = [];

    // Total students with sequences
    $sql = "SELECT COUNT(DISTINCT u.id)
            FROM {user} u
            JOIN {user_info_field} f ON f.shortname = :fieldname
            JOIN {user_info_data} d ON d.userid = u.id AND d.fieldid = f.id
            WHERE u.deleted = 0 AND d.data IS NOT NULL AND d.data != ''";
    $stats['total_students'] = $DB->count_records_sql($sql, ['fieldname' => get_config('local_parentmanager', 'sequencefield') ?: 'ID']);

    // Total parent accounts
    $parentrole = $DB->get_record('role', ['shortname' => get_config('local_parentmanager', 'parentrole') ?: 'parent']);
    if ($parentrole) {
        $sql = "SELECT COUNT(DISTINCT ra.userid)
                FROM {role_assignments} ra
                WHERE ra.roleid = :roleid";
        $stats['total_parents'] = $DB->count_records_sql($sql, ['roleid' => $parentrole->id]);

        // Total links
        $stats['total_links'] = $DB->count_records('role_assignments', ['roleid' => $parentrole->id]);
    } else {
        $stats['total_parents'] = 0;
        $stats['total_links'] = 0;
    }

    // Students without parents
    if ($parentrole) {
        $sql = "SELECT COUNT(DISTINCT u.id)
                FROM {user} u
                JOIN {role_assignments} ra ON ra.userid = u.id
                JOIN {role} r ON r.id = ra.roleid
                LEFT JOIN {user_info_field} f ON f.shortname = :fieldname
                LEFT JOIN {user_info_data} d ON d.userid = u.id AND d.fieldid = f.id
                WHERE u.deleted = 0
                AND r.shortname = :studentrole
                AND d.data IS NOT NULL
                AND d.data != ''
                AND NOT EXISTS (
                    SELECT 1 FROM {role_assignments} ra2
                    JOIN {context} ctx ON ctx.id = ra2.contextid
                    WHERE ra2.roleid = :parentroleid
                    AND ctx.contextlevel = :contextlevel
                    AND ctx.instanceid = u.id
                )";
        $stats['students_no_parents'] = $DB->count_records_sql($sql, [
            'fieldname' => get_config('local_parentmanager', 'sequencefield') ?: 'ID',
            'studentrole' => get_config('local_parentmanager', 'studentrole') ?: 'student',
            'parentroleid' => $parentrole->id,
            'contextlevel' => CONTEXT_USER
        ]);
    } else {
        $stats['students_no_parents'] = $stats['total_students'];
    }

    // Display cards
    echo html_writer::start_div('row');

    // Students card
    echo html_writer::start_div('col-md-3');
    echo html_writer::start_div('card mb-3');
    echo html_writer::start_div('card-body text-center');
    echo html_writer::tag('h1', $stats['total_students'], ['class' => 'display-4']);
    echo html_writer::tag('p', get_string('totalstudents', 'local_parentmanager'), ['class' => 'text-muted']);
    echo html_writer::end_div();
    echo html_writer::end_div();
    echo html_writer::end_div();

    // Parents card
    echo html_writer::start_div('col-md-3');
    echo html_writer::start_div('card mb-3');
    echo html_writer::start_div('card-body text-center');
    echo html_writer::tag('h1', $stats['total_parents'], ['class' => 'display-4']);
    echo html_writer::tag('p', get_string('totalparents', 'local_parentmanager'), ['class' => 'text-muted']);
    echo html_writer::end_div();
    echo html_writer::end_div();
    echo html_writer::end_div();

    // Links card
    echo html_writer::start_div('col-md-3');
    echo html_writer::start_div('card mb-3');
    echo html_writer::start_div('card-body text-center');
    echo html_writer::tag('h1', $stats['total_links'], ['class' => 'display-4']);
    echo html_writer::tag('p', get_string('totallinks', 'local_parentmanager'), ['class' => 'text-muted']);
    echo html_writer::end_div();
    echo html_writer::end_div();
    echo html_writer::end_div();

    // Students without parents card
    echo html_writer::start_div('col-md-3');
    echo html_writer::start_div('card mb-3');
    echo html_writer::start_div('card-body text-center');
    $badgeclass = $stats['students_no_parents'] > 0 ? 'text-warning' : 'text-success';
    echo html_writer::tag('h1', $stats['students_no_parents'], ['class' => "display-4 $badgeclass"]);
    echo html_writer::tag('p', get_string('studentsnoparents', 'local_parentmanager'), ['class' => 'text-muted']);
    echo html_writer::end_div();
    echo html_writer::end_div();
    echo html_writer::end_div();

    echo html_writer::end_div(); // row

    // Plugin status
    echo html_writer::start_div('mt-4');
    echo html_writer::tag('h3', get_string('pluginstatus', 'local_parentmanager'));

    $statusitems = [];

    // Check parent role
    if ($parentrole) {
        $statusitems[] = ['status' => 'success', 'message' => get_string('parentrolefound', 'local_parentmanager', $parentrole->shortname)];
    } else {
        $statusitems[] = ['status' => 'danger', 'message' => get_string('parentrolenotfound', 'local_parentmanager')];
    }

    // Check sequence field
    $sequencefield = $DB->get_record('user_info_field', ['shortname' => get_config('local_parentmanager', 'sequencefield') ?: 'ID']);
    if ($sequencefield) {
        $statusitems[] = ['status' => 'success', 'message' => get_string('sequencefieldfound', 'local_parentmanager', $sequencefield->shortname)];
    } else {
        $statusitems[] = ['status' => 'danger', 'message' => get_string('sequencefieldnotfound', 'local_parentmanager')];
    }

    // Check API URL
    $apiurl = get_config('local_parentmanager', 'apiurl') ?: 'https://aspire-school.odoo.com';
    $statusitems[] = ['status' => 'info', 'message' => get_string('apiurlconfigured', 'local_parentmanager', $apiurl)];

    // Display status items
    echo html_writer::start_tag('ul', ['class' => 'list-group']);
    foreach ($statusitems as $item) {
        $class = 'list-group-item list-group-item-' . $item['status'];
        echo html_writer::tag('li', $item['message'], ['class' => $class]);
    }
    echo html_writer::end_tag('ul');

    echo html_writer::end_div();

    // Quick actions
    echo html_writer::start_div('mt-4');
    echo html_writer::tag('h3', get_string('quickactions', 'local_parentmanager'));

    $buttons = html_writer::link(
        new moodle_url('/admin/tool/task/scheduledtasks.php'),
        get_string('viewscheduledtasks', 'local_parentmanager'),
        ['class' => 'btn btn-secondary mr-2']
    );
    $buttons .= html_writer::link(
        new moodle_url('/admin/settings.php', ['section' => 'local_parentmanager']),
        get_string('pluginsettings', 'local_parentmanager'),
        ['class' => 'btn btn-secondary mr-2']
    );
    $buttons .= html_writer::link(
        new moodle_url('/local/parentmanager/manage.php', ['tab' => 'test']),
        get_string('testapi', 'local_parentmanager'),
        ['class' => 'btn btn-primary']
    );

    echo html_writer::div($buttons);
    echo html_writer::end_div();
}

/**
 * Display parent-student links
 */
function display_parent_links() {
    global $DB, $OUTPUT;

    $page = optional_param('page', 0, PARAM_INT);
    $perpage = 25;

    $parentrole = $DB->get_record('role', ['shortname' => get_config('local_parentmanager', 'parentrole') ?: 'parent']);

    if (!$parentrole) {
        echo $OUTPUT->notification(get_string('parentrolenotfound', 'local_parentmanager'), 'error');
        return;
    }

    $sql = "SELECT ra.id, ra.userid as parentid, ra.timemodified,
                   p.firstname as parentfirst, p.lastname as parentlast, p.email as parentemail,
                   ctx.instanceid as studentid,
                   s.firstname as studentfirst, s.lastname as studentlast, s.email as studentemail
            FROM {role_assignments} ra
            JOIN {context} ctx ON ctx.id = ra.contextid
            JOIN {user} p ON p.id = ra.userid
            JOIN {user} s ON s.id = ctx.instanceid
            WHERE ra.roleid = :roleid
            AND ctx.contextlevel = :contextlevel
            AND p.deleted = 0
            AND s.deleted = 0
            ORDER BY ra.timemodified DESC";

    $total = $DB->count_records_sql(
        "SELECT COUNT(*) FROM ({$sql}) x",
        ['roleid' => $parentrole->id, 'contextlevel' => CONTEXT_USER]
    );

    $links = $DB->get_records_sql($sql, ['roleid' => $parentrole->id, 'contextlevel' => CONTEXT_USER], $page * $perpage, $perpage);

    echo html_writer::tag('p', get_string('totallinks', 'local_parentmanager') . ': ' . $total);

    // Export buttons
    echo html_writer::start_div('mb-3');
    echo html_writer::tag('h4', 'Export Parent Credentials');
    echo html_writer::tag('p', 'WARNING: This will reset passwords for all parents and export them to CSV. Use with caution.', ['class' => 'alert alert-warning']);

    $exportallurl = new moodle_url('/local/parentmanager/export.php', ['action' => 'exportall', 'sesskey' => sesskey()]);
    echo html_writer::link($exportallurl, 'Export All Parents with New Passwords', ['class' => 'btn btn-danger mr-2']);

    echo html_writer::end_div();

    $table = new html_table();
    $table->head = [
        get_string('parent', 'local_parentmanager'),
        get_string('email'),
        get_string('student', 'local_parentmanager'),
        get_string('email'),
        get_string('linkedon', 'local_parentmanager'),
        'Actions'
    ];
    $table->attributes['class'] = 'generaltable table table-striped';

    // Track unique parents to avoid duplicate reset buttons
    $seenparents = [];

    foreach ($links as $link) {
        $parentlink = html_writer::link(
            new moodle_url('/user/profile.php', ['id' => $link->parentid]),
            fullname((object)['firstname' => $link->parentfirst, 'lastname' => $link->parentlast])
        );
        $studentlink = html_writer::link(
            new moodle_url('/user/profile.php', ['id' => $link->studentid]),
            fullname((object)['firstname' => $link->studentfirst, 'lastname' => $link->studentlast])
        );

        // Add reset password button (only once per parent)
        $actions = '';
        if (!isset($seenparents[$link->parentid])) {
            $reseturl = new moodle_url('/local/parentmanager/manage.php', [
                'action' => 'resetpassword',
                'parentid' => $link->parentid,
                'confirm' => 1,
                'sesskey' => sesskey()
            ]);
            $actions = html_writer::link($reseturl, 'Reset Password', ['class' => 'btn btn-sm btn-warning']);
            $seenparents[$link->parentid] = true;
        }

        $table->data[] = [
            $parentlink,
            $link->parentemail,
            $studentlink,
            $link->studentemail,
            userdate($link->timemodified, get_string('strftimedatetime')),
            $actions
        ];
    }

    echo html_writer::table($table);
    echo $OUTPUT->paging_bar($total, $page, $perpage, new moodle_url('/local/parentmanager/manage.php', ['tab' => 'links']));
}

/**
 * Display students table
 */
function display_students() {
    global $DB, $OUTPUT;

    $page = optional_param('page', 0, PARAM_INT);
    $perpage = 25;
    $search = optional_param('search', '', PARAM_TEXT);

    $sequencefield = get_config('local_parentmanager', 'sequencefield') ?: 'ID';
    $parentrole = $DB->get_record('role', ['shortname' => get_config('local_parentmanager', 'parentrole') ?: 'parent']);

    // Search form
    echo html_writer::start_tag('form', ['method' => 'get', 'class' => 'mb-3']);
    echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'tab', 'value' => 'students']);
    echo html_writer::start_div('form-row align-items-center');
    echo html_writer::start_div('col-auto');
    echo html_writer::empty_tag('input', [
        'type' => 'text',
        'name' => 'search',
        'class' => 'form-control',
        'placeholder' => get_string('search'),
        'value' => $search
    ]);
    echo html_writer::end_div();
    echo html_writer::start_div('col-auto');
    echo html_writer::empty_tag('input', ['type' => 'submit', 'class' => 'btn btn-primary', 'value' => get_string('search')]);
    echo html_writer::end_div();
    echo html_writer::end_div();
    echo html_writer::end_tag('form');

    $sql = "SELECT u.id, u.firstname, u.lastname, u.email, d.data as sequence,
                   (SELECT COUNT(*) FROM {role_assignments} ra
                    JOIN {context} ctx ON ctx.id = ra.contextid
                    WHERE ra.roleid = :parentroleid
                    AND ctx.contextlevel = :contextlevel
                    AND ctx.instanceid = u.id) as parentcount
            FROM {user} u
            JOIN {user_info_field} f ON f.shortname = :fieldname
            JOIN {user_info_data} d ON d.userid = u.id AND d.fieldid = f.id
            WHERE u.deleted = 0
            AND d.data IS NOT NULL
            AND d.data != ''";

    $params = [
        'fieldname' => $sequencefield,
        'parentroleid' => $parentrole ? $parentrole->id : 0,
        'contextlevel' => CONTEXT_USER
    ];

    if ($search) {
        $sql .= " AND (" . $DB->sql_like('u.firstname', ':search1', false) .
                " OR " . $DB->sql_like('u.lastname', ':search2', false) .
                " OR " . $DB->sql_like('u.email', ':search3', false) .
                " OR " . $DB->sql_like('d.data', ':search4', false) . ")";
        $params['search1'] = '%' . $DB->sql_like_escape($search) . '%';
        $params['search2'] = '%' . $DB->sql_like_escape($search) . '%';
        $params['search3'] = '%' . $DB->sql_like_escape($search) . '%';
        $params['search4'] = '%' . $DB->sql_like_escape($search) . '%';
    }

    $sql .= " ORDER BY u.lastname, u.firstname";

    $total = $DB->count_records_sql("SELECT COUNT(*) FROM ({$sql}) x", $params);
    $students = $DB->get_records_sql($sql, $params, $page * $perpage, $perpage);

    $table = new html_table();
    $table->head = [
        get_string('student', 'local_parentmanager'),
        get_string('email'),
        get_string('sequence', 'local_parentmanager'),
        get_string('parentcount', 'local_parentmanager'),
        get_string('actions')
    ];
    $table->attributes['class'] = 'generaltable table table-striped';

    foreach ($students as $student) {
        $studentlink = html_writer::link(
            new moodle_url('/user/profile.php', ['id' => $student->id]),
            fullname($student)
        );

        $badge = $student->parentcount > 0 ?
            html_writer::span($student->parentcount, 'badge badge-success') :
            html_writer::span('0', 'badge badge-warning');

        $syncurl = new moodle_url('/local/parentmanager/manage.php', [
            'action' => 'syncstudent',
            'studentid' => $student->id,
            'confirm' => 1,
            'sesskey' => sesskey()
        ]);
        $syncbutton = html_writer::link($syncurl, get_string('syncnow', 'local_parentmanager'), ['class' => 'btn btn-sm btn-primary']);

        $table->data[] = [
            $studentlink,
            $student->email,
            $student->sequence,
            $badge,
            $syncbutton
        ];
    }

    echo html_writer::table($table);
    echo $OUTPUT->paging_bar($total, $page, $perpage, new moodle_url('/local/parentmanager/manage.php', ['tab' => 'students', 'search' => $search]));
}

/**
 * Display API test interface
 */
function display_api_test() {
    global $OUTPUT;

    $testsequence = optional_param('testsequence', '', PARAM_TEXT);

    echo html_writer::tag('h4', get_string('testapidescription', 'local_parentmanager'));

    // Test form
    echo html_writer::start_tag('form', ['method' => 'post', 'class' => 'mb-4']);
    echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'action', 'value' => 'testapi']);
    echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()]);
    echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'tab', 'value' => 'test']);

    echo html_writer::start_div('form-group');
    echo html_writer::tag('label', get_string('studentsequence', 'local_parentmanager'));
    echo html_writer::empty_tag('input', [
        'type' => 'text',
        'name' => 'testsequence',
        'class' => 'form-control',
        'placeholder' => 'STU001',
        'value' => $testsequence,
        'required' => 'required'
    ]);
    echo html_writer::end_div();

    echo html_writer::empty_tag('input', ['type' => 'submit', 'class' => 'btn btn-primary', 'value' => get_string('testapi', 'local_parentmanager')]);
    echo html_writer::end_tag('form');

    // If we have a test sequence, show results
    if ($testsequence) {
        echo html_writer::tag('h4', get_string('apiresponse', 'local_parentmanager'));

        $apiurl = get_config('local_parentmanager', 'apiurl') ?: 'https://aspire-school.odoo.com';
        $fullurl = $apiurl . '/api/student/' . urlencode($testsequence) . '/parents';

        echo html_writer::tag('p', get_string('requestingurl', 'local_parentmanager', $fullurl), ['class' => 'text-muted']);

        $apidata = local_parentmanager_get_student_parents_from_api($testsequence);

        if ($apidata) {
            echo html_writer::start_div('alert alert-success');
            echo html_writer::tag('strong', '✓ API Request Successful');
            echo html_writer::end_div();

            echo html_writer::tag('h5', 'Response:');
            echo html_writer::tag('pre', json_encode($apidata, JSON_PRETTY_PRINT), ['class' => 'bg-light p-3 border']);

            if (isset($apidata->parents) && is_array($apidata->parents)) {
                echo html_writer::tag('h5', get_string('parentsfound', 'local_parentmanager', count($apidata->parents)));

                if (count($apidata->parents) > 0) {
                    $table = new html_table();
                    $table->head = ['Type', 'Name', 'Email', 'Mobile', 'Sequence'];
                    $table->attributes['class'] = 'generaltable table table-sm';

                    foreach ($apidata->parents as $parent) {
                        $table->data[] = [
                            $parent->type ?? '',
                            ($parent->first_name ?? '') . ' ' . ($parent->last_name ?? ''),
                            $parent->email ?? '',
                            $parent->mobile ?? '',
                            $parent->sequence ?? ''
                        ];
                    }

                    echo html_writer::table($table);
                }
            }
        } else {
            echo html_writer::start_div('alert alert-danger');
            echo html_writer::tag('strong', '✗ API Request Failed');
            echo html_writer::tag('p', 'Check that:');
            echo html_writer::start_tag('ul');
            echo html_writer::tag('li', 'The API URL is correct in plugin settings');
            echo html_writer::tag('li', 'The student sequence exists in Odoo');
            echo html_writer::tag('li', 'The Moodle server can reach the Odoo server');
            echo html_writer::tag('li', 'The API endpoint is implemented in Odoo');
            echo html_writer::end_tag('ul');
            echo html_writer::end_div();
        }
    }

    // API documentation link
    echo html_writer::start_div('mt-4 p-3 bg-light border');
    echo html_writer::tag('h5', get_string('apidocumentation', 'local_parentmanager'));
    echo html_writer::tag('p', get_string('apidocumentation_desc', 'local_parentmanager'));
    $doclink = html_writer::link(
        new moodle_url('/local/parentmanager/API_SPEC.md'),
        'API_SPEC.md',
        ['target' => '_blank']
    );
    echo html_writer::tag('p', get_string('viewapidocs', 'local_parentmanager', $doclink));
    echo html_writer::end_div();
}
