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
require_once($CFG->dirroot . '/mod/forum/lib.php');

use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use external_files;
use context_system;
use context_course;
use context_module;
use core_external\util as external_util;

/**
 * External function to get site-wide forums.
 */
class get_site_forums extends external_api {

    /**
     * Describes the parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([]);
    }

    /**
     * Get site-wide forums (news and announcements).
     *
     * @return array
     */
    public static function execute() {
        global $DB, $CFG, $USER;

        $params = self::validate_parameters(self::execute_parameters(), []);

        // Get system context
        $systemcontext = context_system::instance();
        self::validate_context($systemcontext);
        
        // Get site home course ID (from site config, defaults to 1)
        $siteid = isset($CFG->siteid) ? $CFG->siteid : SITEID;
        
        $forums = [];
        
        // Debug: Log the site ID being used
        error_log('[local_aspireparent_get_site_forums] Using site ID: ' . $siteid);
        
        // Get all forums from the site home course
        $siteforums = $DB->get_records('forum', ['course' => $siteid]);
        
        // Debug: Log how many forums found
        error_log('[local_aspireparent_get_site_forums] Found ' . count($siteforums) . ' forums in site home course');
        
        foreach ($siteforums as $forum) {
            // Only include news and announcement forums
            if ($forum->type === 'news' || 
                $forum->type === 'general' ||
                stripos($forum->name, 'announcement') !== false ||
                stripos($forum->name, 'news') !== false) {
                
                // Get the course module
                $cm = get_coursemodule_from_instance('forum', $forum->id, $siteid);
                if (!$cm || !$cm->visible) {
                    continue;
                }
                
                // Get module context and check permissions
                $modcontext = context_module::instance($cm->id);
                
                // Check if user can view discussions in this forum
                if (!has_capability('mod/forum:viewdiscussion', $modcontext)) {
                    continue;
                }
                
                // Format the forum data properly
                $forumdata = [
                    'id' => $forum->id,
                    'course' => $forum->course,
                    'type' => $forum->type,
                    'name' => external_util::format_string($forum->name, $modcontext),
                    'intro' => format_module_intro('forum', $forum, $cm->id),
                    'introformat' => $forum->introformat,
                    'introfiles' => external_util::get_area_files($modcontext->id, 'mod_forum', 'intro', false, false),
                    'assessed' => $forum->assessed,
                    'assesstimestart' => $forum->assesstimestart,
                    'assesstimefinish' => $forum->assesstimefinish,
                    'scale' => $forum->scale,
                    'grade_forum' => $forum->grade_forum,
                    'grade_forum_notify' => $forum->grade_forum_notify,
                    'maxbytes' => $forum->maxbytes,
                    'maxattachments' => $forum->maxattachments,
                    'forcesubscribe' => $forum->forcesubscribe,
                    'trackingtype' => $forum->trackingtype,
                    'rsstype' => $forum->rsstype,
                    'rssarticles' => $forum->rssarticles,
                    'timemodified' => $forum->timemodified,
                    'warnafter' => $forum->warnafter,
                    'blockafter' => $forum->blockafter,
                    'blockperiod' => $forum->blockperiod,
                    'completiondiscussions' => $forum->completiondiscussions,
                    'completionreplies' => $forum->completionreplies,
                    'completionposts' => $forum->completionposts,
                    'cmid' => $cm->id,
                    'numdiscussions' => 0,
                    'cancreatediscussions' => forum_user_can_post_discussion($forum, null, -1, $cm, $modcontext),
                    'lockdiscussionafter' => $forum->lockdiscussionafter,
                    'istracked' => forum_tp_is_tracked($forum),
                ];
                
                // Get intro files if any
                $options = ['noclean' => true];
                list($forumdata['intro'], $forumdata['introformat']) = external_util::format_text(
                    $forum->intro, 
                    $forum->introformat,
                    $modcontext->id,
                    'mod_forum',
                    'intro',
                    null,
                    $options
                );
                
                $forums[] = $forumdata;
            }
        }
        
        // Also get any forums with specific IDs that are known to be site-wide announcements
        // This includes forum ID 1500 which is mentioned in the user's request
        $knownSiteForumIds = [1500];
        
        error_log('[local_aspireparent_get_site_forums] Checking known forum IDs: ' . implode(', ', $knownSiteForumIds));
        
        foreach ($knownSiteForumIds as $forumid) {
            try {
                // Skip if we already have this forum
                $alreadyIncluded = false;
                foreach ($forums as $f) {
                    if ($f['id'] == $forumid) {
                        $alreadyIncluded = true;
                        break;
                    }
                }
                
                if ($alreadyIncluded) {
                    continue;
                }
                
                $forum = $DB->get_record('forum', ['id' => $forumid]);
                if ($forum) {
                    error_log('[local_aspireparent_get_site_forums] Found forum ' . $forumid . ' - ' . $forum->name);
                    $cm = get_coursemodule_from_instance('forum', $forum->id, $forum->course);
                    if ($cm && $cm->visible) {
                        // Get module context and check permissions
                        $modcontext = context_module::instance($cm->id);
                        
                        // Check if user can view discussions in this forum
                        if (!has_capability('mod/forum:viewdiscussion', $modcontext)) {
                            continue;
                        }
                        
                        // Format the forum data properly
                        $forumdata = [
                            'id' => $forum->id,
                            'course' => $forum->course,
                            'type' => $forum->type,
                            'name' => external_util::format_string($forum->name, $modcontext),
                            'intro' => format_module_intro('forum', $forum, $cm->id),
                            'introformat' => $forum->introformat,
                            'introfiles' => external_util::get_area_files($modcontext->id, 'mod_forum', 'intro', false, false),
                            'assessed' => $forum->assessed,
                            'assesstimestart' => $forum->assesstimestart,
                            'assesstimefinish' => $forum->assesstimefinish,
                            'scale' => $forum->scale,
                            'grade_forum' => $forum->grade_forum,
                            'grade_forum_notify' => $forum->grade_forum_notify,
                            'maxbytes' => $forum->maxbytes,
                            'maxattachments' => $forum->maxattachments,
                            'forcesubscribe' => $forum->forcesubscribe,
                            'trackingtype' => $forum->trackingtype,
                            'rsstype' => $forum->rsstype,
                            'rssarticles' => $forum->rssarticles,
                            'timemodified' => $forum->timemodified,
                            'warnafter' => $forum->warnafter,
                            'blockafter' => $forum->blockafter,
                            'blockperiod' => $forum->blockperiod,
                            'completiondiscussions' => $forum->completiondiscussions,
                            'completionreplies' => $forum->completionreplies,
                            'completionposts' => $forum->completionposts,
                            'cmid' => $cm->id,
                            'numdiscussions' => 0,
                            'cancreatediscussions' => forum_user_can_post_discussion($forum, null, -1, $cm, $modcontext),
                            'lockdiscussionafter' => $forum->lockdiscussionafter,
                            'istracked' => forum_tp_is_tracked($forum),
                        ];
                        
                        // Get intro files if any
                        $options = ['noclean' => true];
                        list($forumdata['intro'], $forumdata['introformat']) = external_util::format_text(
                            $forum->intro, 
                            $forum->introformat,
                            $modcontext->id,
                            'mod_forum',
                            'intro',
                            null,
                            $options
                        );
                        
                        $forums[] = $forumdata;
                    }
                }
            } catch (\Exception $e) {
                // Skip if we can't access this forum
                continue;
            }
        }
        
        return ['forums' => $forums];
    }

