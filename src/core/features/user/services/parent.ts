// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreSite } from '@classes/sites/site';
import { CoreUser, CoreUserProfile } from './user';
import { makeSingleton } from '@singletons';
import { CoreError } from '@classes/errors/error';

/**
 * Service to handle parent/mentee relationships.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserParentService {

    protected static readonly PARENT_ROLE_SHORTNAMES = ['parent', 'parents', 'mentor', 'guardian'];
    protected static readonly CACHE_KEY = 'CoreUserParent:';

    /**
     * Check if the current user has a parent/mentor role.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with boolean indicating if user is a parent.
     */
    async isParentUser(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);
        
        try {
            console.log('[Parent Service] Checking if user is parent using web service...');
            // Use the dedicated web service to check parent status
            const response = await site.read<{isparent: boolean, roles: any[], menteecount: number}>('local_aspireparent_get_parent_info', {});
            console.log('[Parent Service] Web service response:', response);
            return response.isparent || false;
        } catch (error) {
            console.log('[Parent Service] Web service failed:', error);
            // Fallback to checking user profile roles
            try {
                console.log('[Parent Service] Falling back to user profile check...');
                const userId = site.getUserId();
                const user = await CoreUser.getProfile(userId, 0, false, site.getId());
                
                // Check if user has roles property (from CoreUserCourseProfile)
                if ('roles' in user && user.roles) {
                    console.log('[Parent Service] User roles found:', user.roles);
                    // Check if any role matches parent role shortnames
                    const isParent = user.roles.some(role => 
                        CoreUserParentService.PARENT_ROLE_SHORTNAMES.includes(role.shortname.toLowerCase())
                    );
                    console.log('[Parent Service] Is parent based on roles:', isParent);
                    return isParent;
                }
                console.log('[Parent Service] No roles found in user profile');
                return false;
            } catch (profileError) {
                console.log('[Parent Service] Profile check failed:', profileError);
                return false;
            }
        }
    }

    /**
     * Get list of mentees for the current user.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with list of mentees.
     */
    async getMentees(siteId?: string): Promise<CoreUserProfile[]> {
        const site = await CoreSites.getSite(siteId);
        
        console.log('[Parent Service] Getting mentees for user...');
        
        try {
            // Note: Moodle core doesn't have a direct web service for fetching mentees
            // The mentees block uses SQL queries to fetch users assigned in user context
            // For a proper implementation, you would need to:
            // 1. Create a custom web service in Moodle that replicates the mentees block query
            // 2. Or use a combination of existing web services to fetch role assignments
            
            // The SQL query from mentees block is:
            // SELECT u.* FROM {role_assignments} ra, {context} c, {user} u
            // WHERE ra.userid = :mentorid
            // AND ra.contextid = c.id
            // AND c.instanceid = u.id
            // AND c.contextlevel = CONTEXT_USER
            
            // Since we can't execute direct SQL from the app, you'll need to implement
            // a custom web service in your Moodle instance that exposes this functionality
            
            const params = {
                userid: site.getUserId(),
            };
            
            console.log('[Parent Service] Calling local_aspireparent_get_mentees with params:', params);
            
            // Custom web service call
            try {
                const response = await site.read<{mentees: CoreUserProfile[]}>('local_aspireparent_get_mentees', params);
                console.log('[Parent Service] Mentees response:', response);
                console.log('[Parent Service] Number of mentees found:', response.mentees ? response.mentees.length : 0);
                
                // Log each mentee for debugging
                if (response.mentees && response.mentees.length > 0) {
                    response.mentees.forEach((mentee, index) => {
                        console.log(`[Parent Service] Mentee ${index + 1}:`, {
                            id: mentee.id,
                            fullname: mentee.fullname,
                            email: mentee.email
                        });
                    });
                }
                
                return response.mentees || [];
            } catch (wsError) {
                // Fallback to empty array if web service doesn't exist
                console.error('[Parent Service] Web service error:', wsError);
                console.error('[Parent Service] Error type:', wsError?.constructor?.name);
                console.error('[Parent Service] Error message:', wsError?.message);
                console.error('[Parent Service] Error code:', wsError?.code);
                console.warn('[Parent Service] local_aspireparent_get_mentees web service not found. Please install the local_aspireparent plugin in Moodle.');
                return [];
            }
        } catch (error) {
            throw new CoreError('Error fetching mentees');
        }
    }

    /**
     * Get the currently selected mentee from storage.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with selected mentee ID or null.
     */
    async getSelectedMentee(siteId?: string): Promise<number | null> {
        const site = await CoreSites.getSite(siteId);
        const key = this.getSelectedMenteeKey(site.getId());
        
        try {
            const value = await site.getLocalSiteConfig(key);
            return value ? parseInt(String(value), 10) : null;
        } catch {
            return null;
        }
    }

    /**
     * Set the currently selected mentee.
     *
     * @param menteeId Mentee user ID.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when done.
     */
    async setSelectedMentee(menteeId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const key = this.getSelectedMenteeKey(site.getId());
        
        await site.setLocalSiteConfig(key, String(menteeId));
    }

    /**
     * Clear the selected mentee.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when done.
     */
    async clearSelectedMentee(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const key = this.getSelectedMenteeKey(site.getId());
        
        await site.deleteSiteConfig(key);
    }

    /**
     * Get the key for storing selected mentee.
     *
     * @param siteId Site ID.
     * @returns Storage key.
     */
    protected getSelectedMenteeKey(siteId: string): string {
        return CoreUserParentService.CACHE_KEY + 'selectedMentee:' + siteId;
    }

    /**
     * Check if user can view another user's data (grades, activities, etc).
     *
     * @param targetUserId The user ID to check access for.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with boolean.
     */
    async canViewUserData(targetUserId: number, siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);
        const currentUserId = site.getUserId();
        
        // User can always view their own data
        if (currentUserId === targetUserId) {
            return true;
        }
        
        // Check if current user is a parent
        const isParent = await this.isParentUser(siteId);
        if (!isParent) {
            return false;
        }
        
        // Check if target user is a mentee
        const mentees = await this.getMentees(siteId);
        return mentees.some(mentee => mentee.id === targetUserId);
    }
}

export const CoreUserParent = makeSingleton(CoreUserParentService);