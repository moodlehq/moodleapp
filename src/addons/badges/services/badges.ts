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
import { CoreWSExternalWarning } from '@services/ws';
import { CoreSite } from '@classes/site';
import { makeSingleton } from '@singletons';
import { CoreError } from '@classes/errors/error';

const ROOT_CACHE_KEY = 'mmaBadges:';

/**
 * Service to handle badges.
 */
@Injectable({ providedIn: 'root' })
export class AddonBadgesProvider {

    /**
     * Returns whether or not the badge plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if enabled, false otherwise.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.canUseAdvancedFeature('enablebadges');
    }

    /**
     * Get the cache key for the get badges call.
     *
     * @param courseId ID of the course to get the badges from.
     * @param userId ID of the user to get the badges from.
     * @returns Cache key.
     */
    protected getBadgesCacheKey(courseId: number, userId: number): string {
        return ROOT_CACHE_KEY + 'badges:' + courseId + ':' + userId;
    }

    /**
     * Get issued badges for a certain user in a course.
     *
     * @param courseId ID of the course to get the badges from.
     * @param userId ID of the user to get the badges from.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise to be resolved when the badges are retrieved.
     */
    async getUserBadges(courseId: number, userId: number, siteId?: string): Promise<AddonBadgesUserBadge[]> {

        const site = await CoreSites.getSite(siteId);
        const data: AddonBadgesGetUserBadgesWSParams = {
            courseid: courseId,
            userid: userId,
        };
        const preSets = {
            cacheKey: this.getBadgesCacheKey(courseId, userId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
        };

        const response = await site.read<AddonBadgesGetUserBadgesWSResponse>('core_badges_get_user_badges', data, preSets);
        if (!response || !response.badges) {
            throw new CoreError('Invalid badges response');
        }

        // In 3.7, competencies was renamed to alignment. Rename the property in 3.6 too.
        response.badges.forEach((badge) => {
            badge.alignment = badge.alignment || badge.competencies;

            // Check that the alignment is valid, they were broken in 3.7.
            if (badge.alignment && badge.alignment[0] && badge.alignment[0].targetname === undefined) {
                // If any badge lacks targetname it means they are affected by the Moodle bug, don't display them.
                delete badge.alignment;
            }
        });

        return response.badges;
    }

    /**
     * Invalidate get badges WS call.
     *
     * @param courseId Course ID.
     * @param userId ID of the user to get the badges from.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateUserBadges(courseId: number, userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getBadgesCacheKey(courseId, userId));
    }

}

export const AddonBadges = makeSingleton(AddonBadgesProvider);

/**
 * Params of core_badges_get_user_badges WS.
 */
type AddonBadgesGetUserBadgesWSParams = {
    userid?: number; // Badges only for this user id, empty for current user.
    courseid?: number; // Filter badges by course id, empty all the courses.
    page?: number; // The page of records to return.
    perpage?: number; // The number of records to return per page.
    search?: string; // A simple string to search for.
    onlypublic?: boolean; // Whether to return only public badges.
};

/**
 * Data returned by core_badges_get_user_badges WS.
 */
type AddonBadgesGetUserBadgesWSResponse = {
    badges: AddonBadgesUserBadge[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_badges_get_user_badges.
 */
export type AddonBadgesGetUserBadgesResult = {
    badges: AddonBadgesUserBadge[]; // List of badges.
    warnings?: CoreWSExternalWarning[]; // List of warnings.
};

/**
 * Badge data returned by WS core_badges_get_user_badges.
 */
export type AddonBadgesUserBadge = {
    id?: number; // Badge id.
    name: string; // Badge name.
    description: string; // Badge description.
    timecreated?: number; // Time created.
    timemodified?: number; // Time modified.
    usercreated?: number; // User created.
    usermodified?: number; // User modified.
    issuername: string; // Issuer name.
    issuerurl: string; // Issuer URL.
    issuercontact: string; // Issuer contact.
    expiredate?: number; // Expire date.
    expireperiod?: number; // Expire period.
    type?: number; // Type.
    courseid?: number; // Course id.
    message?: string; // Message.
    messagesubject?: string; // Message subject.
    attachment?: number; // Attachment.
    notification?: number; // @since 3.6. Whether to notify when badge is awarded.
    nextcron?: number; // @since 3.6. Next cron.
    status?: number; // Status.
    issuedid?: number; // Issued id.
    uniquehash: string; // Unique hash.
    dateissued: number; // Date issued.
    dateexpire: number; // Date expire.
    visible?: number; // Visible.
    email?: string; // @since 3.6. User email.
    version?: string; // @since 3.6. Version.
    language?: string; // @since 3.6. Language.
    imageauthorname?: string; // @since 3.6. Name of the image author.
    imageauthoremail?: string; // @since 3.6. Email of the image author.
    imageauthorurl?: string; // @since 3.6. URL of the image author.
    imagecaption?: string; // @since 3.6. Caption of the image.
    badgeurl: string; // Badge URL.
    endorsement?: { // @since 3.6.
        id: number; // Endorsement id.
        badgeid: number; // Badge id.
        issuername: string; // Endorsement issuer name.
        issuerurl: string; // Endorsement issuer URL.
        issueremail: string; // Endorsement issuer email.
        claimid: string; // Claim URL.
        claimcomment: string; // Claim comment.
        dateissued: number; // Date issued.
    };
    alignment?: { // @since 3.7. Calculated by the app for 3.6 sites. Badge alignments.
        id?: number; // Alignment id.
        badgeid?: number; // Badge id.
        targetname?: string; // Target name.
        targeturl?: string; // Target URL.
        targetdescription?: string; // Target description.
        targetframework?: string; // Target framework.
        targetcode?: string; // Target code.
    }[];
    competencies?: { // @deprecatedonmoodle from 3.7. @since 3.6. In 3.7 it was renamed to alignment.
        id?: number; // Alignment id.
        badgeid?: number; // Badge id.
        targetname?: string; // Target name.
        targeturl?: string; // Target URL.
        targetdescription?: string; // Target description.
        targetframework?: string; // Target framework.
        targetcode?: string; // Target code.
    }[];
    relatedbadges?: { // @since 3.6. Related badges.
        id: number; // Badge id.
        name: string; // Badge name.
        version?: string; // Version.
        language?: string; // Language.
        type?: number; // Type.
    }[];
};
