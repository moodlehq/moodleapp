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

import { ChangeDetectorRef, Component, ViewChild, OnDestroy } from '@angular/core';
import { Content, IonicPage, NavParams, NavController } from 'ionic-angular';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitesProvider } from '@providers/sites';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreEventsProvider } from '@providers/events';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreRatingInfo } from '@core/rating/providers/rating';
import { AddonModDataProvider } from '../../providers/data';
import { AddonModDataHelperProvider } from '../../providers/helper';
import { AddonModDataOfflineProvider } from '../../providers/offline';
import { AddonModDataSyncProvider } from '../../providers/sync';
import { AddonModDataFieldsDelegate } from '../../providers/fields-delegate';
import { AddonModDataComponentsModule } from '../../components/components.module';

/**
 * Page that displays the view entry page.
 */
@IonicPage({ segment: 'addon-mod-data-entry' })
@Component({
    selector: 'page-addon-mod-data-entry',
    templateUrl: 'entry.html',
})
export class AddonModDataEntryPage implements OnDestroy {
    @ViewChild(Content) content: Content;

    protected module: any;
    protected entryId: number;
    protected courseId: number;
    protected offset: number;
    protected syncObserver: any; // It will observe the sync auto event.
    protected entryChangedObserver: any; // It will observe the changed entry event.
    protected fields = {};

    title = '';
    moduleName = 'data';
    component = AddonModDataProvider.COMPONENT;
    entryLoaded = false;
    renderingEntry = false;
    loadingComments = false;
    loadingRating = false;
    selectedGroup = 0;
    entry: any;
    offlineActions = [];
    hasOffline = false;
    previousOffset: number;
    nextOffset: number;
    access: any;
    data: any;
    groupInfo: any;
    showComments: any;
    entryHtml = '';
    siteId: string;
    extraImports = [AddonModDataComponentsModule];
    jsData;
    ratingInfo: CoreRatingInfo;
    isPullingToRefresh = false; // Whether the last fetching of data was started by a pull-to-refresh action

    constructor(params: NavParams, protected utils: CoreUtilsProvider, protected groupsProvider: CoreGroupsProvider,
            protected domUtils: CoreDomUtilsProvider, protected fieldsDelegate: AddonModDataFieldsDelegate,
            protected courseProvider: CoreCourseProvider, protected dataProvider: AddonModDataProvider,
            protected dataOffline: AddonModDataOfflineProvider, protected dataHelper: AddonModDataHelperProvider,
            sitesProvider: CoreSitesProvider, protected navCtrl: NavController, protected eventsProvider: CoreEventsProvider,
            private cdr: ChangeDetectorRef) {
        this.module = params.get('module') || {};
        this.entryId = params.get('entryId') || null;
        this.courseId = params.get('courseId');
        this.selectedGroup = params.get('group') || 0;
        this.offset = params.get('offset');

        this.siteId = sitesProvider.getCurrentSiteId();

        this.title = this.module.name;
        this.moduleName = this.courseProvider.translateModuleName('data');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchEntryData();

        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = this.eventsProvider.on(AddonModDataSyncProvider.AUTO_SYNCED, (data) => {
            if ((data.entryId == this.entryId || data.offlineEntryId == this.entryId) && this.data.id == data.dataId) {
                if (data.deleted) {
                    // If deleted, go back.
                    this.navCtrl.pop();
                } else {
                    this.entryId = data.entryid;
                    this.entryLoaded = false;
                    this.fetchEntryData(true);
                }
            }
        }, this.siteId);

        // Refresh entry on change.
        this.entryChangedObserver = this.eventsProvider.on(AddonModDataProvider.ENTRY_CHANGED, (data) => {
            if (data.entryId == this.entryId && this.data.id == data.dataId) {
                if (data.deleted) {
                    // If deleted, go back.
                    this.navCtrl.pop();
                } else {
                    this.entryLoaded = false;
                    this.fetchEntryData(true);
                }
            }
        }, this.siteId);
    }

