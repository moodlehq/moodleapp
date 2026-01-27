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
 * Public app download page
 *
 * This page is publicly accessible without login, suitable for app store requirements
 * and Moodle mobile app banner configuration.
 *
 * @package    local_appdownload
 * @copyright  2025 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// No login required - this makes the page publicly accessible.
define('NO_MOODLE_COOKIES', true);

require_once(__DIR__ . '/../../config.php');

$PAGE->set_context(context_system::instance());
$PAGE->set_url('/local/appdownload/download.php');
$PAGE->set_title(get_string('pluginname', 'local_appdownload'));
$PAGE->set_heading(get_string('pageheading', 'local_appdownload'));
$PAGE->set_pagelayout('standard');

// Add custom CSS for the download page.
$PAGE->requires->css(new moodle_url('/local/appdownload/styles.css'));

echo $OUTPUT->header();

echo html_writer::start_div('app-download-content text-center');

// App logo/icon.
echo html_writer::start_div('app-logo mb-4');
echo html_writer::img(
    new moodle_url('/local/appdownload/pix/app-icon.png'),
    get_string('appname', 'local_appdownload'),
    ['class' => 'app-icon', 'width' => '120', 'height' => '120']
);
echo html_writer::end_div();

// App name and tagline.
echo html_writer::tag('h1', get_string('appname', 'local_appdownload'), ['class' => 'app-title']);
echo html_writer::tag('p', get_string('apptagline', 'local_appdownload'), ['class' => 'app-tagline text-muted mb-4']);

// Description.
echo html_writer::start_div('app-description mb-4');
echo html_writer::tag('p', get_string('appdescription', 'local_appdownload'));
echo html_writer::end_div();

// Download buttons.
echo html_writer::start_div('download-buttons mb-4');

// App Store button.
echo html_writer::start_tag('a', [
    'href' => get_string('appstore_url', 'local_appdownload'),
    'target' => '_blank',
    'class' => 'download-button appstore-button m-2',
    'aria-label' => get_string('downloadappstore', 'local_appdownload'),
]);
echo html_writer::img(
    new moodle_url('/local/appdownload/pix/appstore-badge.svg'),
    get_string('downloadappstore', 'local_appdownload'),
    ['class' => 'store-badge']
);
echo html_writer::end_tag('a');

// Google Play button.
echo html_writer::start_tag('a', [
    'href' => get_string('playstore_url', 'local_appdownload'),
    'target' => '_blank',
    'class' => 'download-button playstore-button m-2',
    'aria-label' => get_string('downloadplaystore', 'local_appdownload'),
]);
echo html_writer::img(
    new moodle_url('/local/appdownload/pix/googleplay-badge.svg'),
    get_string('downloadplaystore', 'local_appdownload'),
    ['class' => 'store-badge']
);
echo html_writer::end_tag('a');

echo html_writer::end_div();

// What Makes It Special section.
echo html_writer::start_div('app-features mb-4');
echo html_writer::tag('h2', get_string('features', 'local_appdownload'), ['class' => 'h4']);
echo html_writer::start_tag('ul', ['class' => 'list-unstyled features-list']);
echo html_writer::tag('li', get_string('feature_courses', 'local_appdownload'));
echo html_writer::tag('li', get_string('feature_offline', 'local_appdownload'));
echo html_writer::tag('li', get_string('feature_notifications', 'local_appdownload'));
echo html_writer::tag('li', get_string('feature_assignments', 'local_appdownload'));
echo html_writer::end_tag('ul');
echo html_writer::end_div();

// For Students section.
echo html_writer::start_div('app-section mb-4');
echo html_writer::tag('h2', get_string('forstudents', 'local_appdownload'), ['class' => 'h4']);
echo html_writer::start_tag('ul', ['class' => 'list-unstyled features-list']);
echo html_writer::tag('li', get_string('student_feature1', 'local_appdownload'));
echo html_writer::tag('li', get_string('student_feature2', 'local_appdownload'));
echo html_writer::tag('li', get_string('student_feature3', 'local_appdownload'));
echo html_writer::tag('li', get_string('student_feature4', 'local_appdownload'));
echo html_writer::tag('li', get_string('student_feature5', 'local_appdownload'));
echo html_writer::end_tag('ul');
echo html_writer::end_div();

// For Parents section.
echo html_writer::start_div('app-section app-parents mb-4');
echo html_writer::tag('h2', get_string('forparents', 'local_appdownload'), ['class' => 'h4']);
echo html_writer::tag('p', get_string('parent_intro', 'local_appdownload'));
echo html_writer::start_tag('ul', ['class' => 'list-unstyled features-list']);
echo html_writer::tag('li', get_string('parent_feature1', 'local_appdownload'));
echo html_writer::tag('li', get_string('parent_feature2', 'local_appdownload'));
echo html_writer::tag('li', get_string('parent_feature3', 'local_appdownload'));
echo html_writer::tag('li', get_string('parent_feature4', 'local_appdownload'));
echo html_writer::tag('li', get_string('parent_feature5', 'local_appdownload'));
echo html_writer::end_tag('ul');
echo html_writer::end_div();

// Requirements section.
echo html_writer::start_div('app-requirements mb-4');
echo html_writer::tag('h2', get_string('requirements', 'local_appdownload'), ['class' => 'h4']);
echo html_writer::tag('p', get_string('requirements_account', 'local_appdownload'), ['class' => 'font-weight-bold']);
echo html_writer::tag('p', get_string('requirements_ios', 'local_appdownload'));
echo html_writer::tag('p', get_string('requirements_android', 'local_appdownload'));
echo html_writer::end_div();

// Support section.
echo html_writer::start_div('app-support mb-4');
echo html_writer::tag('h2', get_string('support', 'local_appdownload'), ['class' => 'h4']);
echo html_writer::tag('p', get_string('support_desc', 'local_appdownload'));
echo html_writer::end_div();

// Version info.
echo html_writer::tag('p', get_string('currentversion', 'local_appdownload'), ['class' => 'text-muted small']);

echo html_writer::end_div();

echo $OUTPUT->footer();
