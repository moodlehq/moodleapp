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
import { makeSingleton } from '@singletons';
import { CoreSites } from '@services/sites';
import { CoreCourses } from '@features/courses/services/courses';
import { AddonModForum } from '@addons/mod/forum/services/forum';
import { CoreUtils } from '@services/utils/utils';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';

export interface CoreNewsItem {
    id: number;
    name: string;
    subject: string;
    message: string;
    created: number;
    modified: number;
    courseId: number;
    courseName: string;
    courseFullname: string;
    discussionId: number;
    forumId: number;
    forumName: string;
    userfullname: string;
    usermodifiedfullname: string;
    userpictureurl?: string;
    usermodifiedpictureurl?: string;
    numreplies: number;
    numunread: number;
    pinned: boolean;
}

/**
 * Service to handle news across all courses.
 */
@Injectable({ providedIn: 'root' })
export class CoreNewsService {

    /**
     * Get all news from all courses the user is enrolled in.
     * 
     * @param refresh Whether to refresh the data.
     * @returns Promise resolved with news items.
     */
    async getAllNews(refresh = false): Promise<CoreNewsItem[]> {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return [];
        }

        console.log('[CoreNews] Starting getAllNews...');
        
        // Check if parent viewing scenario
        const { CoreUserParent } = await import('@features/user/services/parent');
        const selectedMenteeId = await CoreUserParent.getSelectedMentee(site.getId());
        
        // Log available services for debugging
        const isParentViewing = selectedMenteeId && selectedMenteeId !== site.getUserId();
        console.log('[CoreNews] Parent viewing check:', { isParentViewing, selectedMenteeId, currentUserId: site.getUserId() });
        
        // Check if the custom service is available
        const menteeNewsAvailable = site.wsAvailable('local_aspireparent_get_mentee_news');
        console.log('[CoreNews] local_aspireparent_get_mentee_news available:', menteeNewsAvailable);
        