    /**
     * Fetch the entry data.
     *
     * @param  {boolean} [refresh] Whether to refresh the current data or not.
     * @param  {boolean} [isPtr] Whether is a pull to refresh action.
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchEntryData(refresh?: boolean, isPtr?: boolean): Promise<any> {
        let fieldsArray;

        this.isPullingToRefresh = isPtr;

        return this.dataProvider.getDatabase(this.courseId, this.module.id).then((data) => {
            this.title = data.name || this.title;
            this.data = data;

            return this.setEntryIdFromOffset(data.id, this.offset, this.selectedGroup).then(() => {
                return this.dataProvider.getDatabaseAccessInformation(data.id);
            });
        }).then((accessData) => {
            this.access = accessData;

            return this.groupsProvider.getActivityGroupInfo(this.data.coursemodule, accessData.canmanageentries)
                    .then((groupInfo) => {
                this.groupInfo = groupInfo;

                // Check selected group is accessible.
                if (groupInfo && groupInfo.groups && groupInfo.groups.length > 0) {
                    if (!groupInfo.groups.some((group) => this.selectedGroup == group.id)) {
                        this.selectedGroup = groupInfo.groups[0].id;
                    }
                }

                return this.dataOffline.getEntryActions(this.data.id, this.entryId);
            });
        }).then((actions) => {
            this.offlineActions = actions;
            this.hasOffline = !!actions.length;

            return this.dataProvider.getFields(this.data.id).then((fieldsData) => {
                this.fields = this.utils.arrayToObject(fieldsData, 'id');

                return this.dataHelper.getEntry(this.data, this.entryId, this.offlineActions);
            });
        }).then((entry) => {
            this.ratingInfo = entry.ratinginfo;
            entry = entry.entry;

            fieldsArray = this.utils.objectToArray(this.fields);

            return this.dataHelper.applyOfflineActions(entry, this.offlineActions, fieldsArray);
        }).then((entryData) => {
            this.entry = entryData;

            const actions = this.dataHelper.getActions(this.data, this.access, this.entry);

            const templte = this.data.singletemplate || this.dataHelper.getDefaultTemplate('single', fieldsArray);
            this.entryHtml = this.dataHelper.displayShowFields(templte, fieldsArray, this.entry, this.offset, 'show', actions);
            this.showComments = actions.comments;

            const entries = {};
            entries[this.entryId] = this.entry;

            // Pass the input data to the component.
            this.jsData = {
                fields: this.fields,
                entries: entries,
                data: this.data
            };
        }).catch((message) => {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return this.refreshAllData(isPtr);
            }

            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        }).finally(() => {
            this.domUtils.scrollToTop(this.content);
            this.entryLoaded = true;
        });
    }

    /**
     * Go to selected entry without changing state.
     *
     * @param  {number} offset Entry offset.
     * @return {Promise<any>} Resolved when done.
     */
    gotoEntry(offset: number): Promise<any> {
        this.offset = offset;
        this.entryId = null;
        this.entry = null;
        this.entryLoaded = false;

        return this.fetchEntryData();
    }

    /**
     * Refresh all the data.
     *
     * @param  {boolean} [isPtr] Whether is a pull to refresh action.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected refreshAllData(isPtr?: boolean): Promise<any> {
        const promises = [];

        promises.push(this.dataProvider.invalidateDatabaseData(this.courseId));
        if (this.data) {
            promises.push(this.dataProvider.invalidateEntryData(this.data.id, this.entryId));
            promises.push(this.groupsProvider.invalidateActivityGroupInfo(this.data.coursemodule));
            promises.push(this.dataProvider.invalidateEntriesData(this.data.id));
        }

        return Promise.all(promises).finally(() => {
            return this.fetchEntryData(true, isPtr);
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshDatabase(refresher?: any): Promise<any> {
        if (this.entryLoaded) {
            return this.refreshAllData(true).finally(() => {
                refresher && refresher.complete();
            });
        }
    }

    /**
     * Set group to see the database.
     *
     * @param  {number}       groupId Group identifier to set.
     * @return {Promise<any>}         Resolved when done.
     */
    setGroup(groupId: number): Promise<any> {
        this.selectedGroup = groupId;
        this.offset = 0;
        this.entry = null;
        this.entryId = null;
        this.entryLoaded = false;

        return this.fetchEntryData();
    }

    /**
     * Convenience function to translate offset to entry identifier and set next/previous entries.
     *
     * @param {number} dataId Data Id.
     * @param {number} [offset] Offset of the entry.
     * @param {number} [groupId] Group Id to get the entry.
     * @return {Promise<any>} Resolved when done.
     */
    protected setEntryIdFromOffset(dataId: number, offset?: number, groupId?: number): Promise<any> {
        if (typeof offset != 'number') {
            // Entry id passed as navigation parameter instead of the offset.
            // We don't display next/previous buttons in this case.
            this.nextOffset = null;
            this.previousOffset = null;

            return Promise.resolve();
        }

        const perPage = AddonModDataProvider.PER_PAGE;
        const page = Math.floor(offset / perPage);
        const pageOffset = offset % perPage;

        return this.dataProvider.getEntries(dataId, groupId, undefined, undefined, page, perPage).then((entries) => {
            if (!entries || !entries.entries || !entries.entries.length || pageOffset >= entries.entries.length) {
                return Promise.reject(null);
            }

            this.entryId = entries.entries[pageOffset].id;
            this.previousOffset = offset > 0 ? offset - 1 : null;
            if (pageOffset + 1 < entries.entries.length) {
                // Not the last entry on the page;
                this.nextOffset = offset + 1;
            } else if (entries.entries.length < perPage) {
                // Last entry of the last page.
                this.nextOffset = null;
            } else {
                // Last entry of the page, check if there are more pages.
                return this.dataProvider.getEntries(dataId, groupId, undefined, undefined, page + 1, perPage).then((entries) => {
                    this.nextOffset = entries && entries.entries && entries.entries.length > 0 ? offset + 1 : null;
                });
            }
        });
    }

    /**
     * Function called when entry is being rendered.
     */
    setRenderingEntry(rendering: boolean): void {
        this.renderingEntry = rendering;
        this.cdr.detectChanges();
    }

    /**
     * Function called when comments component is loading data.
     */
    setLoadingComments(loading: boolean): void {
        this.loadingComments = loading;
        this.cdr.detectChanges();
    }

    /**
     * Function called when rate component is loading data.
     */
    setLoadingRating(loading: boolean): void {
        this.loadingRating = loading;
        this.cdr.detectChanges();
    }

    /**
     * Function called when rating is updated online.
     */
    ratingUpdated(): void {
        this.dataProvider.invalidateEntryData(this.data.id, this.entryId);
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.syncObserver && this.syncObserver.off();
        this.entryChangedObserver && this.entryChangedObserver.off();
    }
}
