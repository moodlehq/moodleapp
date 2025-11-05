<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Plugin settings for local_parentmanager
 *
 * @package    local_parentmanager
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_parentmanager', get_string('pluginname', 'local_parentmanager'));

    // Add link to management page at the top
    $manageurl = new moodle_url('/local/parentmanager/manage.php');
    $managelink = html_writer::link($manageurl, get_string('manageparents', 'local_parentmanager'), ['class' => 'btn btn-primary']);
    $settings->add(new admin_setting_heading(
        'local_parentmanager/managelink',
        '',
        html_writer::div($managelink, 'mb-3')
    ));

    // API URL setting
    $settings->add(new admin_setting_configtext(
        'local_parentmanager/apiurl',
        get_string('apiurl', 'local_parentmanager'),
        get_string('apiurl_desc', 'local_parentmanager'),
        'https://aspire-school.odoo.com',
        PARAM_URL
    ));

    // API timeout
    $settings->add(new admin_setting_configtext(
        'local_parentmanager/apitimeout',
        get_string('apitimeout', 'local_parentmanager'),
        get_string('apitimeout_desc', 'local_parentmanager'),
        30,
        PARAM_INT
    ));

    // Student role shortname
    $settings->add(new admin_setting_configtext(
        'local_parentmanager/studentrole',
        get_string('studentrole', 'local_parentmanager'),
        get_string('studentrole_desc', 'local_parentmanager'),
        'student',
        PARAM_TEXT
    ));

    // Parent role shortname
    $settings->add(new admin_setting_configtext(
        'local_parentmanager/parentrole',
        get_string('parentrole', 'local_parentmanager'),
        get_string('parentrole_desc', 'local_parentmanager'),
        'parent',
        PARAM_TEXT
    ));

    // Sequence field shortname
    $settings->add(new admin_setting_configtext(
        'local_parentmanager/sequencefield',
        get_string('sequencefield', 'local_parentmanager'),
        get_string('sequencefield_desc', 'local_parentmanager'),
        'ID',
        PARAM_TEXT
    ));

    // Enable/disable email notifications
    $settings->add(new admin_setting_configcheckbox(
        'local_parentmanager/sendemails',
        get_string('sendemails', 'local_parentmanager'),
        get_string('sendemails_desc', 'local_parentmanager'),
        1
    ));

    // Enable/disable automatic sync
    $settings->add(new admin_setting_configcheckbox(
        'local_parentmanager/enableautosync',
        get_string('enableautosync', 'local_parentmanager'),
        get_string('enableautosync_desc', 'local_parentmanager'),
        1
    ));

    // Debug mode
    $settings->add(new admin_setting_configcheckbox(
        'local_parentmanager/debugmode',
        get_string('debugmode', 'local_parentmanager'),
        get_string('debugmode_desc', 'local_parentmanager'),
        0
    ));

    $ADMIN->add('localplugins', $settings);

    // Add management page to admin menu
    $ADMIN->add('localplugins',
        new admin_externalpage(
            'local_parentmanager_manage',
            get_string('manageparents', 'local_parentmanager'),
            new moodle_url('/local/parentmanager/manage.php'),
            'local/parentmanager:manageparents'
        )
    );
}
