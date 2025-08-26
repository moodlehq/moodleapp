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
import { CoreCourses, CoreCategoryData } from '@features/courses/services/courses';
import { CoreUtils } from '@services/utils/utils';
import { CoreTime } from '@singletons/time';

/**
 * Category node for hierarchical display
 */
interface CategoryNode {
    id: number;
    name: string;
    parent: number;
    depth: number;
    path: string;
    coursecount?: number;
    newsItems: CoreNewsItem[];
    children: CategoryNode[];
    expanded?: boolean;
    hasNews?: boolean;
}

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
    
    // Category grouping
    categoryTree: CategoryNode[] = [];
    expandedCategories: { [categoryId: number]: boolean } = {};
    categoriesData: { [id: number]: CoreCategoryData } = {};
    viewMode: 'grouped' | 'timeline' | 'all' = 'grouped';
    timelineData: any[] = [];

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
            console.log('[NewsListPage] Loading news...');
            this.news = await CoreNews.getAllNews(refresh);
            console.log('[NewsListPage] Received news items:', this.news.length);
            console.log('[NewsListPage] News data:', this.news);
            
            await this.groupNewsByCategory();
            console.log('[NewsListPage] Grouped categories:', this.categoryTree);
            
            this.createTimelineData();
            console.log('[NewsListPage] Timeline data:', this.timelineData);
            
            this.loaded = true;
        } catch (error) {
            console.error('[NewsListPage] Error loading news:', error);
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
    
    /**
     * Group news by category hierarchically.
     */
    protected async groupNewsByCategory(): Promise<void> {
        this.categoryTree = [];
        
        if (!this.news || this.news.length === 0) {
            return;
        }
        
        try {
            // Get unique course IDs from news items
            const courseIds = [...new Set(this.news.map(item => item.courseId))];
            
            // Fetch course data with categories
            const coursesData = await CoreCourses.getCoursesByField('ids', courseIds.join(','));
            
            // Create a map for quick lookup
            const courseMap: { [id: number]: any } = {};
            const categoryIdsSet = new Set<number>();
            
            coursesData.forEach(course => {
                courseMap[course.id] = course;
                if (course.categoryid) {
                    categoryIdsSet.add(course.categoryid);
                }
            });
            
            // Fetch all categories data
            const categories = await CoreCourses.getCategories(0, true);
            const categoriesMap: { [id: number]: CoreCategoryData } = {};
            
            categories.forEach(cat => {
                categoriesMap[cat.id] = cat;
                this.categoriesData[cat.id] = cat;
            });
            
            // Build the category tree
            const categoryNodes: { [id: number]: CategoryNode } = {};
            
            // First pass: create all nodes
            categories.forEach(cat => {
                categoryNodes[cat.id] = {
                    id: cat.id,
                    name: cat.name,
                    parent: cat.parent,
                    depth: cat.depth,
                    path: cat.path,
                    coursecount: cat.coursecount,
                    newsItems: [],
                    children: [],
                    expanded: false,
                    hasNews: false
                };
            });
            
            // Add uncategorized node
            categoryNodes[0] = {
                id: 0,
                name: 'Uncategorized',
                parent: 0,
                depth: 0,
                path: '/0',
                newsItems: [],
                children: [],
                expanded: false,
                hasNews: false
            };
            
            // Group news items by category
            this.news.forEach(newsItem => {
                const courseInfo = courseMap[newsItem.courseId];
                const categoryId = courseInfo?.categoryid || 0;
                
                if (categoryNodes[categoryId]) {
                    categoryNodes[categoryId].newsItems.push(newsItem);
                    categoryNodes[categoryId].hasNews = true;
                    
                    // Mark parent categories as having news
                    let parentId = categoryNodes[categoryId].parent;
                    while (parentId > 0 && categoryNodes[parentId]) {
                        categoryNodes[parentId].hasNews = true;
                        parentId = categoryNodes[parentId].parent;
                    }
                } else {
                    // Put in uncategorized
                    categoryNodes[0].newsItems.push(newsItem);
                    categoryNodes[0].hasNews = true;
                }
            });
            
            // Second pass: build hierarchy
            Object.values(categoryNodes).forEach(node => {
                if (node.hasNews) {
                    if (node.parent === 0 || !categoryNodes[node.parent]) {
                        // Top level category
                        this.categoryTree.push(node);
                    } else if (categoryNodes[node.parent] && categoryNodes[node.parent].hasNews) {
                        // Child category (only if parent has news)
                        categoryNodes[node.parent].children.push(node);
                    }
                }
            });
            
            // Sort categories by name at each level
            const sortCategories = (nodes: CategoryNode[]) => {
                nodes.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
                nodes.forEach(node => {
                    if (node.children.length > 0) {
                        sortCategories(node.children);
                    }
                    // Sort news items by date (newest first)
                    node.newsItems.sort((a, b) => b.created - a.created);
                });
            };
            
            sortCategories(this.categoryTree);
            
            // Auto-expand categories with news
            this.autoExpandCategories(this.categoryTree);
            
        } catch (error) {
            console.error('Error building category hierarchy:', error);
            // Fallback: flat list
            this.categoryTree = [{
                id: 0,
                name: 'All News',
                parent: 0,
                depth: 0,
                path: '/0',
                newsItems: this.news,
                children: [],
                expanded: true,
                hasNews: true
            }];
        }
    }
    
    /**
     * Auto-expand categories that contain news
     */
    protected autoExpandCategories(nodes: CategoryNode[]): void {
        nodes.forEach(node => {
            if (node.newsItems.length > 0) {
                node.expanded = true;
                this.expandedCategories[node.id] = true;
            }
            if (node.children.length > 0) {
                this.autoExpandCategories(node.children);
            }
        });
    }
    
    /**
     * Toggle category expansion
     */
    toggleCategory(categoryId: number): void {
        this.expandedCategories[categoryId] = !this.expandedCategories[categoryId];
        const updateNode = (nodes: CategoryNode[]) => {
            nodes.forEach(node => {
                if (node.id === categoryId) {
                    node.expanded = this.expandedCategories[categoryId];
                }
                if (node.children.length > 0) {
                    updateNode(node.children);
                }
            });
        };
        updateNode(this.categoryTree);
    }
    
    /**
     * Create timeline data from news.
     */
    protected createTimelineData(): void {
        const timelineItems = [...this.news];
        
        // Sort by date descending
        timelineItems.sort((a, b) => b.created - a.created);
        
        // Group by month
        const months: { [key: string]: any } = {};
        timelineItems.forEach(item => {
            const monthKey = new Date(item.created * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            if (!months[monthKey]) {
                months[monthKey] = {
                    name: monthKey,
                    items: [],
                };
            }
            months[monthKey].items.push(item);
        });
        
        this.timelineData = Object.values(months);
    }
    
    /**
     * Get timeline months for template.
     */
    getTimelineMonths(): any[] {
        return this.timelineData;
    }
    
    /**
     * Handle view mode change.
     */
    onViewModeChange(): void {
        // View mode changed
        console.log('View mode changed to:', this.viewMode);
    }

    /**
     * Count total news items in a category and all its descendants.
     */
    countTotalNewsItems(category: CategoryNode): number {
        let count = category.newsItems.length;
        
        // Add counts from all child categories recursively
        for (const child of category.children) {
            count += this.countTotalNewsItems(child);
        }
        
        return count;
    }
}