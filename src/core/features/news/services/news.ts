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

        // Get all user courses
        const courses = await CoreCourses.getUserCourses(false, undefined, undefined);
        
        // Get site home ID for site news
        const siteHomeId = site.getSiteHomeId();
        
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
        }

        const allNews: CoreNewsItem[] = [];

        // Fetch news forums from each course
        for (const course of courses) {
            try {
                // Get forums for this course
                const forums = await AddonModForum.getCourseForums(course.id);
                
                // Filter for news forums
                const newsForums = forums.filter(forum => forum.type === 'news');
                
                // Get discussions from each news forum
                for (const forum of newsForums) {
                    try {
                        const response = await AddonModForum.getDiscussions(forum.id, {
                            sortOrder: 1, // Sort by date descending
                            page: 0,
                        });
                        
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
                    } catch (error) {
                        // Ignore errors for individual forums
                        console.error(`Error fetching news from forum ${forum.id}:`, error);
                    }
                }
            } catch (error) {
                // Ignore errors for individual courses
                console.error(`Error fetching forums from course ${course.id}:`, error);
            }
        }

        // Sort all news by date (newest first)
        allNews.sort((a, b) => b.created - a.created);

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