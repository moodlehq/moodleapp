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

import { ContextLevel } from '@/core/constants';
import { AfterViewInit, Component, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { CoreRatingProvider } from '@features/rating/services/rating';
import { CoreRatingOffline } from '@features/rating/services/rating-offline';
import { CoreRatingSyncProvider } from '@features/rating/services/rating-sync';
import { IonContent } from '@ionic/angular';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    AddonModGlossary,
    AddonModGlossaryEntry,
    AddonModGlossaryEntryWithCategory,
    AddonModGlossaryGetEntriesOptions,
    AddonModGlossaryGetEntriesWSResponse,
    AddonModGlossaryGlossary,
    AddonModGlossaryProvider,
} from '../../services/glossary';
import { AddonModGlossaryOffline, AddonModGlossaryOfflineEntry } from '../../services/glossary-offline';
import {
    AddonModGlossaryAutoSyncData,
    AddonModGlossarySyncProvider,
    AddonModGlossarySyncResult,
} from '../../services/glossary-sync';
import { AddonModGlossaryModuleHandlerService } from '../../services/handlers/module';
import { AddonModGlossaryPrefetchHandler } from '../../services/handlers/prefetch';
import { AddonModGlossaryModePickerPopoverComponent } from '../mode-picker/mode-picker';

/**
 * Component that displays a glossary entry page.
 */
