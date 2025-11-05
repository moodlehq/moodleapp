<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Library functions for local_parentmanager
 *
 * @package    local_parentmanager
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

define('LOCAL_PARENTMANAGER_API_URL', 'https://aspire-school.odoo.com');

/**
 * Call Odoo API to get parents for a student
 *
 * @param string $studentsequence Student sequence number
 * @return object|false API response or false on failure
 */
function local_parentmanager_get_student_parents_from_api($studentsequence) {
    $url = LOCAL_PARENTMANAGER_API_URL . '/api/student/' . urlencode($studentsequence) . '/parents';

    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_TIMEOUT, 30);
    curl_setopt($curl, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Content-Type: application/json'
    ]);

    $response = curl_exec($curl);
    $httpcode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($httpcode !== 200 || !$response) {
        debugging('Failed to fetch parents from API for student: ' . $studentsequence, DEBUG_DEVELOPER);
        return false;
    }

    $data = json_decode($response);
    if (!$data || !$data->success) {
        return false;
    }

    return $data;
}

/**
 * Create or update parent user account
 *
 * @param object $parentdata Parent data from API
 * @return int Parent user ID
 */
function local_parentmanager_create_or_update_parent($parentdata) {
    global $DB, $CFG;
    require_once($CFG->dirroot . '/user/lib.php');

    // Check if parent exists by email
    $existing = $DB->get_record('user', ['email' => $parentdata->email, 'deleted' => 0]);

    if ($existing) {
        // Update existing user
        $existing->firstname = $parentdata->first_name;
        $existing->lastname = $parentdata->last_name;
        $existing->phone1 = isset($parentdata->phone) ? $parentdata->phone : '';
        $existing->phone2 = isset($parentdata->mobile) ? $parentdata->mobile : '';

        // Update custom field for sequence
        if (isset($parentdata->sequence)) {
            profile_save_data((object)[
                'id' => $existing->id,
                'profile_field_ID' => $parentdata->sequence
            ]);
        }

        user_update_user($existing, false, false);
        return $existing->id;
    }

    // Create new user
    $user = new stdClass();
    $user->username = strtolower(str_replace(['@', '.', '+', ' '], ['_', '_', '_', '_'], $parentdata->email));

    // Ensure unique username
    $baseusername = $user->username;
    $counter = 1;
    while ($DB->record_exists('user', ['username' => $user->username, 'deleted' => 0])) {
        $user->username = $baseusername . $counter;
        $counter++;
    }

    $user->firstname = $parentdata->first_name;
    $user->lastname = $parentdata->last_name;
    $user->email = $parentdata->email;
    $user->phone1 = isset($parentdata->phone) ? $parentdata->phone : '';
    $user->phone2 = isset($parentdata->mobile) ? $parentdata->mobile : '';
    $user->city = '';
    $user->country = 'AE';
    $user->confirmed = 1;
    $user->mnethostid = $CFG->mnet_localhost_id;
    $user->auth = 'manual';
    $user->lang = $CFG->lang;

    // Create user
    $user->id = user_create_user($user, true, false);

    // Generate and set password
    $password = generate_password(12);
    update_internal_user_password($user, $password);

    // Save sequence to custom field
    if (isset($parentdata->sequence)) {
        profile_save_data((object)[
            'id' => $user->id,
            'profile_field_ID' => $parentdata->sequence
        ]);
    }

    // Send credentials email
    local_parentmanager_send_credentials_email($user, $password);

    return $user->id;
}

/**
 * Link parent to student via role assignment
 *
 * @param int $parentid Parent user ID
 * @param int $studentid Student user ID
 * @return bool Success status
 */
function local_parentmanager_link_parent_to_student($parentid, $studentid) {
    global $DB;

    // Get parent role
    $parentrole = $DB->get_record('role', ['shortname' => 'parent']);
    if (!$parentrole) {
        debugging('Parent role not found! Please create a role with shortname "parent"', DEBUG_DEVELOPER);
        return false;
    }

    // Get student user context
    $studentcontext = context_user::instance($studentid);

    // Check if already assigned
    if (user_has_role_assignment($parentid, $parentrole->id, $studentcontext->id)) {
        return true; // Already linked
    }

    // Assign parent role
    role_assign($parentrole->id, $parentid, $studentcontext->id);

    return true;
}

/**
 * Send login credentials to parent via email
 *
 * @param stdClass $parent Parent user object
 * @param string $password Plain text password
 * @return bool Success status
 */
function local_parentmanager_send_credentials_email($parent, $password) {
    global $CFG, $SITE;

    $from = core_user::get_support_user();
    $subject = get_string('parentcredentialssubject', 'local_parentmanager', $SITE->fullname);

    $messagedata = [
        'sitename' => $SITE->fullname,
        'siteurl' => $CFG->wwwroot,
        'username' => $parent->username,
        'password' => $password,
        'email' => $parent->email,
        'firstname' => $parent->firstname,
        'loginurl' => $CFG->wwwroot . '/login/index.php',
        'mobileappurl' => 'https://apps.apple.com/app/aspire-school/id633359593' // Update with your app URL
    ];

    $message = get_string('parentcredentialsmessage', 'local_parentmanager', $messagedata);
    $messagehtml = get_string('parentcredentialsmessagehtml', 'local_parentmanager', $messagedata);

    return email_to_user($parent, $from, $subject, $message, $messagehtml);
}

/**
 * Sync parents for a specific student
 *
 * @param int $studentid Student user ID
 * @param string $studentsequence Student sequence number
 * @return array Result with counts
 */
function local_parentmanager_sync_student_parents($studentid, $studentsequence) {
    $result = [
        'success' => false,
        'student_id' => $studentid,
        'student_sequence' => $studentsequence,
        'parents_created' => 0,
        'parents_updated' => 0,
        'parents_linked' => 0,
        'errors' => []
    ];

    // Call API
    $apidata = local_parentmanager_get_student_parents_from_api($studentsequence);

    if (!$apidata || !isset($apidata->parents)) {
        $result['errors'][] = 'No parent data from API';
        return $result;
    }

    foreach ($apidata->parents as $parentdata) {
        try {
            // Check if exists
            global $DB;
            $existing = $DB->get_record('user', ['email' => $parentdata->email, 'deleted' => 0]);

            // Create or update
            $parentid = local_parentmanager_create_or_update_parent($parentdata);

            if ($existing) {
                $result['parents_updated']++;
            } else {
                $result['parents_created']++;
            }

            // Link to student
            if (local_parentmanager_link_parent_to_student($parentid, $studentid)) {
                $result['parents_linked']++;
            }

        } catch (Exception $e) {
            $result['errors'][] = 'Parent ' . $parentdata->email . ': ' . $e->getMessage();
        }
    }

    $result['success'] = true;
    return $result;
}