    /**
     * Describes the return value.
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'forums' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Forum ID'),
                    'course' => new external_value(PARAM_INT, 'Course ID'),
                    'type' => new external_value(PARAM_TEXT, 'Forum type'),
                    'name' => new external_value(PARAM_TEXT, 'Forum name'),
                    'intro' => new external_value(PARAM_RAW, 'Forum introduction'),
                    'introformat' => new external_value(PARAM_INT, 'Intro format'),
                    'introfiles' => new external_files('Intro files', VALUE_OPTIONAL),
                    'assessed' => new external_value(PARAM_INT, 'Assessed'),
                    'assesstimestart' => new external_value(PARAM_INT, 'Assess time start'),
                    'assesstimefinish' => new external_value(PARAM_INT, 'Assess time finish'),
                    'scale' => new external_value(PARAM_INT, 'Scale'),
                    'grade_forum' => new external_value(PARAM_INT, 'Grade forum'),
                    'grade_forum_notify' => new external_value(PARAM_INT, 'Grade forum notify'),
                    'maxbytes' => new external_value(PARAM_INT, 'Max bytes'),
                    'maxattachments' => new external_value(PARAM_INT, 'Max attachments'),
                    'forcesubscribe' => new external_value(PARAM_INT, 'Force subscribe'),
                    'trackingtype' => new external_value(PARAM_INT, 'Tracking type'),
                    'rsstype' => new external_value(PARAM_INT, 'RSS type'),
                    'rssarticles' => new external_value(PARAM_INT, 'RSS articles'),
                    'timemodified' => new external_value(PARAM_INT, 'Time modified'),
                    'warnafter' => new external_value(PARAM_INT, 'Warn after'),
                    'blockafter' => new external_value(PARAM_INT, 'Block after'),
                    'blockperiod' => new external_value(PARAM_INT, 'Block period'),
                    'completiondiscussions' => new external_value(PARAM_INT, 'Completion discussions'),
                    'completionreplies' => new external_value(PARAM_INT, 'Completion replies'),
                    'completionposts' => new external_value(PARAM_INT, 'Completion posts'),
                    'cmid' => new external_value(PARAM_INT, 'Course module ID'),
                    'numdiscussions' => new external_value(PARAM_INT, 'Number of discussions', VALUE_OPTIONAL),
                    'cancreatediscussions' => new external_value(PARAM_BOOL, 'Can create discussions', VALUE_OPTIONAL),
                    'lockdiscussionafter' => new external_value(PARAM_INT, 'Lock discussion after'),
                    'istracked' => new external_value(PARAM_BOOL, 'Is tracked', VALUE_OPTIONAL),
                ])
            )
        ]);
    }
}