        // If parent viewing and the custom web service is available, use it
        if (isParentViewing && menteeNewsAvailable) {
            
            console.log('[CoreNews] Parent viewing detected, using custom mentee news service');
            
            try {
                const response = await site.read<{ newsitems: CoreNewsItem[] }>('local_aspireparent_get_mentee_news', {
                    userid: selectedMenteeId
                });
                
                console.log(`[CoreNews] Received ${response.newsitems.length} news items from mentee service`);
                console.log('[CoreNews] News items by course:', 
                    response.newsitems.reduce((acc, item) => {
                        acc[item.courseFullname] = (acc[item.courseFullname] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>)
                );
                
                return response.newsitems;
            } catch (error) {
                console.error('[CoreNews] Error using mentee news service:', error);
                // Fall back to regular flow
            }
        }

        // Regular flow for non-parent users
        // Get all user courses
        const courses = await CoreCourses.getUserCourses(false, undefined, undefined);
        console.log('[CoreNews] Found courses:', courses.length, courses.map(c => ({id: c.id, name: c.fullname})));
        
        // Get site home ID for site news
        const siteHomeId = site.getSiteHomeId();
        console.log('[CoreNews] Site home ID:', siteHomeId);
        
        // Add site home to courses if not already there
        const hasSiteHome = courses.some(course => course.id === siteHomeId);
        if (!hasSiteHome) {
            courses.unshift({
                id: siteHomeId,
                fullname: site.getInfo()?.sitename || 'Site Home',
                shortname: 'sitehome',
                displayname: site.getInfo()?.sitename || 'Site Home',
                categoryid: 0,
                summary: '',
                summaryformat: 1,
            });
            console.log('[CoreNews] Added site home to courses list');
        }

        const allNews: CoreNewsItem[] = [];

        // Fetch news forums from each course
        for (const course of courses) {
            try {
                console.log(`[CoreNews] Fetching forums for course ${course.id} - ${course.fullname}`);
                
                // Get forums for this course
                const forums = await AddonModForum.getCourseForums(course.id);
                console.log(`[CoreNews] Found ${forums.length} forums in course ${course.id}`);
                
                // Filter for news forums and announcement forums
                const newsForums = forums.filter(forum => 
                    forum.type === 'news' || 
                    forum.type === 'general' || // Include general forums that might be announcements
                    forum.name.toLowerCase().includes('announcement') ||
                    forum.name.toLowerCase().includes('news')
                );
                
                console.log(`[CoreNews] Found ${newsForums.length} news/announcement forums in course ${course.id}:`, 
                    newsForums.map(f => ({id: f.id, name: f.name, type: f.type})));
                
                // Get discussions from each news forum
                for (const forum of newsForums) {
                    try {
                        console.log(`[CoreNews] Getting discussions from forum ${forum.id} - ${forum.name}`);
                        
                        // Check if parent viewing - if so, call web service directly
                        const { CoreUserParent } = await import('@features/user/services/parent');
                        const selectedMenteeId = await CoreUserParent.getSelectedMentee(site.getId());
                        
                        let response: any;
                        if (selectedMenteeId && selectedMenteeId !== site.getUserId()) {
                            console.log(`[CoreNews] Parent viewing detected, calling WS directly for forum ${forum.id}`);
                            
                            // Call web service directly to bypass parent viewing restrictions
                            const params: any = {
                                forumid: forum.id,
                                page: 0,
                                perpage: 100,
                            };
                            
                            if (site.wsAvailable('mod_forum_get_forum_discussions')) {
                                params.sortorder = 1; // LASTPOST_DESC
                                response = await site.read('mod_forum_get_forum_discussions', params);
                            } else {
                                params.sortby = 'timemodified';
                                params.sortdirection = 'DESC';
                                response = await site.read('mod_forum_get_forum_discussions_paginated', params);
                            }
                        } else {
                            // Normal flow
                            response = await AddonModForum.getDiscussions(forum.id, {
                                sortOrder: 1, // Sort by date descending
                                page: 0,
                            });
                        }
                        
                        console.log(`[CoreNews] Found ${response.discussions.length} discussions in forum ${forum.id}`);
                        
                        // Transform discussions to news items
                        const newsItems = response.discussions.map(discussion => ({
                            id: discussion.id,
                            name: discussion.name,
                            subject: discussion.subject,
                            message: discussion.message,
                            created: discussion.created,
                            modified: discussion.modified,
                            courseId: course.id,
                            courseName: course.shortname || '',
                            courseFullname: course.fullname || course.displayname || '',
                            discussionId: discussion.discussion,
                            forumId: forum.id,
                            forumName: forum.name,
                            userfullname: typeof discussion.userfullname === 'string' ? discussion.userfullname : '',
                            usermodifiedfullname: typeof discussion.usermodifiedfullname === 'string' ? discussion.usermodifiedfullname : '',
                            userpictureurl: discussion.userpictureurl,
                            usermodifiedpictureurl: discussion.usermodifiedpictureurl,
                            numreplies: discussion.numreplies,
                            numunread: discussion.numunread,
                            pinned: discussion.pinned,
                        }));
                        
                        allNews.push(...newsItems);
                        console.log(`[CoreNews] Added ${newsItems.length} news items from forum ${forum.id}`);
                    } catch (error) {
                        // Ignore errors for individual forums
                        console.error(`[CoreNews] Error fetching news from forum ${forum.id}:`, error);
                    }
                }
            } catch (error) {
                // Ignore errors for individual courses
                console.error(`[CoreNews] Error fetching forums from course ${course.id}:`, error);
            }
        }
        
        // Try to fetch site-wide announcements forums
        try {
            console.log('[CoreNews] Checking for site-wide forums...');
            
            // Check if the custom webservice is available for getting site forums
            if (site.wsAvailable('local_aspireparent_get_site_forums')) {
                console.log('[CoreNews] local_aspireparent_get_site_forums is available');
                const siteForumsResponse = await site.read<{ forums: any[] }>('local_aspireparent_get_site_forums', {});
                
                console.log('[CoreNews] Site forums response:', siteForumsResponse);
                
                if (siteForumsResponse.forums) {
                    console.log(`[CoreNews] Found ${siteForumsResponse.forums.length} site-wide forums`);
                    // Get discussions from site-wide forums
                    // We need to call the web service directly to bypass parent viewing restrictions
                    for (const forum of siteForumsResponse.forums) {
                        try {
                            // Call the web service directly to bypass parent viewing restrictions for site-wide announcements
                            const params: any = {
                                forumid: forum.id,
                                page: 0,
                                perpage: 100,
                            };
                            
                            // Check which WS method is available
                            let response: any;
                            if (site.wsAvailable('mod_forum_get_forum_discussions')) {
                                // Since Moodle 3.7
                                params.sortorder = 1; // LASTPOST_DESC
                                response = await site.read('mod_forum_get_forum_discussions', params);
                            } else {
                                // Older method
                                params.sortby = 'timemodified';
                                params.sortdirection = 'DESC';
                                response = await site.read('mod_forum_get_forum_discussions_paginated', params);
                            }
                            
                            console.log(`[CoreNews] Site forum ${forum.id} discussions response:`, response);
                            
                            if (response && response.discussions) {
                                console.log(`[CoreNews] Found ${response.discussions.length} discussions in site forum ${forum.id}`);
                                
                                // If we successfully got discussions, add them as site-wide announcements
                                const newsItems = response.discussions.map((discussion: any) => ({
                                    id: discussion.id,
                                    name: discussion.name,
                                    subject: discussion.subject,
                                    message: discussion.message,
                                    created: discussion.created,
                                    modified: discussion.modified || discussion.timemodified,
                                    courseId: siteHomeId,
                                    courseName: 'Site',
                                    courseFullname: site.getInfo()?.sitename || 'Site Announcements',
                                    discussionId: discussion.discussion,
                                    forumId: forum.id,
                                    forumName: forum.name,
                                    userfullname: discussion.userfullname || '',
                                    usermodifiedfullname: discussion.usermodifiedfullname || '',
                                    userpictureurl: discussion.userpictureurl,
                                    usermodifiedpictureurl: discussion.usermodifiedpictureurl,
                                    numreplies: discussion.numreplies || 0,
                                    numunread: discussion.numunread || 0,
                                    pinned: discussion.pinned || false,
                                }));
                                
                                allNews.push(...newsItems);
                                console.log(`[CoreNews] Added ${newsItems.length} news items from site forum ${forum.id}`);
                            }
                        } catch (error) {
                            console.error(`[CoreNews] Error fetching site forum ${forum.id}:`, error);
                        }
                    }
                }
            } else {
                console.log('[CoreNews] local_aspireparent_get_site_forums is NOT available');
            }
        } catch (error) {
            console.log('[CoreNews] Site forums webservice not available or error:', error);
        }

        // Sort all news by date (newest first)
        allNews.sort((a, b) => b.created - a.created);

        console.log(`[CoreNews] Total news items collected: ${allNews.length}`);
        console.log('[CoreNews] News items by course:', 
            allNews.reduce((acc, item) => {
                acc[item.courseFullname] = (acc[item.courseFullname] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        );

        return allNews;
    }

    /**
     * Invalidate news cache.
     * 
     * @returns Promise resolved when done.
     */
    async invalidateNews(): Promise<void> {
        const promises: Promise<void>[] = [];
        
        // Invalidate courses
        promises.push(CoreCourses.invalidateUserCourses());
        
        // Invalidate forums for each course
        const courses = await CoreUtils.ignoreErrors(CoreCourses.getUserCourses());
        if (courses) {
            courses.forEach(course => {
                promises.push(CoreUtils.ignoreErrors(
                    AddonModForum.invalidateForumData(course.id)
                ));
            });
        }
        
        await Promise.all(promises);
    }
}

export const CoreNews = makeSingleton(CoreNewsService);