@Component({
    selector: 'addon-mod-glossary-index',
    templateUrl: 'addon-mod-glossary-index.html',
})
export class AddonModGlossaryIndexComponent extends CoreCourseModuleMainActivityComponent
    implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    component = AddonModGlossaryProvider.COMPONENT;
    moduleName = 'glossary';

    isSearch = false;
    hasSearched = false;
    canAdd = false;
    loadMoreError = false;
    loadingMessage?: string;
    entries: AddonModGlossaryEntriesManager;
    hasOfflineRatings = false;
    glossary?: AddonModGlossaryGlossary;

    protected syncEventName = AddonModGlossarySyncProvider.AUTO_SYNCED;
    protected fetchFunction?: (options?: AddonModGlossaryGetEntriesOptions) => AddonModGlossaryGetEntriesWSResponse;
    protected fetchInvalidate?: () => Promise<void>;
    protected addEntryObserver?: CoreEventObserver;
    protected fetchMode?: AddonModGlossaryFetchMode;
    protected viewMode?: string;
    protected fetchedEntriesCanLoadMore = false;
    protected fetchedEntries: AddonModGlossaryEntry[] = [];
    protected ratingOfflineObserver?: CoreEventObserver;
    protected ratingSyncObserver?: CoreEventObserver;

    getDivider?: (entry: AddonModGlossaryEntry) => string;
    showDivider: (entry: AddonModGlossaryEntry, previous?: AddonModGlossaryEntry) => boolean = () => false;

    constructor(
        route: ActivatedRoute,
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModGlossaryIndexComponent', content, courseContentsPage);

        this.entries = new AddonModGlossaryEntriesManager(
            route.component,
            this,
            courseContentsPage ? `${AddonModGlossaryModuleHandlerService.PAGE_NAME}/` : '',
        );
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.loadingMessage = Translate.instant('core.loading');

        // When an entry is added, we reload the data.
        this.addEntryObserver = CoreEvents.on(AddonModGlossaryProvider.ADD_ENTRY_EVENT, (data) => {
            if (this.glossary && this.glossary.id === data.glossaryId) {
                this.showLoadingAndRefresh(false);

                // Check completion since it could be configured to complete once the user adds a new entry.
                CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
            }
        });

        // Listen for offline ratings saved and synced.
        this.ratingOfflineObserver = CoreEvents.on(CoreRatingProvider.RATING_SAVED_EVENT, (data) => {
            if (this.glossary && data.component == 'mod_glossary' && data.ratingArea == 'entry' && data.contextLevel == 'module'
                    && data.instanceId == this.glossary.coursemodule) {
                this.hasOfflineRatings = true;
            }
        });
        this.ratingSyncObserver = CoreEvents.on(CoreRatingSyncProvider.SYNCED_EVENT, (data) => {
            if (this.glossary && data.component == 'mod_glossary' && data.ratingArea == 'entry' && data.contextLevel == 'module'
                    && data.instanceId == this.glossary.coursemodule) {
                this.hasOfflineRatings = false;
            }
        });
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.loadContent(false, true);

        if (!this.glossary) {
            return;
        }

        this.entries.start(this.splitView);

        try {
            await AddonModGlossary.logView(this.glossary.id, this.viewMode!, this.glossary.name);

            CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
        } catch (error) {
            // Ignore errors.
        }
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<void> {
        try {
            this.glossary = await AddonModGlossary.getGlossary(this.courseId, this.module.id);

            this.description = this.glossary.intro || this.description;
            this.canAdd = (AddonModGlossary.isPluginEnabledForEditing() && !!this.glossary.canaddentry) || false;

            this.dataRetrieved.emit(this.glossary);

            if (!this.fetchMode) {
                this.switchMode('letter_all');
            }

            if (sync) {
                // Try to synchronize the glossary.
                await this.syncActivity(showErrors);
            }

            const [hasOfflineRatings] = await Promise.all([
                CoreRatingOffline.hasRatings('mod_glossary', 'entry', ContextLevel.MODULE, this.glossary.coursemodule),
                this.fetchEntries(),
            ]);

            this.hasOfflineRatings = hasOfflineRatings;
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Convenience function to fetch entries.
     *
     * @param append True if fetched entries are appended to exsiting ones.
     * @return Promise resolved when done.
     */
    protected async fetchEntries(append: boolean = false): Promise<void> {
        if (!this.fetchFunction) {
            return;
        }

        this.loadMoreError = false;
        const from = append ? this.entries.onlineEntries.length : 0;

        const result = await this.fetchFunction({
            from: from,
            cmId: this.module.id,
        });

        const hasMoreEntries = from + result.entries.length < result.count;

        if (append) {
            this.entries.setItems(this.entries.items.concat(result.entries), hasMoreEntries);
        } else {
            this.entries.setOnlineEntries(result.entries, hasMoreEntries);
        }

        // Now get the ofline entries.
        // Check if there are responses stored in offline.
        const offlineEntries = await AddonModGlossaryOffline.getGlossaryNewEntries(this.glossary!.id);

        offlineEntries.sort((a, b) => a.concept.localeCompare(b.concept));
        this.hasOffline = !!offlineEntries.length;
        this.entries.setOfflineEntries(offlineEntries);
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        if (this.fetchInvalidate) {
            promises.push(this.fetchInvalidate());
        }

        promises.push(AddonModGlossary.invalidateCourseGlossaries(this.courseId));

        if (this.glossary) {
            promises.push(AddonModGlossary.invalidateCategories(this.glossary.id));
        }

        await Promise.all(promises);
    }

    /**
     * Performs the sync of the activity.
     *
     * @return Promise resolved when done.
     */
    protected sync(): Promise<AddonModGlossarySyncResult> {
        return AddonModGlossaryPrefetchHandler.sync(this.module, this.courseId);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param result Data returned on the sync function.
     * @return Whether it succeed or not.
     */
    protected hasSyncSucceed(result: AddonModGlossarySyncResult): boolean {
        return result.updated;
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @return True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModGlossaryAutoSyncData): boolean {
        return !!this.glossary && syncEventData.glossaryId == this.glossary.id &&
                syncEventData.userId == CoreSites.getCurrentSiteUserId();
    }

    /**
     * Change fetch mode.
     *
     * @param mode New mode.
     */
    protected switchMode(mode: AddonModGlossaryFetchMode): void {
        this.fetchMode = mode;
        this.isSearch = false;

        switch (mode) {
            case 'author_all':
                // Browse by author.
                this.viewMode = 'author';
                this.fetchFunction = AddonModGlossary.getEntriesByAuthor.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    'ALL',
                    'LASTNAME',
                    'ASC',
                );
                this.fetchInvalidate = AddonModGlossary.invalidateEntriesByAuthor.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    'ALL',
                    'LASTNAME',
                    'ASC',
                );
                this.getDivider = (entry) => entry.userfullname;
                this.showDivider = (entry, previous) => !previous || entry.userid != previous.userid;
                break;

            case 'cat_all':
                // Browse by category.
                this.viewMode = 'cat';
                this.fetchFunction = AddonModGlossary.getEntriesByCategory.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    AddonModGlossaryProvider.SHOW_ALL_CATEGORIES,
                );
                this.fetchInvalidate = AddonModGlossary.invalidateEntriesByCategory.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    AddonModGlossaryProvider.SHOW_ALL_CATEGORIES,
                );
                this.getDivider = (entry: AddonModGlossaryEntryWithCategory) => entry.categoryname || '';
                this.showDivider = (entry, previous) => !previous || this.getDivider!(entry) != this.getDivider!(previous);
                break;

            case 'newest_first':
                // Newest first.
                this.viewMode = 'date';
                this.fetchFunction = AddonModGlossary.getEntriesByDate.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    'CREATION',
                    'DESC',
                );
                this.fetchInvalidate = AddonModGlossary.invalidateEntriesByDate.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    'CREATION',
                    'DESC',
                );
                this.getDivider = undefined;
                this.showDivider = () => false;
                break;

            case 'recently_updated':
                // Recently updated.
                this.viewMode = 'date';
                this.fetchFunction = AddonModGlossary.getEntriesByDate.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    'UPDATE',
                    'DESC',
                );
                this.fetchInvalidate = AddonModGlossary.invalidateEntriesByDate.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    'UPDATE',
                    'DESC',
                );
                this.getDivider = undefined;
                this.showDivider = () => false;
                break;

            case 'letter_all':
            default:
                // Consider it is 'letter_all'.
                this.viewMode = 'letter';
                this.fetchMode = 'letter_all';
                this.fetchFunction = AddonModGlossary.getEntriesByLetter.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    'ALL',
                );
                this.fetchInvalidate = AddonModGlossary.invalidateEntriesByLetter.bind(
                    AddonModGlossary.instance,
                    this.glossary!.id,
                    'ALL',
                );
                this.getDivider = (entry) => {
                    // Try to get the first letter without HTML tags.
                    const noTags = CoreTextUtils.cleanTags(entry.concept);

                    return (noTags || entry.concept).substr(0, 1).toUpperCase();
                };
                this.showDivider = (entry, previous) => !previous || this.getDivider!(entry) != this.getDivider!(previous);
                break;
        }
    }

    /**
     * Convenience function to load more entries.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @return Promise resolved when done.
     */
    async loadMoreEntries(infiniteComplete?: () => void): Promise<void> {
        try {
            await this.fetchEntries(true);
        } catch (error) {
            this.loadMoreError = true;
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_glossary.errorloadingentries', true);
        } finally {
            infiniteComplete && infiniteComplete();
        }
    }

    /**
     * Show the mode picker menu.
     *
     * @param event Event.
     */
    async openModePicker(event: MouseEvent): Promise<void> {
        const mode = await CoreDomUtils.openPopover<AddonModGlossaryFetchMode>({
            component: AddonModGlossaryModePickerPopoverComponent,
            componentProps: {
                browseModes: this.glossary!.browsemodes,
                selectedMode: this.isSearch ? '' : this.fetchMode,
            },
            event,
        });

        if (mode) {
            if (mode !== this.fetchMode) {
                this.changeFetchMode(mode);
            } else if (this.isSearch) {
                this.toggleSearch();
            }
        }
    }

    /**
     * Toggles between search and fetch mode.
     */
    toggleSearch(): void {
        if (this.isSearch) {
            this.isSearch = false;
            this.hasSearched = false;
            this.entries.setOnlineEntries(this.fetchedEntries, this.fetchedEntriesCanLoadMore);
            this.switchMode(this.fetchMode!);
        } else {
            // Search for entries. The fetch function will be set when searching.
            this.getDivider = undefined;
            this.showDivider = () => false;
            this.isSearch = true;

            this.fetchedEntries = this.entries.onlineEntries;
            this.fetchedEntriesCanLoadMore = !this.entries.completed;
            this.entries.setItems([], false);
        }
    }

    /**
     * Change fetch mode.
     *
     * @param mode Mode.
     */
    changeFetchMode(mode: AddonModGlossaryFetchMode): void {
        this.isSearch = false;
        this.loadingMessage = Translate.instant('core.loading');
        this.content?.scrollToTop();
        this.switchMode(mode);
        this.loaded = false;
        this.loadContent();
    }

    /**
     * Opens new entry editor.
     */
    openNewEntry(): void {
        this.entries.select({ newEntry: true });
    }

    /**
     * Search entries.
     *
     * @param query Text entered on the search box.
     */
    search(query: string): void {
        this.loadingMessage = Translate.instant('core.searching');
        this.fetchFunction = AddonModGlossary.getEntriesBySearch.bind(
            AddonModGlossary.instance,
            this.glossary!.id,
            query,
            true,
            'CONCEPT',
            'ASC',
        );
        this.fetchInvalidate = AddonModGlossary.invalidateEntriesBySearch.bind(
            AddonModGlossary.instance,
            this.glossary!.id,
            query,
            true,
            'CONCEPT',
            'ASC',
        );
        this.loaded = false;
        this.hasSearched = true;
        this.loadContent();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.addEntryObserver?.off();
        this.ratingOfflineObserver?.off();
        this.ratingSyncObserver?.off();
    }

}

