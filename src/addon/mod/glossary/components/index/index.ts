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

import { Component, Injector, ViewChild } from '@angular/core';
import { Content, PopoverController } from 'ionic-angular';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { CoreRatingProvider } from '@core/rating/providers/rating';
import { CoreRatingOfflineProvider } from '@core/rating/providers/offline';
import { CoreRatingSyncProvider } from '@core/rating/providers/sync';
import { AddonModGlossaryProvider } from '../../providers/glossary';
import { AddonModGlossaryOfflineProvider } from '../../providers/offline';
import { AddonModGlossarySyncProvider } from '../../providers/sync';
import { AddonModGlossaryModePickerPopoverComponent } from '../mode-picker/mode-picker';
import { AddonModGlossaryPrefetchHandler } from '../../providers/prefetch-handler';

type FetchMode = 'author_all' | 'cat_all' | 'newest_first' | 'recently_updated' | 'search' | 'letter_all';

/**
 * Component that displays a glossary entry page.
 */
@Component({
    selector: 'addon-mod-glossary-index',
    templateUrl: 'addon-mod-glossary-index.html',
})
export class AddonModGlossaryIndexComponent extends CoreCourseModuleMainActivityComponent {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;
    @ViewChild(Content) content: Content;

    component = AddonModGlossaryProvider.COMPONENT;
    moduleName = 'glossary';

    fetchMode: FetchMode;
    viewMode: string;
    isSearch = false;
    entries = [];
    offlineEntries = [];
    canAdd = false;
    canLoadMore = false;
    loadMoreError = false;
    loadingMessage = this.translate.instant('core.loading');
    selectedEntry: number;

    protected syncEventName = AddonModGlossarySyncProvider.AUTO_SYNCED;
    protected glossary: any;
    protected fetchFunction: Function;
    protected fetchInvalidate: Function;
    protected fetchArguments: any[];
    protected showDivider: (entry: any, previous?: any) => boolean;
    protected getDivider: (entry: any) => string;
    protected addEntryObserver: any;

    hasOfflineRatings: boolean;
    protected ratingOfflineObserver: any;
    protected ratingSyncObserver: any;

