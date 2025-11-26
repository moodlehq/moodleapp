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

namespace local_aspireparent\external;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/externallib.php');

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_module;
use context_course;
use context_user;
use moodle_url;

/**
 * Get images from a lightboxgallery module
 *
 * @package    local_aspireparent
 * @copyright  2024 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_lightboxgallery_images extends external_api {

    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module ID'),
            'userid' => new external_value(PARAM_INT, 'The mentee user id', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Get lightboxgallery images
     *
     * @param int $cmid Course module ID
     * @param int $userid The mentee user id (0 for current user)
     * @return array
     */
    public static function execute($cmid, $userid = 0) {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'cmid' => $cmid,
            'userid' => $userid,
        ]);

        $cmid = $params['cmid'];
        $userid = $params['userid'];

        // If userid is 0, use current user
        if ($userid == 0) {
            $userid = $USER->id;
        }

        // Get course module
        $cm = get_coursemodule_from_id('lightboxgallery', $cmid, 0, false, MUST_EXIST);
        $context = context_module::instance($cm->id);
        $coursecontext = context_course::instance($cm->course);

        // Check if this is a parent viewing their mentee's module
        $isparent = false;
        if ($userid != $USER->id) {
            // Check if current user is a parent of the requested user
            $sql = "SELECT DISTINCT u.id
                    FROM {role_assignments} ra
                    JOIN {context} c ON ra.contextid = c.id
                    JOIN {user} u ON c.instanceid = u.id
                    WHERE ra.userid = :parentid
                    AND c.contextlevel = :contextlevel
                    AND u.id = :menteeid";

            $parentparams = [
                'parentid' => $USER->id,
                'contextlevel' => CONTEXT_USER,
                'menteeid' => $userid,
            ];

            $isparent = $DB->record_exists_sql($sql, $parentparams);

            if (!$isparent) {
                throw new \moodle_exception('nopermissions', 'error', '', 'view this gallery');
            }
        }

        // Check if the user (current user or mentee) is enrolled in the course
        $enrolled = is_enrolled($coursecontext, $userid, '', true);
        if (!$enrolled) {
            throw new \moodle_exception('usernotenrolled', 'error');
        }

        // Get the gallery record
        $gallery = $DB->get_record('lightboxgallery', ['id' => $cm->instance], '*', MUST_EXIST);

        // Get files from the gallery_images file area
        $fs = get_file_storage();
        $files = $fs->get_area_files($context->id, 'mod_lightboxgallery', 'gallery_images', 0, 'filename', false);

        $images = [];
        foreach ($files as $file) {
            if ($file->is_directory()) {
                continue;
            }

            $mimetype = $file->get_mimetype();
            if (strpos($mimetype, 'image/') !== 0) {
                continue;
            }

            // Build the pluginfile URL for web service (mobile app compatible)
            $fileurl = moodle_url::make_webservice_pluginfile_url(
                $context->id,
                'mod_lightboxgallery',
                'gallery_images',
                $file->get_itemid(),
                $file->get_filepath(),
                $file->get_filename()
            )->out(false);

            // Build thumbnail URL for web service
            $thumburl = moodle_url::make_webservice_pluginfile_url(
                $context->id,
                'mod_lightboxgallery',
                'gallery_thumbs',
                0,
                $file->get_filepath(),
                $file->get_filename() . '.png'
            )->out(false);

            // Get caption from metadata
            $caption = '';
            $meta = $DB->get_record('lightboxgallery_image_meta', [
                'gallery' => $gallery->id,
                'image' => $file->get_filename(),
                'metatype' => 'caption'
            ]);
            if ($meta) {
                $caption = $meta->description;
            }

            $images[] = [
                'filename' => $file->get_filename(),
                'fileurl' => $fileurl,
                'thumburl' => $thumburl,
                'mimetype' => $mimetype,
                'filesize' => $file->get_filesize(),
                'timemodified' => $file->get_timemodified(),
                'caption' => $caption,
            ];
        }

        return [
            'images' => $images,
            'galleryname' => $gallery->name,
            'intro' => $gallery->intro ?? '',
        ];
    }

    /**
     * Returns description of method result value
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'images' => new external_multiple_structure(
                new external_single_structure([
                    'filename' => new external_value(PARAM_TEXT, 'File name'),
                    'fileurl' => new external_value(PARAM_URL, 'Full image URL'),
                    'thumburl' => new external_value(PARAM_URL, 'Thumbnail URL'),
                    'mimetype' => new external_value(PARAM_TEXT, 'MIME type'),
                    'filesize' => new external_value(PARAM_INT, 'File size in bytes'),
                    'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                    'caption' => new external_value(PARAM_TEXT, 'Image caption'),
                ])
            ),
            'galleryname' => new external_value(PARAM_TEXT, 'Gallery name'),
            'intro' => new external_value(PARAM_RAW, 'Gallery introduction'),
        ]);
    }
}
