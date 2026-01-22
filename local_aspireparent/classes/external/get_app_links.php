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
require_once($CFG->dirroot . '/course/lib.php');

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_course;
use context_module;
use moodle_url;

/**
 * External function to get app links from a dedicated course.
 * This bypasses enrollment checks to allow all authenticated users to access the links.
 *
 * @package    local_aspireparent
 * @copyright  2024 Aspire School
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_app_links extends external_api {

    // Course ID for the "App Links" course - configurable
    const APP_LINKS_COURSE_ID = 1030;

    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID for app links (default: 1030)', VALUE_DEFAULT, self::APP_LINKS_COURSE_ID),
        ]);
    }

    /**
     * Get app links from the dedicated course.
     * Uses direct database queries to bypass enrollment checks.
     *
     * @param int $courseid Course ID for app links.
     * @return array Array of sections with links.
     */
    public static function execute($courseid = self::APP_LINKS_COURSE_ID) {
        global $DB, $CFG;

        // Parameter validation.
        $params = self::validate_parameters(self::execute_parameters(), [
            'courseid' => $courseid,
        ]);

        $courseid = $params['courseid'];

        // Check if course exists.
        $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);

        // Get course context.
        $context = context_course::instance($courseid);

        // Get sections directly from database (bypasses enrollment check).
        $dbsections = $DB->get_records('course_sections', ['course' => $courseid], 'section ASC');

        $sections = [];

        foreach ($dbsections as $dbsection) {
            // Skip section 0 (General) or hidden sections.
            if ($dbsection->section == 0 || !$dbsection->visible) {
                continue;
            }

            // Get section name.
            $sectionname = $dbsection->name;
            if (empty($sectionname)) {
                $sectionname = get_string('sectionname', 'format_' . $course->format) . ' ' . $dbsection->section;
            }

            // Skip empty section names or "General".
            if (empty($sectionname) || $sectionname === 'General') {
                continue;
            }

            $items = [];

            // Get course modules in this section directly from database.
            if (!empty($dbsection->sequence)) {
                $cmids = explode(',', $dbsection->sequence);

                foreach ($cmids as $cmid) {
                    $cmid = trim($cmid);
                    if (empty($cmid)) {
                        continue;
                    }

                    // Get course module record.
                    $cm = $DB->get_record('course_modules', ['id' => $cmid]);
                    if (!$cm || !$cm->visible) {
                        continue;
                    }

                    // Get module info.
                    $module = $DB->get_record('modules', ['id' => $cm->module]);
                    if (!$module) {
                        continue;
                    }

                    $item = self::parse_module_direct($cm, $module->name, $context);
                    if ($item !== null) {
                        $items[] = $item;
                    }
                }
            }

            // Only add sections with items.
            if (!empty($items)) {
                $sections[] = [
                    'id' => $dbsection->id,
                    'name' => $sectionname,
                    'icon' => self::get_section_icon($sectionname),
                    'items' => $items,
                ];
            }
        }

        return [
            'sections' => $sections,
            'courseid' => $courseid,
        ];
    }

    /**
     * Parse a course module into an app link item using direct DB queries.
     *
     * @param object $cm Course module record.
     * @param string $modname Module name (url, resource, folder).
     * @param \context_course $context Course context.
     * @return array|null Link item or null if not supported.
     */
    private static function parse_module_direct($cm, $modname, $context) {
        global $DB;

        switch ($modname) {
            case 'url':
                return self::parse_url_module_direct($cm);

            case 'resource':
                return self::parse_resource_module_direct($cm);

            case 'folder':
                return self::parse_folder_module_direct($cm);

            default:
                return null;
        }
    }

    /**
     * Parse URL module using direct DB query.
     */
    private static function parse_url_module_direct($cm) {
        global $DB;

        $url = $DB->get_record('url', ['id' => $cm->instance], 'name, externalurl');
        if (!$url) {
            return null;
        }

        return [
            'name' => $url->name,
            'url' => $url->externalurl ?: '',
            'type' => 'link',
            'icon' => 'link-outline',
            'children' => [],
        ];
    }

    /**
     * Parse resource (file) module using direct DB query.
     */
    private static function parse_resource_module_direct($cm) {
        global $DB;

        $resource = $DB->get_record('resource', ['id' => $cm->instance], 'name');
        if (!$resource) {
            return null;
        }

        $fs = get_file_storage();
        $cmcontext = context_module::instance($cm->id);
        $files = $fs->get_area_files($cmcontext->id, 'mod_resource', 'content', 0, 'sortorder DESC, id ASC', false);

        if (empty($files)) {
            return null;
        }

        $file = reset($files);
        $fileurl = self::get_file_url($file, $cmcontext);

        return [
            'name' => $resource->name,
            'url' => $fileurl,
            'type' => 'file',
            'icon' => self::get_file_icon($file->get_filename()),
            'children' => [],
        ];
    }

    /**
     * Parse folder module using direct DB query.
     */
    private static function parse_folder_module_direct($cm) {
        global $DB;

        $folder = $DB->get_record('folder', ['id' => $cm->instance], 'name');
        if (!$folder) {
            return null;
        }

        $fs = get_file_storage();
        $cmcontext = context_module::instance($cm->id);
        $files = $fs->get_area_files($cmcontext->id, 'mod_folder', 'content', 0, 'filepath, filename', false);

        if (empty($files)) {
            return null;
        }

        $children = [];
        foreach ($files as $file) {
            if ($file->is_directory()) {
                continue;
            }
            $children[] = [
                'name' => $file->get_filename(),
                'url' => self::get_file_url($file, $cmcontext),
                'type' => 'file',
                'icon' => self::get_file_icon($file->get_filename()),
                'children' => [],
            ];
        }

        return [
            'name' => $folder->name,
            'url' => '',
            'type' => 'folder',
            'icon' => 'folder-outline',
            'children' => $children,
        ];
    }

    /**
     * Get file URL using our custom file serving endpoint that bypasses enrollment.
     */
    private static function get_file_url($file, $context) {
        global $CFG;

        // Use our custom file serving script that bypasses enrollment check.
        $url = new moodle_url('/local/aspireparent/applinks_file.php', [
            'contextid' => $context->id,
            'component' => $file->get_component(),
            'filearea' => $file->get_filearea(),
            'itemid' => $file->get_itemid(),
            'filepath' => $file->get_filepath(),
            'filename' => $file->get_filename(),
        ]);

        return $url->out(false);
    }

    /**
     * Get icon name based on filename extension.
     */
    private static function get_file_icon($filename) {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        switch ($ext) {
            case 'pdf':
                return 'document-text-outline';
            case 'doc':
            case 'docx':
                return 'document-outline';
            case 'xls':
            case 'xlsx':
                return 'grid-outline';
            case 'ppt':
            case 'pptx':
                return 'easel-outline';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return 'image-outline';
            default:
                return 'document-outline';
        }
    }

    /**
     * Get icon name based on section name.
     */
    private static function get_section_icon($sectionname) {
        $name = strtolower($sectionname);

        if (strpos($name, 'calendar') !== false) {
            return 'calendar-outline';
        }
        if (strpos($name, 'uniform') !== false || strpos($name, 'supplies') !== false) {
            return 'shirt-outline';
        }
        if (strpos($name, 'handbook') !== false) {
            return 'book-outline';
        }
        if (strpos($name, 'polic') !== false) {
            return 'shield-checkmark-outline';
        }
        if (strpos($name, 'booking') !== false || strpos($name, 'appointment') !== false) {
            return 'calendar-number-outline';
        }

        return 'folder-outline';
    }

    /**
     * Returns description of method result value.
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'sections' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Section ID'),
                    'name' => new external_value(PARAM_TEXT, 'Section name'),
                    'icon' => new external_value(PARAM_TEXT, 'Section icon name'),
                    'items' => new external_multiple_structure(
                        new external_single_structure([
                            'name' => new external_value(PARAM_TEXT, 'Item name'),
                            'url' => new external_value(PARAM_RAW, 'Item URL'),
                            'type' => new external_value(PARAM_ALPHA, 'Item type: link, file, or folder'),
                            'icon' => new external_value(PARAM_TEXT, 'Item icon name'),
                            'children' => new external_multiple_structure(
                                new external_single_structure([
                                    'name' => new external_value(PARAM_TEXT, 'Child item name'),
                                    'url' => new external_value(PARAM_RAW, 'Child item URL'),
                                    'type' => new external_value(PARAM_ALPHA, 'Child item type'),
                                    'icon' => new external_value(PARAM_TEXT, 'Child item icon'),
                                    'children' => new external_multiple_structure(
                                        new external_value(PARAM_RAW, 'Nested children (empty)'),
                                        'Nested children',
                                        VALUE_OPTIONAL
                                    ),
                                ]),
                                'Child items for folders',
                                VALUE_OPTIONAL
                            ),
                        ])
                    ),
                ])
            ),
            'courseid' => new external_value(PARAM_INT, 'Course ID used'),
        ]);
    }
}