    constructor(injector: Injector,
            private popoverCtrl: PopoverController,
            private glossaryProvider: AddonModGlossaryProvider,
            private glossaryOffline: AddonModGlossaryOfflineProvider,
            private prefetchHandler: AddonModGlossaryPrefetchHandler,
            private ratingOffline: CoreRatingOfflineProvider) {
        super(injector);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        // When an entry is added, we reload the data.
        this.addEntryObserver = this.eventsProvider.on(AddonModGlossaryProvider.ADD_ENTRY_EVENT, this.eventReceived.bind(this));

        // Listen for offline ratings saved and synced.
        this.ratingOfflineObserver = this.eventsProvider.on(CoreRatingProvider.RATING_SAVED_EVENT, (data) => {
            if (this.glossary && data.component == 'mod_glossary' && data.ratingArea == 'entry' && data.contextLevel == 'module'
                    && data.instanceId == this.glossary.coursemodule) {
                this.hasOfflineRatings = true;
            }
        });
        this.ratingSyncObserver = this.eventsProvider.on(CoreRatingSyncProvider.SYNCED_EVENT, (data) => {
            if (this.glossary && data.component == 'mod_glossary' && data.ratingArea == 'entry' && data.contextLevel == 'module'
                    && data.instanceId == this.glossary.coursemodule) {
                this.hasOfflineRatings = false;
            }
        });

        this.loadContent(false, true).then(() => {
            if (!this.glossary) {
                return;
            }

            if (this.splitviewCtrl.isOn()) {
                // Load the first entry.
                if (this.entries.length > 0) {
                    this.openEntry(this.entries[0].id);
                }
            }

            this.glossaryProvider.logView(this.glossary.id, this.viewMode, this.glossary.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch((error) => {
                // Ignore errors.
            });
        });
    }

    /**
     * Download the component contents.
     *
     * @param refresh Whether we're refreshing data.
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {
        return this.glossaryProvider.getGlossary(this.courseId, this.module.id).then((glossary) => {
            this.glossary = glossary;

            this.description = glossary.intro || this.description;
            this.canAdd = (this.glossaryProvider.isPluginEnabledForEditing() && glossary.canaddentry) || false;

            this.dataRetrieved.emit(this.glossary);

            if (!this.fetchMode) {
                this.switchMode('letter_all');
            }

            if (sync) {
                // Try to synchronize the glossary.
                return this.syncActivity(showErrors);
            }
        }).then(() => {
            const promises = [];

            promises.push(this.fetchEntries().then(() => {
                // Check if there are responses stored in offline.
                return this.glossaryOffline.getGlossaryNewEntries(this.glossary.id).then((offlineEntries) => {
                    offlineEntries.sort((a, b) => a.concept.localeCompare(b.fullname));
                    this.hasOffline = !!offlineEntries.length;
                    this.offlineEntries = offlineEntries || [];
                });
            }));

            promises.push(this.ratingOffline.hasRatings('mod_glossary', 'entry', 'module', this.glossary.coursemodule)
                    .then((hasRatings) => {
                this.hasOfflineRatings = hasRatings;
            }));

            return Promise.all(promises);
        }).finally(() => {
            this.fillContextMenu(refresh);
        });
    }

    /**
     * Convenience function to fetch entries.
     *
     * @param append True if fetched entries are appended to exsiting ones.
     * @return Promise resolved when done.
     */
    protected fetchEntries(append: boolean = false): Promise<any> {
        this.loadMoreError = false;

        if (!this.fetchFunction || !this.fetchArguments) {
            // This happens in search mode with an empty query.
            return Promise.resolve({entries: [], count: 0});
        }

        const limitFrom = append ? this.entries.length : 0;
        const limitNum = AddonModGlossaryProvider.LIMIT_ENTRIES;

        return this.glossaryProvider.fetchEntries(this.fetchFunction, this.fetchArguments, limitFrom, limitNum).then((result) => {
            if (append) {
                Array.prototype.push.apply(this.entries, result.entries);
            } else {
                this.entries = result.entries;
            }
            this.canLoadMore = this.entries.length < result.count;
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        if (this.fetchInvalidate && this.fetchArguments) {
            promises.push(this.fetchInvalidate.apply(this.glossaryProvider, this.fetchArguments));
        }

        promises.push(this.glossaryProvider.invalidateCourseGlossaries(this.courseId));

        if (this.glossary && this.glossary.id) {
            promises.push(this.glossaryProvider.invalidateCategories(this.glossary.id));
        }

        return Promise.all(promises);
    }

    /**
     * Performs the sync of the activity.
     *
     * @return Promise resolved when done.
     */
    protected sync(): Promise<boolean> {
        return this.prefetchHandler.sync(this.module, this.courseId);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param result Data returned on the sync function.
     * @return Whether it succeed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        return result.updated;
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @return True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        return this.glossary && syncEventData.glossaryId == this.glossary.id &&
                syncEventData.userId == this.sitesProvider.getCurrentSiteUserId();
    }

    /**
     * Change fetch mode.
     *
     * @param mode New mode.
     */
    protected switchMode(mode: FetchMode): void {
        this.fetchMode = mode;

        switch (mode) {
            case 'author_all':
                // Browse by author.
                this.viewMode = 'author';
                this.fetchFunction = this.glossaryProvider.getEntriesByAuthor;
                this.fetchInvalidate = this.glossaryProvider.invalidateEntriesByAuthor;
                this.fetchArguments = [this.glossary.id, 'ALL', 'LASTNAME', 'ASC'];
                this.getDivider = (entry: any): string => entry.userfullname;
                this.showDivider = (entry: any, previous?: any): boolean => {
                    return  typeof previous === 'undefined' || entry.userid != previous.userid;
                };
                break;
            case 'cat_all':
                // Browse by category.
                this.viewMode = 'cat';
                this.fetchFunction = this.glossaryProvider.getEntriesByCategory;
                this.fetchInvalidate = this.glossaryProvider.invalidateEntriesByCategory;
                this.fetchArguments = [this.glossary.id, AddonModGlossaryProvider.SHOW_ALL_CATEGORIES];
                this.getDivider = (entry: any): string => entry.categoryname;
                this.showDivider = (entry?: any, previous?: any): boolean  => {
                    return !previous || this.getDivider(entry) != this.getDivider(previous);
                };
                break;
            case 'newest_first':
                // Newest first.
                this.viewMode = 'date';
                this.fetchFunction = this.glossaryProvider.getEntriesByDate;
                this.fetchInvalidate = this.glossaryProvider.invalidateEntriesByDate;
                this.fetchArguments = [this.glossary.id, 'CREATION', 'DESC'];
                this.getDivider = null;
                this.showDivider = (): boolean => false;
                break;
            case 'recently_updated':
                // Recently updated.
                this.viewMode = 'date';
                this.fetchFunction = this.glossaryProvider.getEntriesByDate;
                this.fetchInvalidate = this.glossaryProvider.invalidateEntriesByDate;
                this.fetchArguments = [this.glossary.id, 'UPDATE', 'DESC'];
                this.getDivider = null;
                this.showDivider = (): boolean => false;
                break;
            case 'search':
                // Search for entries.
                this.viewMode = 'search';
                this.fetchFunction = this.glossaryProvider.getEntriesBySearch;
                this.fetchInvalidate = this.glossaryProvider.invalidateEntriesBySearch;
                this.fetchArguments = null; // Dynamically set later.
                this.getDivider = null;
                this.showDivider = (): boolean => false;
                break;
            case 'letter_all':
            default:
                // Consider it is 'letter_all'.
                this.viewMode = 'letter';
                this.fetchMode = 'letter_all';
                this.fetchFunction = this.glossaryProvider.getEntriesByLetter;
                this.fetchInvalidate = this.glossaryProvider.invalidateEntriesByLetter;
                this.fetchArguments = [this.glossary.id, 'ALL'];
                this.getDivider = (entry: any): string => entry.concept.substr(0, 1).toUpperCase();
                this.showDivider = (entry?: any, previous?: any): boolean  => {
                    return !previous || this.getDivider(entry) != this.getDivider(previous);
                };
                break;
        }
    }

    /**
     * Convenience function to load more forum discussions.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @return Promise resolved when done.
     */
    loadMoreEntries(infiniteComplete?: any): Promise<any> {
        return this.fetchEntries(true).catch((error) => {
            this.loadMoreError = true;
            this.domUtils.showErrorModalDefault(error, 'addon.mod_glossary.errorloadingentries', true);
        }).finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Show the mode picker menu.
     *
     * @param event Event.
     */
    openModePicker(event: MouseEvent): void {
        const popover = this.popoverCtrl.create(AddonModGlossaryModePickerPopoverComponent, {
            glossary: this.glossary,
            selectedMode: this.fetchMode
        });

        popover.onDidDismiss((newMode: FetchMode) => {
            if (newMode === this.fetchMode) {
                return;
            }

            this.loadingMessage = this.translate.instant('core.loading');
            this.domUtils.scrollToTop(this.content);
            this.switchMode(newMode);

            if (this.fetchMode === 'search') {
                // If it's not an instant search, then we reset the values.
                this.entries = [];
                this.canLoadMore = false;
            } else {
                this.loaded = false;
                this.loadContent();
            }
        });

        popover.present({
            ev: event
        });
    }

    /**
     * Opens an entry.
     *
     * @param entryId Entry id.
     */
    openEntry(entryId: number): void {
        const params = {
            courseId: this.courseId,
            entryId: entryId
        };
        this.splitviewCtrl.push('AddonModGlossaryEntryPage', params);
        this.selectedEntry = entryId;
    }

    /**
     * Opens new entry editor.
     *
     * @param entry Offline entry to edit.
     */
    openNewEntry(entry?: any): void {
        const params = {
            courseId: this.courseId,
            module: this.module,
            glossary: this.glossary,
            entry: entry,
        };
        this.splitviewCtrl.getMasterNav().push('AddonModGlossaryEditPage', params);
        this.selectedEntry = 0;
    }

    /**
     * Search entries.
     *
     * @param query Text entered on the search box.
     */
    search(query: string): void {
        this.loadingMessage = this.translate.instant('core.searching');
        this.fetchArguments = [this.glossary.id, query, 1, 'CONCEPT', 'ASC'];
        this.loaded = false;
        this.loadContent();
    }

    /**
     * Function called when we receive an event of new entry.
     *
     * @param data Event data.
     */
    protected eventReceived(data: any): void {
        if (this.glossary && this.glossary.id === data.glossaryId) {
            this.showLoadingAndRefresh(false);

            // Check completion since it could be configured to complete once the user adds a new discussion or replies.
            this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.addEntryObserver && this.addEntryObserver.off();
        this.ratingOfflineObserver && this.ratingOfflineObserver.off();
        this.ratingSyncObserver && this.ratingSyncObserver.off();
    }
}
