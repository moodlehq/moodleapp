// (C) Copyright 2015 Martin Dougiamas
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

import { Component, Optional, Injector } from '@angular/core';
import { Content, ModalController, NavController } from 'ionic-angular';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreGroupsProvider, CoreGroupInfo } from '@providers/groups';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { CoreCommentsProvider } from '@core/comments/providers/comments';
import { CoreRatingProvider } from '@core/rating/providers/rating';
import { CoreRatingSyncProvider } from '@core/rating/providers/sync';
import { AddonModDataProvider } from '../../providers/data';
import { AddonModDataHelperProvider } from '../../providers/helper';
import { AddonModDataSyncProvider } from '../../providers/sync';
import { AddonModDataComponentsModule } from '../components.module';
import { AddonModDataPrefetchHandler } from '../../providers/prefetch-handler';

/**
 * Component that displays a data index page.
 */
@Component({
    selector: 'addon-mod-data-index',
    templateUrl: 'addon-mod-data-index.html',
})
export class AddonModDataIndexComponent extends CoreCourseModuleMainActivityComponent {

    component = AddonModDataProvider.COMPONENT;
    moduleName = 'data';

    access: any = {};
    data: any = {};
    fields: any;
    selectedGroup: number;
    timeAvailableFrom: number | boolean;
    timeAvailableFromReadable: string | boolean;
    timeAvailableTo: number | boolean;
    timeAvailableToReadable: string | boolean;
    isEmpty = false;
    groupInfo: CoreGroupInfo;
    entries = [];
    firstEntry = false;
    canAdd = false;
    canSearch = false;
    search = {
        sortBy: '0',
        sortDirection: 'DESC',
        page: 0,
        text: '',
        searching: false,
        searchingAdvanced: false,
        advanced: []
    };
    hasNextPage = false;
    entriesRendered = '';
    extraImports = [AddonModDataComponentsModule];
    jsData;
    foundRecordsData;

    protected syncEventName = AddonModDataSyncProvider.AUTO_SYNCED;
    protected entryChangedObserver: any;
    protected hasComments = false;
    protected fieldsArray: any;

    hasOfflineRatings: boolean;
    protected ratingOfflineObserver: any;
    protected ratingSyncObserver: any;

    constructor(
            injector: Injector,
            @Optional() content: Content,
            private dataProvider: AddonModDataProvider,
            private dataHelper: AddonModDataHelperProvider,
            private prefetchHandler: AddonModDataPrefetchHandler,
            private timeUtils: CoreTimeUtilsProvider,
            private groupsProvider: CoreGroupsProvider,
            private commentsProvider: CoreCommentsProvider,
            private modalCtrl: ModalController,
            private utils: CoreUtilsProvider,
            protected navCtrl: NavController) {

        super(injector, content);

        // Refresh entries on change.
        this.entryChangedObserver = this.eventsProvider.on(AddonModDataProvider.ENTRY_CHANGED, (eventData) => {
            if (this.data.id == eventData.dataId) {
                this.loaded = false;

                return this.loadContent(true);
            }
        }, this.siteId);

        // Listen for offline ratings saved and synced.
        this.ratingOfflineObserver = this.eventsProvider.on(CoreRatingProvider.RATING_SAVED_EVENT, (data) => {
            if (this.data && data.component == 'mod_data' && data.ratingArea == 'entry' && data.contextLevel == 'module'
                    && data.instanceId == this.data.coursemodule) {
                this.hasOfflineRatings = true;
            }
        });
        this.ratingSyncObserver = this.eventsProvider.on(CoreRatingSyncProvider.SYNCED_EVENT, (data) => {
            if (this.data && data.component == 'mod_data' && data.ratingArea == 'entry' && data.contextLevel == 'module'
                    && data.instanceId == this.data.coursemodule) {
                this.hasOfflineRatings = false;
            }
        });
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.selectedGroup = this.group || 0;

        this.loadContent(false, true).then(() => {
            if (!this.data) {
                return;
            }

            this.dataProvider.logView(this.data.id, this.data.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch(() => {
                // Ignore errors.
            });
        });

        // Setup search modal.
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.dataProvider.invalidateDatabaseData(this.courseId));
        if (this.data) {
            promises.push(this.dataProvider.invalidateDatabaseAccessInformationData(this.data.id));
            promises.push(this.groupsProvider.invalidateActivityGroupInfo(this.data.coursemodule));
            promises.push(this.dataProvider.invalidateEntriesData(this.data.id));
            if (this.hasComments) {
                promises.push(this.commentsProvider.invalidateCommentsByInstance('module', this.data.coursemodule));
            }
        }

        return Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param {any} syncEventData Data receiven on sync observer.
     * @return {boolean}          True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        if (this.data && syncEventData.dataId == this.data.id && typeof syncEventData.entryId == 'undefined') {
            this.loaded = false;
            // Refresh the data.
            this.domUtils.scrollToTop(this.content);

            return true;
        }

        return false;
    }

