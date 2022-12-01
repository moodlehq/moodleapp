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
    AddonModGlossaryProvider,
} from '../services/glossary';
import { AddonModGlossaryOffline, AddonModGlossaryOfflineEntry } from '../services/glossary-offline';

/**
 * Provides a collection of glossary entries.
 */
export class AddonModGlossaryEntriesSource extends CoreRoutedItemsManagerSource<AddonModGlossaryEntryItem> {

    static readonly NEW_ENTRY: AddonModGlossaryNewEntryForm = { newEntry: true };

    readonly COURSE_ID: number;
    readonly CM_ID: number;
    readonly GLOSSARY_PATH_PREFIX: string;

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

        this.COURSE_ID = courseId;
        this.CM_ID = cmId;
        this.GLOSSARY_PATH_PREFIX = glossaryPathPrefix;
    }

    /**
     * Type guard to infer NewEntryForm objects.
     *
     * @param entry Item to check.
     * @returns Whether the item is a new entry form.
     */
    isNewEntryForm(entry: AddonModGlossaryEntryItem): entry is AddonModGlossaryNewEntryForm {
        return 'newEntry' in entry;
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
        return !this.isNewEntryForm(entry) && !this.isOnlineEntry(entry);
    }

    /**
     * @inheritdoc
     */
    getItemPath(entry: AddonModGlossaryEntryItem): string {
        if (this.isOnlineEntry(entry)) {
            return `${this.GLOSSARY_PATH_PREFIX}entry/${entry.id}`;
        }

        if (this.isOfflineEntry(entry)) {
            return `${this.GLOSSARY_PATH_PREFIX}edit/${entry.timecreated}`;
        }

        return `${this.GLOSSARY_PATH_PREFIX}edit/0`;
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(entry: AddonModGlossaryEntryItem): Params {
        const params: Params = {
            cmId: this.CM_ID,
            courseId: this.COURSE_ID,
        };

        if (this.isOfflineEntry(entry)) {
            params.concept = entry.concept;
        }

        return params;
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

        this.fetchFunction = (options) => AddonModGlossary.getEntriesBySearch(
            glossaryId,
            query,
            true,
            'CONCEPT',
            'ASC',
            options,
        );
        this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesBySearch(
            glossaryId,
            query,
            true,
            'CONCEPT',
            'ASC',
        );
        this.hasSearched = true;
        this.setDirty(true);
    }

    /**
     * Load glossary.
     */
    async loadGlossary(): Promise<void> {
        this.glossary = await AddonModGlossary.getGlossary(this.COURSE_ID, this.CM_ID);
    }

    /**
     * Invalidate glossary cache.
     */
    async invalidateCache(): Promise<void> {
        await Promise.all([
            AddonModGlossary.invalidateCourseGlossaries(this.COURSE_ID),
            this.fetchInvalidate && this.fetchInvalidate(),
            this.glossary && AddonModGlossary.invalidateCategories(this.glossary.id),
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
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByAuthor(
                    glossaryId,
                    'ALL',
                    'LASTNAME',
                    'ASC',
                    options,
                );
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByAuthor(
                    glossaryId,
                    'ALL',
                    'LASTNAME',
                    'ASC',
                );
                break;

            case 'cat_all':
                // Browse by category.
                this.viewMode = 'cat';
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByCategory(
                    glossaryId,
                    AddonModGlossaryProvider.SHOW_ALL_CATEGORIES,
                    options,
                );
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByCategory(
                    glossaryId,
                    AddonModGlossaryProvider.SHOW_ALL_CATEGORIES,
                );
                break;

            case 'newest_first':
                // Newest first.
                this.viewMode = 'date';
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByDate(
                    glossaryId,
                    'CREATION',
                    'DESC',
                    options,
                );
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByDate(
                    glossaryId,
                    'CREATION',
                    'DESC',
                );
                break;

            case 'recently_updated':
                // Recently updated.
                this.viewMode = 'date';
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByDate(
                    glossaryId,
                    'UPDATE',
                    'DESC',
                    options,
                );
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByDate(
                    glossaryId,
                    'UPDATE',
                    'DESC',
                );
                break;

            case 'letter_all':
            default:
                // Consider it is 'letter_all'.
                this.viewMode = 'letter';
                this.fetchMode = 'letter_all';
                this.fetchFunction = (options) => AddonModGlossary.getEntriesByLetter(
                    glossaryId,
                    'ALL',
                    options,
                );
                this.fetchInvalidate = () => AddonModGlossary.invalidateEntriesByLetter(
                    glossaryId,
                    'ALL',
                );
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
            const offlineEntries = await AddonModGlossaryOffline.getGlossaryNewEntries(glossary.id);

            offlineEntries.sort((a, b) => a.concept.localeCompare(b.concept));

            entries.push(AddonModGlossaryEntriesSource.NEW_ENTRY);
            entries.push(...offlineEntries);
        }

        const from = page * this.getPageLength();
        const pageEntries = await fetchFunction({ from, cmId: this.CM_ID });

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
        return AddonModGlossaryProvider.LIMIT_ENTRIES;
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
export type AddonModGlossaryEntryItem = AddonModGlossaryEntry | AddonModGlossaryOfflineEntry | AddonModGlossaryNewEntryForm;

/**
 * Type to select the new entry form.
 */
export type AddonModGlossaryNewEntryForm = { newEntry: true };

/**
 * Fetch mode to sort entries.
 */
export type AddonModGlossaryFetchMode = 'author_all' | 'cat_all' | 'newest_first' | 'recently_updated' | 'letter_all';
