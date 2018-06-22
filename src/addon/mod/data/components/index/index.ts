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
import { AddonModDataProvider } from '../../providers/data';
import { AddonModDataHelperProvider } from '../../providers/helper';
import { AddonModDataOfflineProvider } from '../../providers/offline';
import { AddonModDataSyncProvider } from '../../providers/sync';
import { AddonModDataComponentsModule } from '../components.module';
import * as moment from 'moment';

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
    entries = {};
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
    offlineActions: any;
    offlineEntries: any;
    entriesRendered = '';
    cssTemplate = '';
    extraImports = [AddonModDataComponentsModule];
    jsData;

    protected syncEventName = AddonModDataSyncProvider.AUTO_SYNCED;
    protected entryChangedObserver: any;
    protected hasComments = false;
    protected fieldsArray: any;

    constructor(injector: Injector, private dataProvider: AddonModDataProvider, private dataHelper: AddonModDataHelperProvider,
            private dataOffline: AddonModDataOfflineProvider, @Optional() content: Content,
            private dataSync: AddonModDataSyncProvider, private timeUtils: CoreTimeUtilsProvider,
            private groupsProvider: CoreGroupsProvider, private commentsProvider: CoreCommentsProvider,
            private modalCtrl: ModalController, private utils: CoreUtilsProvider, protected navCtrl: NavController) {
        super(injector, content);

        // Refresh entries on change.
        this.entryChangedObserver = this.eventsProvider.on(AddonModDataProvider.ENTRY_CHANGED, (eventData) => {
            if (this.data.id == eventData.dataId) {
                this.loaded = false;

                return this.loadContent(true);
            }
        }, this.siteId);
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

            this.dataProvider.logView(this.data.id).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completionstatus);
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
            this.content.scrollToTop();

            return true;
        }

        return false;
    }

    /**
     * Download data contents.
     *
     * @param  {boolean}      [refresh=false]    If it's refreshing content.
     * @param  {boolean}      [sync=false]       If the refresh is needs syncing.
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
                this.timeAvailableFromReadable = this.timeAvailableFrom ?
                    moment(this.timeAvailableFrom).format('LLL') : false;
                this.timeAvailableTo = this.data.timeavailableto && time > this.data.timeavailableto ?
                    parseInt(this.data.timeavailableto, 10) * 1000 : false;
                this.timeAvailableToReadable = this.timeAvailableTo ? moment(this.timeAvailableTo).format('LLL') : false;

                this.isEmpty = true;
                this.groupInfo = null;

                return;
            }

            canSearch = true;
            canAdd = accessData.canaddentry;

            return this.groupsProvider.getActivityGroupInfo(this.data.coursemodule, accessData.canmanageentries)
                    .then((groupInfo) => {
                this.groupInfo = groupInfo;

                // Check selected group is accessible.
                if (groupInfo && groupInfo.groups && groupInfo.groups.length > 0) {
                    if (!groupInfo.groups.some((group) => this.selectedGroup == group.id)) {
                        this.selectedGroup = groupInfo.groups[0].id;
                    }
                }

                return this.fetchOfflineEntries();
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

            if (this.search.searching) {
                const text = this.search.searchingAdvanced ? undefined : this.search.text,
                    advanced = this.search.searchingAdvanced ? this.search.advanced : undefined;

                return this.dataProvider.searchEntries(this.data.id, this.selectedGroup, text, advanced, this.search.sortBy,
                    this.search.sortDirection, this.search.page);
            } else {
                return this.dataProvider.getEntries(this.data.id, this.selectedGroup, this.search.sortBy, this.search.sortDirection,
                    this.search.page);
            }
        }).then((entries) => {
            const numEntries = (entries && entries.entries && entries.entries.length) || 0;
            this.isEmpty = !numEntries && !Object.keys(this.offlineActions).length && !Object.keys(this.offlineEntries).length;
            this.hasNextPage = numEntries >= AddonModDataProvider.PER_PAGE && ((this.search.page + 1) *
                AddonModDataProvider.PER_PAGE) < entries.totalcount;
            this.entriesRendered = '';

            if (!this.isEmpty) {
                this.cssTemplate = this.dataHelper.prefixCSS(this.data.csstemplate, '.addon-data-entries-' + this.data.id);

                const siteInfo = this.sitesProvider.getCurrentSite().getInfo(),
                    promises = [];

                this.utils.objectToArray(this.offlineEntries).forEach((offlineActions) => {
                    const offlineEntry = offlineActions.find((offlineEntry) => offlineEntry.action == 'add');

                    if (offlineEntry) {
                        const entry = {
                            id: offlineEntry.entryid,
                            canmanageentry: true,
                            approved: !this.data.approval || this.data.manageapproved,
                            dataid: offlineEntry.dataid,
                            groupid: offlineEntry.groupid,
                            timecreated: -offlineEntry.entryid,
                            timemodified: -offlineEntry.entryid,
                            userid: siteInfo.userid,
                            fullname: siteInfo.fullname,
                            contents: {}
                        };

                        if (offlineActions.length > 0) {
                            promises.push(this.dataHelper.applyOfflineActions(entry, offlineActions, this.fieldsArray));
                        } else {
                            promises.push(Promise.resolve(entry));
                        }
                    }
                });

                entries.entries.forEach((entry) => {
                    // Index contents by fieldid.
                    entry.contents = this.utils.arrayToObject(entry.contents, 'fieldid');

                    if (typeof this.offlineActions[entry.id] != 'undefined') {
                        promises.push(this.dataHelper.applyOfflineActions(entry, this.offlineActions[entry.id], this.fieldsArray));
                    } else {
                        promises.push(Promise.resolve(entry));
                    }
                });

                return Promise.all(promises).then((entries) => {
                    let entriesHTML = this.data.listtemplateheader || '';

                    // Get first entry from the whole list.
                    if (entries && entries[0] && (!this.search.searching || !this.firstEntry)) {
                        this.firstEntry = entries[0].id;
                    }

                    entries.forEach((entry) => {
                        this.entries[entry.id] = entry;

                        const actions = this.dataHelper.getActions(this.data, this.access, entry);

                        entriesHTML += this.dataHelper.displayShowFields(this.data.listtemplate, this.fieldsArray, entry, 'list',
                            actions);
                    });
                    entriesHTML += this.data.listtemplatefooter || '';

                    this.entriesRendered = entriesHTML;

                    // Pass the input data to the component.
                    this.jsData = {
                        fields: this.fields,
                        entries: this.entries,
                        data: this.data,
                        gotoEntry: this.gotoEntry.bind(this)
                    };
                });
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
            group: this.selectedGroup
        };

        this.navCtrl.push('AddonModDataEntryPage', params);
    }

    /**
     * Fetch offline entries.
     *
     * @return {Promise<any>} Resolved then done.
     */
    protected fetchOfflineEntries(): Promise<any> {
        // Check if there are entries stored in offline.
        return this.dataOffline.getDatabaseEntries(this.data.id).then((offlineEntries) => {
            this.hasOffline = !!offlineEntries.length;

            this.offlineActions = {};
            this.offlineEntries = {};

            // Only show offline entries on first page.
            if (this.search.page == 0 && this.hasOffline) {
                offlineEntries.forEach((entry) => {
                    if (entry.entryid > 0) {
                        if (typeof this.offlineActions[entry.entryid] == 'undefined') {
                            this.offlineActions[entry.entryid] = [];
                        }
                        this.offlineActions[entry.entryid].push(entry);
                    } else {
                        if (typeof this.offlineActions[entry.entryid] == 'undefined') {
                            this.offlineEntries[entry.entryid] = [];
                        }
                        this.offlineEntries[entry.entryid].push(entry);
                    }
                });
            }
        });
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.dataSync.syncDatabase(this.data.id);
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
    }
}
