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
import { makeSingleton } from '@singletons';

/**
 * App link item representing a single link/resource.
 */
export interface AppLinkItem {
    name: string;
    url: string;
    type: 'link' | 'file' | 'folder';
    icon?: string;
    children?: AppLinkItem[];
}

/**
 * App link section representing a collapsible group.
 */
export interface AppLinkSection {
    id: number;
    name: string;
    icon: string;
    items: AppLinkItem[];
}

/**
 * Response from the get_app_links web service.
 */
interface AppLinksWSResponse {
    sections: AppLinkSection[];
    courseid: number;
}

/**
 * Service to fetch and manage app links from a dedicated Moodle course.
 * Uses the local_aspireparent_get_app_links web service which doesn't require enrollment.
 */
@Injectable({ providedIn: 'root' })
export class CoreAppLinksService {

    // Course ID for the "App Links" course in Moodle
    static readonly APP_LINKS_COURSE_ID = 1030;

    // Cache for sections
    private cachedSections: AppLinkSection[] | null = null;
    private cacheTimestamp = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Get app link sections from the Moodle course via web service.
     *
     * @param forceRefresh Whether to force refresh from server.
     * @returns Promise resolving to array of app link sections.
     */
    async getAppLinkSections(forceRefresh = false): Promise<AppLinkSection[]> {
        // Check cache first
        if (!forceRefresh && this.cachedSections && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
            return this.cachedSections;
        }

        try {
            const site = CoreSites.getCurrentSite();
            if (!site) {
                return this.cachedSections || [];
            }

            // Call the plugin's web service
            const response = await site.read<AppLinksWSResponse>(
                'local_aspireparent_get_app_links',
                { courseid: CoreAppLinksService.APP_LINKS_COURSE_ID },
            );

            // Add token to file URLs
            const sections = this.addTokenToFileUrls(response.sections);

            // Update cache
            this.cachedSections = sections;
            this.cacheTimestamp = Date.now();

            return sections;
        } catch (error) {
            console.error('[AppLinks] Error fetching app links:', error);
            // Return cached data if available, even if expired
            if (this.cachedSections) {
                return this.cachedSections;
            }
            return [];
        }
    }

    /**
     * Add authentication token to file URLs, decode HTML entities, and apply smart icons.
     *
     * @param sections Sections from the web service.
     * @returns Sections with token added to file URLs, decoded names, and smart icons.
     */
    private addTokenToFileUrls(sections: AppLinkSection[]): AppLinkSection[] {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return sections;
        }

        const token = site.getToken();

        return sections.map(section => {
            const decodedName = this.decodeHtmlEntities(section.name);

            return {
                ...section,
                name: decodedName,
                icon: this.getSectionIcon(decodedName),
                items: section.items.map(item => this.addTokenToItem(item, token)),
            };
        });
    }

    /**
     * Decode HTML entities in a string.
     *
     * @param text Text with potential HTML entities.
     * @returns Decoded text.
     */
    private decodeHtmlEntities(text: string): string {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;

        return textarea.value;
    }

    /**
     * Get smart icon for a section based on its name.
     */
    private getSectionIcon(name: string): string {
        const lower = name.toLowerCase();

        if (lower.includes('calendar')) {
            return 'calendar-outline';
        }
        if (lower.includes('uniform') || lower.includes('suppli')) {
            return 'shirt-outline';
        }
        if (lower.includes('handbook')) {
            return 'book-outline';
        }
        if (lower.includes('polic')) {
            return 'shield-checkmark-outline';
        }
        if (lower.includes('booking') || lower.includes('appointment')) {
            return 'calendar-number-outline';
        }

        return 'folder-outline';
    }

    /**
     * Get smart icon for an item based on its name and type.
     */
    private getItemIcon(name: string, type: string): string {
        const lower = name.toLowerCase();

        // Calendar-related
        if (lower.includes('calendar')) {
            return 'calendar-outline';
        }

        // Booking-related
        if (lower.includes('booking') || lower.includes('appointment')) {
            return 'calendar-number-outline';
        }

        // Uniform/catalog related
        if (lower.includes('uniform') || lower.includes('catalog')) {
            return 'shirt-outline';
        }

        // Handbook related
        if (lower.includes('handbook')) {
            return 'book-outline';
        }

        // Policy related
        if (lower.includes('polic') || lower.includes('behaviour') || lower.includes('behavior')) {
            return 'shield-checkmark-outline';
        }

        // Supplies related
        if (lower.includes('suppli')) {
            return 'cart-outline';
        }

        // File type detection by extension
        if (lower.endsWith('.pdf')) {
            return 'document-text-outline';
        }
        if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
            return 'document-outline';
        }
        if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) {
            return 'grid-outline';
        }
        if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
            return 'easel-outline';
        }
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.gif')) {
            return 'image-outline';
        }

        // Type-based fallbacks
        if (type === 'folder') {
            return 'folder-outline';
        }
        if (type === 'file') {
            return 'document-text-outline';
        }

        // Default for links
        return 'open-outline';
    }

    /**
     * Add token to a single item and its children, decode HTML entities, and apply smart icons.
     */
    private addTokenToItem(item: AppLinkItem, token: string): AppLinkItem {
        const decodedName = this.decodeHtmlEntities(item.name);
        const newItem = {
            ...item,
            name: decodedName,
            icon: this.getItemIcon(decodedName, item.type),
        };

        // Add token to file URLs (not external links)
        if (item.type === 'file' && item.url && !item.url.includes('token=')) {
            newItem.url = item.url + (item.url.includes('?') ? '&' : '?') + 'token=' + token;
        }

        // Process children for folders
        if (item.children && item.children.length > 0) {
            newItem.children = item.children.map(child => this.addTokenToItem(child, token));
        }

        return newItem;
    }

    /**
     * Invalidate the cache.
     */
    invalidateCache(): void {
        this.cachedSections = null;
        this.cacheTimestamp = 0;
    }

}

export const CoreAppLinks = makeSingleton(CoreAppLinksService);
