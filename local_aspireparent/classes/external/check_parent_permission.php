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

/**
 * Common function to check if a user is a parent/mentor of another user.
 */
class check_parent_permission {
    
    /**
     * Check if the current user is a parent/mentor of the given user.
     *
     * @param int $userid The user ID to check mentorship for
     * @return bool True if current user is a parent/mentor
     */
    public static function is_parent_of($userid) {
        global $DB, $USER;
        
        // Allow users to view their own data
        if ($USER->id == $userid) {
            return true;
        }
        
        // Check if current user has a mentor role in the user's context
        $mentorcontext = \context_user::instance($userid);
        
        // Get all role assignments for the current user in the mentee's context
        $roleassignments = $DB->get_records('role_assignments', [
            'userid' => $USER->id,
            'contextid' => $mentorcontext->id
        ]);
        
        if (empty($roleassignments)) {
            return false;
        }
        
        // Check if any of these roles have the parent archetype or common parent role names
        foreach ($roleassignments as $ra) {
            $role = $DB->get_record('role', ['id' => $ra->roleid]);
            
            // Check for parent archetype
            if ($role->archetype === 'parent') {
                return true;
            }
            
            // Check for common parent/mentor role shortnames
            $parentRoleNames = ['parent', 'parents', 'mentor', 'guardian'];
            if (in_array(strtolower($role->shortname), $parentRoleNames)) {
                return true;
            }
            
            // Check if role has specific capabilities that indicate parent access
            $parentCapabilities = [
                'moodle/user:viewdetails',
                'moodle/user:viewalldetails',
                'moodle/grade:view'
            ];
            
            $rolecontext = \context::instance_by_id($ra->contextid);
            foreach ($parentCapabilities as $capability) {
                if (has_capability($capability, $rolecontext, $USER->id)) {
                    return true;
                }
            }
        }
        
        return false;
    }
}