/**
 * Type to select the new entry form.
 */
type NewEntryForm = { newEntry: true };

/**
 * Type of items that can be held by the entries manager.
 */
type EntryItem = AddonModGlossaryEntry | AddonModGlossaryOfflineEntry | NewEntryForm;

/**
 * Entries manager.
 */
class AddonModGlossaryEntriesManager extends CorePageItemsListManager<EntryItem> {

    onlineEntries: AddonModGlossaryEntry[] = [];
    offlineEntries: AddonModGlossaryOfflineEntry[] = [];

    protected glossaryPathPrefix: string;
    protected component: AddonModGlossaryIndexComponent;

    constructor(
        pageComponent: unknown,
        component: AddonModGlossaryIndexComponent,
        glossaryPathPrefix: string,
    ) {
        super(pageComponent);

        this.component = component;
        this.glossaryPathPrefix = glossaryPathPrefix;
    }

    /**
     * Type guard to infer NewEntryForm objects.
     *
     * @param entry Item to check.
     * @return Whether the item is a new entry form.
     */
    isNewEntryForm(entry: EntryItem): entry is NewEntryForm {
        return 'newEntry' in entry;
    }

    /**
     * Type guard to infer entry objects.
     *
     * @param entry Item to check.
     * @return Whether the item is an offline entry.
     */
    isOfflineEntry(entry: EntryItem): entry is AddonModGlossaryOfflineEntry {
        return !this.isNewEntryForm(entry) && !this.isOnlineEntry(entry);
    }

