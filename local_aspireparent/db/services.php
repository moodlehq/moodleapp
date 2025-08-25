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
 * Web service definitions for local_aspireparent
 *
 * @package    local_aspireparent
 * @copyright  2024 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$services = array(
    'Aspire Parent Service' => array(
        'functions' => array(
            'local_aspireparent_get_mentees',
            'local_aspireparent_get_parent_info',
            'local_aspireparent_get_mentee_courses',
            'local_aspireparent_get_mentee_course_contents',
            'local_aspireparent_get_mentee_module',
            'local_aspireparent_get_mentee_grades',
            'local_aspireparent_get_mentee_activity_info',
            'local_aspireparent_get_mentee_assignments',
            'local_aspireparent_get_mentee_quizzes',
            'local_aspireparent_get_mentee_quiz_attempts',
            'local_aspireparent_get_mentee_assignment_submissions',
            'local_aspireparent_get_mentee_forums',
            'local_aspireparent_get_mentee_course_teachers',
            'local_aspireparent_get_mentee_course_grades',
            'local_aspireparent_get_all_course_grades'
        ),
        'restrictedusers' => 0,
        'enabled' => 1,
        'shortname' => 'local_aspireparent_service',
        'downloadfiles' => 1,
        'uploadfiles' => 0
    )
);

$functions = array(
    'local_aspireparent_get_mentees' => array(
        'classname' => 'local_aspireparent\external\get_mentees',
        'methodname' => 'execute',
        'description' => 'Get list of mentees for a parent/mentor user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_parent_info' => array(
        'classname' => 'local_aspireparent\external\get_parent_info',
        'methodname' => 'execute',
        'description' => 'Get parent role information for current user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_courses' => array(
        'classname' => 'local_aspireparent\external\get_mentee_courses',
        'methodname' => 'execute',
        'description' => 'Get courses for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_course_contents' => array(
        'classname' => 'local_aspireparent\external\get_mentee_course_contents',
        'methodname' => 'execute',
        'description' => 'Get course contents for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_module' => array(
        'classname' => 'local_aspireparent\external\get_mentee_module',
        'methodname' => 'execute',
        'description' => 'Get module information for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_grades' => array(
        'classname' => 'local_aspireparent\external\get_mentee_grades',
        'methodname' => 'execute',
        'description' => 'Get grades for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_activity_info' => array(
        'classname' => 'local_aspireparent\external\get_mentee_activity_info',
        'methodname' => 'execute',
        'description' => 'Get activity information for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_assignments' => array(
        'classname' => 'local_aspireparent\external\get_mentee_assignments',
        'methodname' => 'execute',
        'description' => 'Get assignments for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_quizzes' => array(
        'classname' => 'local_aspireparent\external\get_mentee_quizzes',
        'methodname' => 'execute',
        'description' => 'Get quizzes for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_quiz_attempts' => array(
        'classname' => 'local_aspireparent\external\get_mentee_quiz_attempts',
        'methodname' => 'execute',
        'description' => 'Get quiz attempts for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_assignment_submissions' => array(
        'classname' => 'local_aspireparent\external\get_mentee_assignment_submissions',
        'methodname' => 'execute',
        'description' => 'Get assignment submissions for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_forums' => array(
        'classname' => 'local_aspireparent\external\get_mentee_forums',
        'methodname' => 'execute',
        'description' => 'Get forums for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_course_teachers' => array(
        'classname' => 'local_aspireparent\external\get_mentee_course_teachers',
        'methodname' => 'execute',
        'description' => 'Get teachers in a course for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_mentee_course_grades' => array(
        'classname' => 'local_aspireparent\external\get_mentee_course_grades',
        'methodname' => 'execute',
        'description' => 'Get course grades overview for a mentee user',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    ),
    'local_aspireparent_get_all_course_grades' => array(
        'classname' => 'local_aspireparent\external\get_all_course_grades',
        'methodname' => 'execute',
        'description' => 'Get all course grades including courses with showgrades disabled',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => '',
        'services' => array('local_aspireparent_service', MOODLE_OFFICIAL_MOBILE_SERVICE)
    )
);