    /**
     * Download data contents.
     *
     * @param  {boolean}      [refresh=false]    If it's refreshing content.
     * @param  {boolean}      [sync=false]       If it should try to sync.
     * @param  {boolean}      [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {
        let canAdd = false,
            canSearch = false;

        return this.dataProvider.getDatabase(this.courseId, this.module.id).then((data) => {
            this.data = data;

            this.description = data.intro || data.description;
            this.dataRetrieved.emit(data);

            if (sync) {
                // Try to synchronize the data.
                return this.syncActivity(showErrors).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            return this.dataProvider.getDatabaseAccessInformation(this.data.id);
        }).then((accessData) => {
            this.access = accessData;

            if (!accessData.timeavailable) {
                const time = this.timeUtils.timestamp();

                this.timeAvailableFrom = this.data.timeavailablefrom && time < this.data.timeavailablefrom ?
                    parseInt(this.data.timeavailablefrom, 10) * 1000 : false;
                this.timeAvailableFromReadable = this.timeAvailableFrom ? this.timeUtils.userDate(this.timeAvailableFrom) : false;
                this.timeAvailableTo = this.data.timeavailableto && time > this.data.timeavailableto ?
                    parseInt(this.data.timeavailableto, 10) * 1000 : false;
                this.timeAvailableToReadable = this.timeAvailableTo ? this.timeUtils.userDate(this.timeAvailableTo) : false;

                this.isEmpty = true;
                this.groupInfo = null;

                return;
            }

            canSearch = true;
            canAdd = accessData.canaddentry;

            return this.groupsProvider.getActivityGroupInfo(this.data.coursemodule).then((groupInfo) => {
                this.groupInfo = groupInfo;
                this.selectedGroup = this.groupsProvider.validateGroupId(this.selectedGroup, groupInfo);
            });
        }).then(() => {
            return this.dataProvider.getFields(this.data.id).then((fields) => {
                if (fields.length == 0) {
                    canSearch = false;
                    canAdd = false;
                }
                this.search.advanced = [];

                this.fields = this.utils.arrayToObject(fields, 'id');
                this.fieldsArray = this.utils.objectToArray(this.fields);

                return this.fetchEntriesData();
            });
        }).then(() => {
            // All data obtained, now fill the context menu.
            this.fillContextMenu(refresh);
        }).finally(() => {
            this.canAdd = canAdd;
            this.canSearch = canSearch;
        });
    }

    /**
     * Fetch current database entries.
     *
     * @return {Promise<any>} Resolved then done.
     */
    protected fetchEntriesData(): Promise<any> {
        this.hasComments = false;

        return this.dataProvider.getDatabaseAccessInformation(this.data.id, this.selectedGroup).then((accessData) => {
            // Update values for current group.
            this.access.canaddentry = accessData.canaddentry;

            const search = this.search.searching && !this.search.searchingAdvanced ? this.search.text : undefined;
            const advSearch = this.search.searching && this.search.searchingAdvanced ? this.search.advanced : undefined;

            return this.dataHelper.fetchEntries(this.data, this.fieldsArray, this.selectedGroup, search, advSearch,
                    this.search.sortBy, this.search.sortDirection, this.search.page);
        }).then((entries) => {
            const numEntries = entries.entries.length;
            const numOfflineEntries = entries.offlineEntries.length;
            this.isEmpty = !numEntries && !entries.offlineEntries.length;
            this.hasNextPage = numEntries >= AddonModDataProvider.PER_PAGE && ((this.search.page + 1) *
                AddonModDataProvider.PER_PAGE) < entries.totalcount;
            this.hasOffline = entries.hasOfflineActions;
            this.hasOfflineRatings = entries.hasOfflineRatings;
            this.entriesRendered = '';

            if (typeof entries.maxcount != 'undefined') {
                this.foundRecordsData = {
                    num: entries.totalcount,
                    max: entries.maxcount,
                    reseturl: '#'
                };
            } else {
                this.foundRecordsData = undefined;
            }

            if (!this.isEmpty) {
                this.entries = entries.offlineEntries.concat(entries.entries);

                let entriesHTML = this.dataHelper.getTemplate(this.data, 'listtemplateheader', this.fieldsArray);

                // Get first entry from the whole list.
                if (!this.search.searching || !this.firstEntry) {
                    this.firstEntry = this.entries[0].id;
                }

                const template = this.dataHelper.getTemplate(this.data, 'listtemplate', this.fieldsArray);

                const entriesById = {};
                this.entries.forEach((entry, index) => {
                    entriesById[entry.id] = entry;

                    const actions = this.dataHelper.getActions(this.data, this.access, entry);
                    const offset = this.search.searching ? undefined :
                            this.search.page * AddonModDataProvider.PER_PAGE + index - numOfflineEntries;

                    entriesHTML += this.dataHelper.displayShowFields(template, this.fieldsArray, entry, offset, 'list',  actions);
                });
                entriesHTML += this.dataHelper.getTemplate(this.data, 'listtemplatefooter', this.fieldsArray);

                this.entriesRendered = entriesHTML;

                // Pass the input data to the component.
                this.jsData = {
                    fields: this.fields,
                    entries: entriesById,
                    data: this.data,
                    module: this.module,
                    group: this.selectedGroup,
                    gotoEntry: this.gotoEntry.bind(this)
                };
            } else if (!this.search.searching) {
                // Empty and no searching.
                this.canSearch = false;
            }
            this.firstEntry = false;
        });
    }

