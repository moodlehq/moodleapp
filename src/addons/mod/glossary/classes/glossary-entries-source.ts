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

import { Params } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import {
    AddonModGlossary,
    AddonModGlossaryEntry,
    AddonModGlossaryGetEntriesOptions,
    AddonModGlossaryGetEntriesWSResponse,
    AddonModGlossaryGlossary,
} from '../services/glossary';
import { AddonModGlossaryOffline, AddonModGlossaryOfflineEntry } from '../services/glossary-offline';
import { ADDON_MOD_GLOSSARY_LIMIT_ENTRIES } from '../constants';

/**
 * Provides a collection of glossary entries.
 */
export class AddonModGlossaryEntriesSource extends CoreRoutedItemsManagerSource<AddonModGlossaryEntryItem> {

    readonly courseId: number;
    readonly cmId: number;
    readonly glossaryPathPrefix: string;

    isSearch = false;
    hasSearched = false;
    fetchMode?: AddonModGlossaryFetchMode;
    viewMode?: string;
    glossary?: AddonModGlossaryGlossary;
    onlineEntries: AddonModGlossaryEntry[] = [];
    offlineEntries: AddonModGlossaryOfflineEntry[] = [];

    protected fetchFunction?: (options?: AddonModGlossaryGetEntriesOptions) => Promise<AddonModGlossaryGetEntriesWSResponse>;
    protected fetchInvalidate?: () => Promise<void>;

    constructor(courseId: number, cmId: number, glossaryPathPrefix: string) {
        super();

        this.courseId = courseId;
        this.cmId = cmId;
        this.glossaryPathPrefix = glossaryPathPrefix;
    }

    /**
     * Type guard to infer entry objects.
     *
     * @param entry Item to check.
     * @returns Whether the item is an offline entry.
     */
    isOnlineEntry(entry: AddonModGlossaryEntryItem): entry is AddonModGlossaryEntry {
        return 'id' in entry;
    }

    /**
     * Type guard to infer entry objects.
     *
     * @param entry Item to check.
     * @returns Whether the item is an offline entry.
     */
    isOfflineEntry(entry: AddonModGlossaryEntryItem): entry is AddonModGlossaryOfflineEntry {
        return !this.isOnlineEntry(entry);
    }

