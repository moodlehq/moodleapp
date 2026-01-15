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
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourses, CoreCategoryData } from '@features/courses/services/courses';

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

    // NEW: Navigation state for compact breadcrumb design
    currentPath: CategoryNode[] = [];
    currentSubcategories: CategoryNode[] = [];
    currentNewsItems: CoreNewsItem[] = [];
    private allCategoryNodes: { [id: number]: CategoryNode } = {};

    // Modal state
    selectedNewsItem: CoreNewsItem | null = null;
    isModalOpen = false;

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

            // Initialize navigation to root
            this.navigateToRoot();

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
     * Open a news item in a modal.
     *
     * @param newsItem The news item to display.
     */
    openNewsItem(newsItem: CoreNewsItem): void {
        console.log('[NewsListPage] Opening news item in modal:', newsItem);
        this.selectedNewsItem = newsItem;
        this.isModalOpen = true;
    }

    /**
     * Close the news detail modal.
     */
    closeModal(): void {
        this.isModalOpen = false;
        this.selectedNewsItem = null;
    }

    /**
     * Format full date for modal display.
     *
     * @param timestamp Unix timestamp.
     * @returns Formatted date string.
     */
    formatFullDate(timestamp: number): string {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Navigate to root level (show all top-level categories).
     * Auto-selects if only one category, or picks latest term.
     */
    navigateToRoot(): void {
        this.currentPath = [];
        this.currentSubcategories = [...this.categoryTree];
        this.currentNewsItems = [];
        console.log('[NewsListPage] Navigated to root, subcategories:', this.currentSubcategories.length);

        // Auto-navigate if appropriate
        this.autoSelectCategory(this.currentSubcategories);
    }

    /**
     * Navigate into a category.
     * Auto-selects if only one subcategory, or picks latest term.
     *
     * @param category The category to navigate into.
     * @param skipAutoSelect Whether to skip auto-selection (used internally).
     */
    navigateToCategory(category: CategoryNode, skipAutoSelect = false): void {
        // Add to path
        this.currentPath = [...this.currentPath, category];
        // Set subcategories to this category's children
        this.currentSubcategories = category.children || [];
        // Set news items to this category's direct news
        this.currentNewsItems = category.newsItems || [];
        console.log('[NewsListPage] Navigated to category:', category.name,
            'Subcats:', this.currentSubcategories.length,
            'News:', this.currentNewsItems.length);

        // Auto-navigate deeper if appropriate (unless skipped)
        if (!skipAutoSelect) {
            this.autoSelectCategory(this.currentSubcategories);
        }
    }

    /**
     * Auto-select a category from the list based on rules:
     * 1. If only one category, auto-select it
     * 2. If categories look like terms (Term 1, Term 2, etc.), select the latest
     *
     * @param categories The categories to evaluate.
     */
    protected autoSelectCategory(categories: CategoryNode[]): void {
        if (categories.length === 0) {
            return;
        }

        // Rule 1: Only one category - auto-select it
        if (categories.length === 1) {
            console.log('[NewsListPage] Auto-selecting only category:', categories[0].name);
            this.navigateToCategory(categories[0]);
            return;
        }

        // Rule 2: Check if all categories are term-like (Term 1, Term 2, Semester 1, etc.)
        const latestTerm = this.findLatestTermCategory(categories);
        if (latestTerm) {
            console.log('[NewsListPage] Auto-selecting latest term:', latestTerm.name);
            this.navigateToCategory(latestTerm);
            return;
        }

        // No auto-selection - let user choose
    }

    /**
     * Find the latest term category from a list.
     * Matches patterns like: "Term 1", "Term 2", "Semester 1", "Quarter 3", "T1", "S2"
     *
     * @param categories The categories to check.
     * @returns The latest term category, or null if not all are terms.
     */
    protected findLatestTermCategory(categories: CategoryNode[]): CategoryNode | null {
        // Patterns to match term-like names
        const termPatterns = [
            /^term\s*(\d+)/i,           // Term 1, Term 2
            /^t(\d+)/i,                  // T1, T2
            /^semester\s*(\d+)/i,        // Semester 1, Semester 2
            /^sem\s*(\d+)/i,             // Sem 1, Sem 2
            /^s(\d+)/i,                  // S1, S2
            /^quarter\s*(\d+)/i,         // Quarter 1, Quarter 2
            /^q(\d+)/i,                  // Q1, Q2
            /(\d{4})[-\/](\d{4})/,       // 2024-2025, 2024/2025 (academic years)
            /^(\d{4})$/,                 // Just year: 2024, 2025
        ];

        const termNumbers: { category: CategoryNode; number: number }[] = [];

        for (const category of categories) {
            let matched = false;
            const name = category.name.trim();

            for (const pattern of termPatterns) {
                const match = name.match(pattern);
                if (match) {
                    // Extract the number
                    let num: number;
                    if (match[2]) {
                        // Academic year pattern - use ending year
                        num = parseInt(match[2], 10);
                    } else {
                        num = parseInt(match[1], 10);
                    }

                    if (!isNaN(num)) {
                        termNumbers.push({ category, number: num });
                        matched = true;
                        break;
                    }
                }
            }

            // If any category doesn't match term pattern, don't auto-select
            if (!matched) {
                return null;
            }
        }

        // All categories are terms - find the one with highest number
        if (termNumbers.length === categories.length && termNumbers.length > 0) {
            termNumbers.sort((a, b) => b.number - a.number);
            return termNumbers[0].category;
        }

        return null;
    }

    /**
     * Navigate to a specific breadcrumb position.
     * Does NOT auto-select - user is intentionally navigating back to choose.
     *
     * @param index The index in the breadcrumb path.
     */
    navigateToBreadcrumb(index: number): void {
        if (index < 0) {
            // Going to root - but don't auto-select, user wants to see options
            this.currentPath = [];
            this.currentSubcategories = [...this.categoryTree];
            this.currentNewsItems = [];
            return;
        }

        // Slice path to this index (inclusive)
        this.currentPath = this.currentPath.slice(0, index + 1);

        if (this.currentPath.length > 0) {
            const current = this.currentPath[this.currentPath.length - 1];
            this.currentSubcategories = current.children || [];
            this.currentNewsItems = current.newsItems || [];
        } else {
            this.currentPath = [];
            this.currentSubcategories = [...this.categoryTree];
            this.currentNewsItems = [];
        }
        // No auto-selection here - user explicitly chose to go back
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
        this.allCategoryNodes = {};

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

            // Store all nodes for navigation
            this.allCategoryNodes = categoryNodes;

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
     * Toggle category expansion (legacy - kept for compatibility)
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
