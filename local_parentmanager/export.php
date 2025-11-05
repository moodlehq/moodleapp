<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Export parent credentials
 *
 * @package    local_parentmanager
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');
require_once($CFG->dirroot . '/local/parentmanager/lib.php');

require_login();
require_capability('local/parentmanager:manageparents', context_system::instance());
require_sesskey();

$action = required_param('action', PARAM_ALPHA);

if ($action === 'exportall') {
    // Get all parents
    $parents = local_parentmanager_get_all_parents();

    if (empty($parents)) {
        redirect(new moodle_url('/local/parentmanager/manage.php', ['tab' => 'links']),
                 'No parents found to export', null, \core\notification::ERROR);
        exit;
    }

    // Reset passwords and collect credentials
    $credentials = [];
    foreach ($parents as $parent) {
        $result = local_parentmanager_reset_parent_password($parent->id);
        if ($result['success']) {
            $credentials[] = [
                'firstname' => $result['firstname'],
                'lastname' => $result['lastname'],
                'email' => $result['email'],
                'username' => $result['username'],
                'password' => $result['password']
            ];
        }
    }

    // Generate CSV
    $filename = 'parent_credentials_' . date('Y-m-d_His') . '.csv';

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');

    $output = fopen('php://output', 'w');

    // CSV header
    fputcsv($output, ['First Name', 'Last Name', 'Email', 'Username', 'Password']);

    // CSV data
    foreach ($credentials as $cred) {
        fputcsv($output, [
            $cred['firstname'],
            $cred['lastname'],
            $cred['email'],
            $cred['username'],
            $cred['password']
        ]);
    }

    fclose($output);
    exit;

} else if ($action === 'exportselected') {
    $parentids = required_param('parentids', PARAM_TEXT);
    $parentids = explode(',', $parentids);
    $parentids = array_filter(array_map('intval', $parentids));

    if (empty($parentids)) {
        redirect(new moodle_url('/local/parentmanager/manage.php', ['tab' => 'links']),
                 'No parents selected', null, \core\notification::ERROR);
        exit;
    }

    // Reset passwords and collect credentials
    $credentials = [];
    foreach ($parentids as $parentid) {
        $result = local_parentmanager_reset_parent_password($parentid);
        if ($result['success']) {
            $credentials[] = [
                'firstname' => $result['firstname'],
                'lastname' => $result['lastname'],
                'email' => $result['email'],
                'username' => $result['username'],
                'password' => $result['password']
            ];
        }
    }

    if (empty($credentials)) {
        redirect(new moodle_url('/local/parentmanager/manage.php', ['tab' => 'links']),
                 'Failed to reset passwords', null, \core\notification::ERROR);
        exit;
    }

    // Generate CSV
    $filename = 'parent_credentials_' . date('Y-m-d_His') . '.csv';

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');

    $output = fopen('php://output', 'w');

    // CSV header
    fputcsv($output, ['First Name', 'Last Name', 'Email', 'Username', 'Password']);

    // CSV data
    foreach ($credentials as $cred) {
        fputcsv($output, [
            $cred['firstname'],
            $cred['lastname'],
            $cred['email'],
            $cred['username'],
            $cred['password']
        ]);
    }

    fclose($output);
    exit;
}

redirect(new moodle_url('/local/parentmanager/manage.php', ['tab' => 'links']));
