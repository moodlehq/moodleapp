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

import { Component, OnInit } from '@angular/core';
import { CoreNews, CoreNewsItem } from '../../services/news';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSites } from '@services/sites';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { AddonModForum } from '@addons/mod/forum/services/forum';

/**
 * Page that displays all news from all courses.
 */
@Component({
    selector: 'page-core-news-list',
    templateUrl: 'list.html',
    styleUrls: ['list.scss'],
})
export class CoreNewsListPage implements OnInit {

    news: CoreNewsItem[] = [];
    loaded = false;
    canLoadMore = false;
    loadMoreError = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.loadNews();
    }

    /**
     * Load news items.
     * 
     * @param refresh Whether to refresh the data.
     */
    protected async loadNews(refresh = false): Promise<void> {
        try {
            this.news = await CoreNews.getAllNews(refresh);
            this.loaded = true;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading news');
            this.loaded = true;
        }
    }

    /**
     * Refresh the news.
     * 
     * @param refresher The refresher.
     */
    async refreshNews(refresher: HTMLIonRefresherElement): Promise<void> {
        try {
            await CoreNews.invalidateNews();
        } finally {
            await this.loadNews(true);
            refresher?.complete();
        }
    }

    /**
     * Navigate to a news item.
     * 
     * @param newsItem The news item to navigate to.
     */
    async openNewsItem(newsItem: CoreNewsItem): Promise<void> {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return;
        }

        try {
            // Get the forum module info
            const forums = await AddonModForum.getCourseForums(newsItem.courseId);
            const forum = forums.find(f => f.id === newsItem.forumId);
            
            if (forum && forum.cmid) {
                // Navigate to the discussion
                CoreNavigator.navigateToSitePath(
                    `/mod_forum/${newsItem.courseId}/${forum.cmid}/${newsItem.discussionId}`
                );
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error opening news item');
        }
    }

    /**
     * Get the course badge color based on course ID.
     * 
     * @param courseId Course ID.
     * @returns Color class name.
     */
    getCourseBadgeColor(courseId: number): string {
        // Use different colors for different courses
        const colors = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger'];
        return colors[courseId % colors.length];
    }

    /**
     * Format the date for display.
     * 
     * @param timestamp Unix timestamp.
     * @returns Formatted date string.
     */
    formatDate(timestamp: number): string {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}