    /**
     * @inheritdoc
     */
    getItemPath(entry: AddonModGlossaryEntryItem): string {
        if (this.isOfflineEntry(entry)) {
            return `${this.glossaryPathPrefix}entry/new-${entry.timecreated}`;
        }

        return `${this.glossaryPathPrefix}entry/${entry.id}`;
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(): Params {
        return {
            cmId: this.cmId,
            courseId: this.courseId,
        };
    }

    /**
     * @inheritdoc
     */
    getPagesLoaded(): number {
        if (this.items === null) {
            return 0;
        }

        return Math.ceil(this.onlineEntries.length / this.getPageLength());
    }

    /**
     * Start searching.
     */
    startSearch(): void {
        this.isSearch = true;
        this.setDirty(true);
    }

    /**
     * Stop searching and restore unfiltered collection.
     *
     * @param cachedOnlineEntries Cached online entries.
     * @param hasMoreOnlineEntries Whether there were more online entries.
     */
    stopSearch(cachedOnlineEntries: AddonModGlossaryEntry[], hasMoreOnlineEntries: boolean): void {
        if (!this.fetchMode) {
            return;
        }

        this.isSearch = false;
        this.hasSearched = false;
        this.onlineEntries = cachedOnlineEntries;
        this.hasMoreItems = hasMoreOnlineEntries;
        this.setDirty(true);
    }

    /**
     * Set search query.
     *
     * @param query Search query.
     */
    search(query: string): void {
        if (!this.glossary) {
            return;
        }

        const glossaryId = this.glossary.id;

        this.fetchFunction = (options) => AddonModGlossary.getEntriesBySearch(glossaryId, query, true, options);
        this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesBySearch(glossaryId, query, true);
        this.hasSearched = true;
        this.setDirty(true);
    }

    /**
     * Load glossary.
     */
    async loadGlossary(): Promise<void> {
        this.glossary = await AddonModGlossary.getGlossary(this.courseId, this.cmId);
    }

    /**
     * Invalidate glossary cache.
     *
     * @param invalidateGlossary Whether to invalidate the entire glossary or not
     */
    async invalidateCache(invalidateGlossary: boolean = true): Promise<void> {
        await Promise.all<unknown>([
            this.fetchInvalidate && this.fetchInvalidate(),
            invalidateGlossary && AddonModGlossary.invalidateCourseGlossaries(this.courseId),
            invalidateGlossary && this.glossary && AddonModGlossary.invalidateCategories(this.glossary.id),
        ]);
    }

    /**
     * Change fetch mode.
     *
     * @param mode New mode.
     */
    switchMode(mode: AddonModGlossaryFetchMode): void {
        if (!this.glossary) {
            throw new Error('Can\'t switch entries mode without a glossary!');
        }

        const glossaryId = this.glossary.id;
        this.fetchMode = mode;
        this.isSearch = false;
        this.setDirty(true);

        switch (mode) {
            case 'author_all':
                // Browse by author.
                this.viewMode = 'author';
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByAuthor(glossaryId, options);
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByAuthor(glossaryId);
                break;

            case 'cat_all':
                // Browse by category.
                this.viewMode = 'cat';
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByCategory(glossaryId, options);
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByCategory(glossaryId);
                break;

            case 'newest_first':
                // Newest first.
                this.viewMode = 'date';
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByDate(glossaryId, 'CREATION', options);
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByDate(glossaryId, 'CREATION');
                break;

            case 'recently_updated':
                // Recently updated.
                this.viewMode = 'date';
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByDate(glossaryId, 'UPDATE', options);
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByDate(glossaryId, 'UPDATE');
                break;

            case 'letter_all':
            default:
                // Consider it is 'letter_all'.
                this.viewMode = 'letter';
                this.fetchMode = 'letter_all';
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByLetter(glossaryId, options);
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByLetter(glossaryId);
                break;
        }
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(page: number): Promise<{ items: AddonModGlossaryEntryItem[]; hasMoreItems: boolean }> {
        const glossary = this.glossary;
        const fetchFunction = this.fetchFunction;

        if (!glossary || !fetchFunction) {
            throw new Error('Can\'t load entries without glossary or fetch function');
        }

        const entries: AddonModGlossaryEntryItem[] = [];

        if (page === 0) {
            const offlineEntries = await AddonModGlossaryOffline.getGlossaryOfflineEntries(glossary.id);

            offlineEntries.sort((a, b) => a.concept.localeCompare(b.concept));

            entries.push(...offlineEntries);
        }

        const from = page * this.getPageLength();
        const pageEntries = await fetchFunction({ from, cmId: this.cmId });

        entries.push(...pageEntries.entries);

        return {
            items: entries,
            hasMoreItems: from + pageEntries.entries.length < pageEntries.count,
        };
    }

    /**
     * @inheritdoc
     */
    protected getPageLength(): number {
        return ADDON_MOD_GLOSSARY_LIMIT_ENTRIES;
    }

    /**
     * @inheritdoc
     */
    protected setItems(entries: AddonModGlossaryEntryItem[], hasMoreItems: boolean): void {
        this.onlineEntries = [];
        this.offlineEntries = [];

        entries.forEach(entry => {
            this.isOnlineEntry(entry) && this.onlineEntries.push(entry);
            this.isOfflineEntry(entry) && this.offlineEntries.push(entry);
        });

        super.setItems(entries, hasMoreItems);
    }

    /**
     * @inheritdoc
     */
    reset(): void {
        this.onlineEntries = [];
        this.offlineEntries = [];

        super.reset();
    }

}

/**
 * Type of items that can be held by the entries manager.
 */
export type AddonModGlossaryEntryItem = AddonModGlossaryEntry | AddonModGlossaryOfflineEntry;

/**
 * Fetch mode to sort entries.
 */
export type AddonModGlossaryFetchMode = 'author_all' | 'cat_all' | 'newest_first' | 'recently_updated' | 'letter_all';
