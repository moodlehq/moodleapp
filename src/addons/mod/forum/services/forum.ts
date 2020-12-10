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
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreSitesCommonWSOptions, CoreSites } from '@services/sites';
import { CoreWSExternalFile } from '@services/ws';
import { makeSingleton } from '@singletons';

const ROOT_CACHE_KEY = 'mmaModForum:';

/**
 * Service that provides some features for forums.
 *
 * @todo Add all content.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumProvider {

    static readonly COMPONENT = 'mmaModForum';

    /**
     * Get cache key for forum data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getForumDataCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'forum:' + courseId;
    }

    /**
     * Get all course forums.
     *
     * @param courseId Course ID.
     * @param options Other options.
     * @return Promise resolved when the forums are retrieved.
     */
    async getCourseForums(courseId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModForumData[]> {
        const site = await CoreSites.instance.getSite(options.siteId);

        const params: AddonModForumGetForumsByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getForumDataCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModForumProvider.COMPONENT,
            ...CoreSites.instance.getReadingStrategyPreSets(options.readingStrategy),
        };

        return site.read('mod_forum_get_forums_by_courses', params, preSets);
    }

    /**
     * Invalidates forum data.
     *
     * @param courseId Course ID.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateForumData(courseId: number): Promise<void> {
        await CoreSites.instance.getCurrentSite()?.invalidateWsCacheForKey(this.getForumDataCacheKey(courseId));
    }

}

export class AddonModForum extends makeSingleton(AddonModForumProvider) {}

/**
 * Params of mod_forum_get_forums_by_courses WS.
 */
type AddonModForumGetForumsByCoursesWSParams = {
    courseids?: number[]; // Array of Course IDs.
};

/**
 * General forum activity data.
 */
export type AddonModForumData = {
    id: number; // Forum id.
    course: number; // Course id.
    type: string; // The forum type.
    name: string; // Forum name.
    intro: string; // The forum intro.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[];
    duedate?: number; // Duedate for the user.
    cutoffdate?: number; // Cutoffdate for the user.
    assessed: number; // Aggregate type.
    assesstimestart: number; // Assess start time.
    assesstimefinish: number; // Assess finish time.
    scale: number; // Scale.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    grade_forum: number; // Whole forum grade.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    grade_forum_notify: number; // Whether to send notifications to students upon grading by default.
    maxbytes: number; // Maximum attachment size.
    maxattachments: number; // Maximum number of attachments.
    forcesubscribe: number; // Force users to subscribe.
    trackingtype: number; // Subscription mode.
    rsstype: number; // RSS feed for this activity.
    rssarticles: number; // Number of RSS recent articles.
    timemodified: number; // Time modified.
    warnafter: number; // Post threshold for warning.
    blockafter: number; // Post threshold for blocking.
    blockperiod: number; // Time period for blocking.
    completiondiscussions: number; // Student must create discussions.
    completionreplies: number; // Student must post replies.
    completionposts: number; // Student must post discussions or replies.
    cmid: number; // Course module id.
    numdiscussions?: number; // Number of discussions in the forum.
    cancreatediscussions?: boolean; // If the user can create discussions.
    lockdiscussionafter?: number; // After what period a discussion is locked.
    istracked?: boolean; // If the user is tracking the forum.
    unreadpostscount?: number; // The number of unread posts for tracked forums.
};

/**
 * Data returned by mod_forum_get_forums_by_courses WS.
 */
export type AddonModForumGetForumsByCoursesWSResponse = AddonModForumData[];
