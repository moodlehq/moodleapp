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
import { CoreEvents } from '@singletons/events';
import { CoreWS } from '@services/ws';

/**
 * Service to handle parent/mentee relationships.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserParentService {

    protected static readonly PARENT_ROLE_SHORTNAMES = ['parent', 'parents', 'mentor', 'guardian'];
    protected static readonly CACHE_KEY = 'CoreUserParent:';

    /**
     * Check if the current user has a parent/mentor role.
     * This checks if the ORIGINAL user (before any token switching) is a parent.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with boolean indicating if user is a parent.
     */
    async isParentUser(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        // CRITICAL: If we're viewing as a child (token switched), we need to
        // check if the PARENT is a parent, not the child.
        const existingOriginalToken = await this.getStoredOriginalToken(site);

        if (existingOriginalToken) {
            // We're viewing as a child, so the original user IS a parent
            console.log('[Parent Service] Already viewing as child, original user is a parent');

            return true;
        }

        try {
            console.log('[Parent Service] Checking if user is parent using web service...');
            // Use the dedicated web service to check parent status
            const response = await site.read<{isparent: boolean; roles: any[]; menteecount: number}>('local_aspireparent_get_parent_info', {});
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
                        CoreUserParentService.PARENT_ROLE_SHORTNAMES.includes(role.shortname.toLowerCase()),
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
            // CRITICAL: If we're viewing as a child (token switched), we need to use
            // the PARENT's user ID, not the child's. The child has no mentees!
            let parentUserId = site.getUserId();

            // Check if we have a stored original (parent) user ID
            try {
                const storedParentId = await site.getLocalSiteConfig<string>(this.getOriginalUserKey(site.getId()));
                if (storedParentId && storedParentId !== '') {
                    parentUserId = parseInt(storedParentId, 10);
                    console.log('[Parent Service] Using stored parent user ID:', parentUserId);
                }
            } catch {
                // No stored parent ID, use current
            }

            // If viewing as child, we need to use the parent's token for this call
            // But we do NOT switch the global token to avoid race conditions
            const existingOriginalToken = await this.getStoredOriginalToken(site);

            const params = {
                userid: parentUserId,
            };

            console.log('[Parent Service] Calling local_aspireparent_get_mentees with params:', params);

            try {
                let response: {mentees: CoreUserProfile[]};

                if (existingOriginalToken) {
                    // Use parent token for this specific call without switching global token
                    console.log('[Parent Service] Using parent token for getMentees (without global switch)');
                    const wsPreSets = {
                        wsToken: existingOriginalToken,
                        siteUrl: site.getURL(),
                    };
                    response = await CoreWS.call<{mentees: CoreUserProfile[]}>('local_aspireparent_get_mentees', params, wsPreSets);
                } else {
                    response = await site.read<{mentees: CoreUserProfile[]}>('local_aspireparent_get_mentees', params);
                }

                console.log('[Parent Service] Mentees response:', response);
                console.log('[Parent Service] Number of mentees found:', response.mentees ? response.mentees.length : 0);

                return response.mentees || [];
            } catch (wsError) {
                console.error('[Parent Service] Web service error:', wsError);
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
        
        console.log('[Parent Service] Getting selected mentee with key:', key);
        console.log('[Parent Service] Site ID:', site.getId());
        console.log('[Parent Service] Current user ID:', site.getUserId());
        
        try {
            const value = await site.getLocalSiteConfig(key);
            console.log('[Parent Service] Raw stored value:', value);
            
            // Handle empty string as null (cleared value)
            if (!value || value === '') {
                console.log('[Parent Service] No mentee selected (empty or null value)');
                return null;
            }
            
            const menteeId = parseInt(String(value), 10);
            console.log('[Parent Service] Parsed mentee ID:', menteeId);
            
            // Check if parsing resulted in a valid number
            if (isNaN(menteeId)) {
                console.log('[Parent Service] Invalid mentee ID, returning null');
                return null;
            }
            
            return menteeId;
        } catch (error) {
            console.error('[Parent Service] Error getting selected mentee:', error);
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

        console.log('[Parent Service] Setting selected mentee:', menteeId);

        // CRITICAL: Check if we're already viewing as a different mentee
        // If so, we need to restore the parent's token FIRST before getting the new mentee's token
        // The get_mentee_token WS only works with the parent's token, not another child's token
        const existingOriginalToken = await this.getStoredOriginalToken(site);

        if (existingOriginalToken) {
            console.log('[Parent Service] Already viewing as a mentee, restoring parent token first...');

            // Temporarily restore the parent's token to make the WS call
            (site as any).token = existingOriginalToken;
            console.log('[Parent Service] Temporarily restored parent token for WS call');
        }

        // Get a token for the mentee (using parent's token)
        try {
            console.log('[Parent Service] Getting token for mentee...');
            const tokenResponse = await site.write<{
                token: string;
                menteeid: number;
                menteename: string;
                privatetoken?: string;
            }>('local_aspireparent_get_mentee_token', {
                menteeid: menteeId,
                service: 'moodle_mobile_app',
            });

            console.log('[Parent Service] Token response:', {
                menteeid: tokenResponse.menteeid,
                menteename: tokenResponse.menteename,
                hasToken: !!tokenResponse.token,
            });

            if (tokenResponse.token) {
                // Store or keep the original parent's token
                if (!existingOriginalToken) {
                    // First time switching - store the parent's current token
                    const parentToken = site.getToken();
                    const parentInfo = site.getInfo();

                    await site.setLocalSiteConfig(this.getOriginalUserKey(site.getId()), String(parentInfo?.userid || site.getUserId()));
                    await site.setLocalSiteConfig(this.getOriginalTokenKey(site.getId()), parentToken);

                    console.log('[Parent Service] Stored parent info (first switch)');
                }
                // If existingOriginalToken exists, we keep it - it's already the parent's token

                // Update the site object's token to the new mentee's token
                (site as any).token = tokenResponse.token;

                console.log('[Parent Service] Updated site object with mentee token');

                // Get the mentee's site info using the new token
                let menteeInfo;
                try {
                    menteeInfo = await site.fetchSiteInfo();
                    console.log('[Parent Service] Mentee site info:', {
                        userid: menteeInfo.userid,
                        fullname: menteeInfo.fullname,
                    });

                    // Update the site's info with the mentee's data
                    site.setInfo(menteeInfo);
                } catch (infoError) {
                    console.error('[Parent Service] Error fetching mentee site info:', infoError);
                    // Continue anyway - we have the token
                }

                // Trigger events to refresh the UI
                if (menteeInfo) {
                    CoreEvents.trigger(CoreEvents.SITE_UPDATED, menteeInfo, site.getId());
                }

                console.log('[Parent Service] Site is now using mentee token for all requests');
            } else {
                // No token returned - restore original token if we changed it
                if (existingOriginalToken) {
                    console.log('[Parent Service] No token returned, keeping parent token');
                    // Token is already set to parent's token from above
                }
            }
        } catch (error) {
            console.error('[Parent Service] Failed to get mentee token:', error);
            // If we temporarily switched to parent token and WS failed,
            // we need to decide what to do. Keep parent token for safety.
            if (existingOriginalToken) {
                console.log('[Parent Service] WS failed, keeping parent token');
                // Token is already set to parent's token from above
            }
            // Fall back to using custom web services with parent token
        }

        await site.setLocalSiteConfig(key, String(menteeId));

        // Verify it was saved
        const saved = await site.getLocalSiteConfig(key);
        console.log('[Parent Service] Verified saved value:', saved);
    }

    /**
     * Get the stored original parent token if it exists.
     *
     * @param site The site object.
     * @returns The original token or null.
     */
    private async getStoredOriginalToken(site: CoreSite): Promise<string | null> {
        try {
            const token = await site.getLocalSiteConfig<string>(this.getOriginalTokenKey(site.getId()));

            if (token && token !== '') {
                return token;
            }

            return null;
        } catch {
            return null;
        }
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
        
        console.log('[Parent Service] Clearing selected mentee...');
        console.log('[Parent Service] Storage key:', key);
        
        // Restore original token if we have one stored
        try {
            const originalToken = await site.getLocalSiteConfig<string>(this.getOriginalTokenKey(site.getId()));
            const originalUserId = await site.getLocalSiteConfig<string>(this.getOriginalUserKey(site.getId()));
            
            if (originalToken && originalUserId) {
                console.log('[Parent Service] Restoring parent token...');
                
                // Update the site object's token directly
                (site as any).token = originalToken;
                
                console.log('[Parent Service] Restored parent token in site object');
                
                // Get the parent's site info using the original token
                let parentInfo;
                try {
                    console.log('[Parent Service] Fetching site info with parent token...');
                    parentInfo = await site.fetchSiteInfo();
                    console.log('[Parent Service] Parent site info:', {
                        userid: parentInfo.userid,
                        username: parentInfo.username,
                        fullname: parentInfo.fullname
                    });
                    
                    // Update the site's info with the parent's data
                    site.setInfo(parentInfo);
                    
                    console.log('[Parent Service] Restored parent site info');
                } catch (infoError) {
                    console.error('[Parent Service] Error fetching parent site info:', infoError);
                    // Continue anyway - we have the token
                }
                
                // Clear the stored tokens and user ID
                await site.setLocalSiteConfig(this.getOriginalTokenKey(site.getId()), '');
                await site.setLocalSiteConfig(this.getOriginalUserKey(site.getId()), '');
                
                // Trigger events to refresh the UI
                if (parentInfo) {
                    CoreEvents.trigger(CoreEvents.SITE_UPDATED, parentInfo, site.getId());
                }
                
                console.log('[Parent Service] Restored parent token and cleared stored data');
            }
        } catch (error) {
            console.error('[Parent Service] Failed to restore original token:', error);
            // Continue with clearing the mentee selection even if restore fails
        }
        
        // Set to empty string to clear the value (there's no delete method for local site config)
        await site.setLocalSiteConfig(key, '');
        
        // Verify it was cleared
        const clearedValue = await site.getLocalSiteConfig(key);
        console.log('[Parent Service] Value after clearing:', clearedValue);
        if (!clearedValue || clearedValue === '') {
            console.log('[Parent Service] Successfully cleared mentee selection');
        }
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
     * Get the key for storing original user ID.
     *
     * @param siteId Site ID.
     * @returns Storage key.
     */
    protected getOriginalUserKey(siteId: string): string {
        return CoreUserParentService.CACHE_KEY + 'originalUser:' + siteId;
    }

    /**
     * Get the key for storing original token.
     *
     * @param siteId Site ID.
     * @returns Storage key.
     */
    protected getOriginalTokenKey(siteId: string): string {
        return CoreUserParentService.CACHE_KEY + 'originalToken:' + siteId;
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