    /**
     * Display the chat users modal.
     */
    showSearch(): void {
        const modal = this.modalCtrl.create('AddonModDataSearchPage', {
            search: this.search,
            fields: this.fields,
            data: this.data});
        modal.onDidDismiss((data) => {
            // Add data to search object.
            if (data) {
                this.search = data;
                this.searchEntries(0);
            }
        });
        modal.present();
    }

    /**
     * Performs the search and closes the modal.
     *
     * @param  {number}       page Page number.
     * @return {Promise<any>}      Resolved when done.
     */
    searchEntries(page: number): Promise<any> {
        this.loaded = false;
        this.search.page = page;

        return this.fetchEntriesData().catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Reset all search filters and closes the modal.
     */
    searchReset(): void {
        this.search.sortBy = '0';
        this.search.sortDirection = 'DESC';
        this.search.text = '';
        this.search.advanced = [];
        this.search.searchingAdvanced = false;
        this.search.searching = false;
        this.searchEntries(0);
    }

    /**
     * Set group to see the database.
     *
     * @param  {number}       groupId Group ID.
     * @return {Promise<any>}         Resolved when new group is selected or rejected if not.
     */
    setGroup(groupId: number): Promise<any> {
        this.selectedGroup = groupId;
        this.search.page = 0;

        return this.fetchEntriesData().catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);

            return Promise.reject(null);
        });
    }

    /**
     * Opens add entries form.
     */
    gotoAddEntries(): void {
        const params = {
            module: this.module,
            courseId: this.courseId,
            group: this.selectedGroup
        };

        this.navCtrl.push('AddonModDataEditPage', params);
    }

    /**
     * Goto the selected entry.
     *
     * @param {number} entryId Entry ID.
     */
    gotoEntry(entryId: number): void {
        const params = {
            module: this.module,
            courseId: this.courseId,
            entryId: entryId,
            group: this.selectedGroup,
            offset: null
        };

        // Try to find page number and offset of the entry.
        const pageXOffset = this.entries.findIndex((entry) => entry.id == entryId);
        if (pageXOffset >= 0) {
            params.offset = this.search.page * AddonModDataProvider.PER_PAGE + pageXOffset;
        }

        this.navCtrl.push('AddonModDataEntryPage', params);
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.prefetchHandler.sync(this.module, this.courseId);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param  {any}     result Data returned on the sync function.
     * @return {boolean}        If suceed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        return result.updated;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
        this.entryChangedObserver && this.entryChangedObserver.off();
        this.ratingOfflineObserver && this.ratingOfflineObserver.off();
        this.ratingSyncObserver && this.ratingSyncObserver.off();
    }
}
