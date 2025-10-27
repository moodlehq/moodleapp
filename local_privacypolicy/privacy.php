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
 * Public privacy policy page
 *
 * This page is publicly accessible without login, suitable for app store requirements.
 *
 * @package    local_privacypolicy
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// No login required - this makes the page publicly accessible.
define('NO_LOGIN', '1');

require_once(__DIR__ . '/../../config.php');

$PAGE->set_context(context_system::instance());
$PAGE->set_url('/local/privacypolicy/privacy.php');
$PAGE->set_title(get_string('pluginname', 'local_privacypolicy'));
$PAGE->set_heading(get_string('privacypolicy', 'local_privacypolicy'));
$PAGE->set_pagelayout('standard');

echo $OUTPUT->header();

echo html_writer::start_div('privacy-policy-content');
echo html_writer::tag('h1', get_string('privacypolicy', 'local_privacypolicy'));

// Effective date
echo html_writer::tag('p', get_string('effectivedate', 'local_privacypolicy'), ['class' => 'text-muted font-italic']);

// Privacy policy content
echo html_writer::start_div('privacy-content');

// Introduction
echo html_writer::tag('h2', get_string('section_introduction', 'local_privacypolicy'));
echo html_writer::div(get_string('section_introduction_desc', 'local_privacypolicy'));

// 1. Information We Collect
echo html_writer::tag('h2', get_string('section_datacollection', 'local_privacypolicy'));
echo html_writer::div(get_string('section_datacollection_desc', 'local_privacypolicy'));

// 2. How We Use Your Information
echo html_writer::tag('h2', get_string('section_datausage', 'local_privacypolicy'));
echo html_writer::div(get_string('section_datausage_desc', 'local_privacypolicy'));

// 3. Data Storage and Security
echo html_writer::tag('h2', get_string('section_datastorage', 'local_privacypolicy'));
echo html_writer::div(get_string('section_datastorage_desc', 'local_privacypolicy'));

// 4. Third-Party Services
echo html_writer::tag('h2', get_string('section_thirdparty', 'local_privacypolicy'));
echo html_writer::div(get_string('section_thirdparty_desc', 'local_privacypolicy'));

// 5. App Permissions
echo html_writer::tag('h2', get_string('section_permissions', 'local_privacypolicy'));
echo html_writer::div(get_string('section_permissions_desc', 'local_privacypolicy'));

// 6. Your Rights and Choices
echo html_writer::tag('h2', get_string('section_userrights', 'local_privacypolicy'));
echo html_writer::div(get_string('section_userrights_desc', 'local_privacypolicy'));

// 7. Data Sharing
echo html_writer::tag('h2', get_string('section_datasharing', 'local_privacypolicy'));
echo html_writer::div(get_string('section_datasharing_desc', 'local_privacypolicy'));

// 8. Data Retention
echo html_writer::tag('h2', get_string('section_dataretention', 'local_privacypolicy'));
echo html_writer::div(get_string('section_dataretention_desc', 'local_privacypolicy'));

// 9. Children's Privacy
echo html_writer::tag('h2', get_string('section_children', 'local_privacypolicy'));
echo html_writer::div(get_string('section_children_desc', 'local_privacypolicy'));

// 10. Changes to This Policy
echo html_writer::tag('h2', get_string('section_changes', 'local_privacypolicy'));
echo html_writer::div(get_string('section_changes_desc', 'local_privacypolicy'));

// 11. Contact Information
echo html_writer::tag('h2', get_string('section_contact', 'local_privacypolicy'));
echo html_writer::div(get_string('section_contact_desc', 'local_privacypolicy'));

echo html_writer::end_div();

// Last updated date
echo html_writer::tag('hr', '');
echo html_writer::tag('div',
    get_string('lastupdated', 'local_privacypolicy', userdate(time(), get_string('strftimedatefullshort'))),
    ['class' => 'last-updated text-muted text-center mt-4 mb-4']
);

echo html_writer::end_div();

echo $OUTPUT->footer();
