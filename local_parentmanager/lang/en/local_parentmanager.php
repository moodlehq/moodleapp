<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * English language strings for local_parentmanager
 *
 * @package    local_parentmanager
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$string['pluginname'] = 'Parent Manager';
$string['privacy:metadata'] = 'The Parent Manager plugin does not store any personal data itself. It creates user accounts which are managed by Moodle core.';

// Capabilities
$string['parentmanager:manageparents'] = 'Manage parent accounts and synchronization';

// Tasks
$string['syncparentstask'] = 'Sync parents from Odoo API';

// Errors
$string['nostudentsequence'] = 'Student does not have a sequence number in custom field ID';

// Email templates
$string['parentcredentialssubject'] = '{$a} - Your Parent Account';
$string['parentcredentialsmessage'] = 'Dear {$a->firstname},

A parent account has been created for you at {$a->sitename}.

Your login credentials are:
Username: {$a->username}
Password: {$a->password}

You can log in at: {$a->loginurl}

Or download our mobile app: {$a->mobileappurl}

After logging in, you will be able to view your child\'s:
- Courses and assignments
- Grades and progress
- Teacher messages
- Financial information

If you have any questions, please contact the school.

Best regards,
{$a->sitename}';

$string['parentcredentialsmessagehtml'] = '<p>Dear {$a->firstname},</p>

<p>A parent account has been created for you at <strong>{$a->sitename}</strong>.</p>

<h3>Your Login Credentials</h3>
<ul>
<li><strong>Username:</strong> {$a->username}</li>
<li><strong>Password:</strong> {$a->password}</li>
</ul>

<p><a href="{$a->loginurl}">Click here to log in</a></p>

<p>Or download our mobile app: <a href="{$a->mobileappurl}">Aspire School App</a></p>

<h3>What You Can Do</h3>
<p>After logging in, you will be able to view your child\'s:</p>
<ul>
<li>Courses and assignments</li>
<li>Grades and progress</li>
<li>Teacher messages</li>
<li>Financial information</li>
</ul>

<p>If you have any questions, please contact the school.</p>

<p>Best regards,<br>{$a->sitename}</p>';