    /**
     * Type guard to infer entry objects.
     *
     * @param entry Item to check.
     * @return Whether the item is an offline entry.
     */
    isOnlineEntry(entry: EntryItem): entry is AddonModGlossaryEntry {
        return 'id' in entry;
    }

    /**
     * Update online entries items.
     *
     * @param onlineEntries Online entries.
     */
    setOnlineEntries(onlineEntries: AddonModGlossaryEntry[], hasMoreItems: boolean = false): void {
        this.setItems((<EntryItem[]> this.offlineEntries).concat(onlineEntries), hasMoreItems);
    }

    /**
     * Update offline entries items.
     *
     * @param offlineEntries Offline entries.
     */
    setOfflineEntries(offlineEntries: AddonModGlossaryOfflineEntry[]): void {
        this.setItems((<EntryItem[]> offlineEntries).concat(this.onlineEntries), this.hasMoreItems);
    }

    /**
     * @inheritdoc
     */
    setItems(entries: EntryItem[], hasMoreItems: boolean = false): void {
        super.setItems(entries, hasMoreItems);

        this.onlineEntries = [];
        this.offlineEntries = [];
        this.items.forEach(entry => {
            if (this.isOfflineEntry(entry)) {
                this.offlineEntries.push(entry);
            } else if (this.isOnlineEntry(entry)) {
                this.onlineEntries.push(entry);
            }
        });
    }

    /**
     * @inheritdoc
     */
    resetItems(): void {
        super.resetItems();
        this.onlineEntries = [];
        this.offlineEntries = [];
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(entry: EntryItem): string {
        if (this.isOnlineEntry(entry)) {
            return `${this.glossaryPathPrefix}entry/${entry.id}`;
        }

        if (this.isOfflineEntry(entry)) {
            return `${this.glossaryPathPrefix}edit/${entry.timecreated}`;
        }

        return `${this.glossaryPathPrefix}edit/0`;
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(entry: EntryItem): Params {
        const params: Params = {
            cmId: this.component.module.id,
            courseId: this.component.courseId,
        };

        if (this.isOfflineEntry(entry)) {
            params.concept = entry.concept;
        }

        return params;
    }

    /**
     * @inheritdoc
     */
    protected getDefaultItem(): EntryItem | null {
        return this.onlineEntries[0] || null;
    }

}

export type AddonModGlossaryFetchMode = 'author_all' | 'cat_all' | 'newest_first' | 'recently_updated' | 'letter_all';
