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

import { Component, ViewChild, OnDestroy } from '@angular/core';
import { Content, IonicPage, NavParams, NavController } from 'ionic-angular';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitesProvider } from '@providers/sites';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreEventsProvider } from '@providers/events';
import { CoreCourseProvider } from '@core/course/providers/course';
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
    protected page: number;
    protected syncObserver: any; // It will observe the sync auto event.
    protected entryChangedObserver: any; // It will observe the changed entry event.
    protected fields = {};

    title = '';
    moduleName = 'data';
    component = AddonModDataProvider.COMPONENT;
    entryLoaded = false;
    selectedGroup = 0;
    entry: any;
    offlineActions = [];
    hasOffline = false;
    cssTemplate = '';
    previousId: number;
    nextId: number;
    access: any;
    data: any;
    groupInfo: any;
    showComments: any;
    entryRendered = '';
    siteId: string;
    cssClass = '';
    extraImports = [AddonModDataComponentsModule];
    jsData;

    constructor(params: NavParams, protected utils: CoreUtilsProvider, protected groupsProvider: CoreGroupsProvider,
            protected domUtils: CoreDomUtilsProvider, protected fieldsDelegate: AddonModDataFieldsDelegate,
            protected courseProvider: CoreCourseProvider, protected dataProvider: AddonModDataProvider,
            protected dataOffline: AddonModDataOfflineProvider, protected dataHelper: AddonModDataHelperProvider,
            sitesProvider: CoreSitesProvider, protected navCtrl: NavController,
            protected eventsProvider: CoreEventsProvider) {
        this.module = params.get('module') || {};
        this.entryId = params.get('entryId') || null;
        this.courseId = params.get('courseId');
        this.selectedGroup = params.get('group') || 0;
        this.page = params.get('page') || null;

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
     * @param  {boolean}      refresh If refresh the current data or not.
     * @return {Promise<any>}         Resolved when done.
     */
    protected fetchEntryData(refresh?: boolean): Promise<any> {
        let fieldsArray;

        return this.dataProvider.getDatabase(this.courseId, this.module.id).then((data) => {
            this.title = data.name || this.title;
            this.data = data;
            this.cssClass = 'addon-data-entries-' + data.id;

            return this.setEntryIdFromPage(data.id, this.page, this.selectedGroup).then(() => {
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
            entry = entry.entry;
            this.cssTemplate = this.dataHelper.prefixCSS(this.data.csstemplate, '.' + this.cssClass);

            // Index contents by fieldid.
            entry.contents = this.utils.arrayToObject(entry.contents, 'fieldid');

            fieldsArray = this.utils.objectToArray(this.fields);

            return this.dataHelper.applyOfflineActions(entry, this.offlineActions, fieldsArray);
        }).then((entryData) => {
            this.entry = entryData;

            const actions = this.dataHelper.getActions(this.data, this.access, this.entry);

            this.entryRendered = this.dataHelper.displayShowFields(this.data.singletemplate, fieldsArray,
                    this.entry, 'show', actions);
            this.showComments = actions.comments;

            const entries = {};
            entries[this.entryId] = this.entry;

            // Pass the input data to the component.
            this.jsData = {
                fields: this.fields,
                entries: entries,
                data: this.data
            };

            return this.dataHelper.getPageInfoByEntry(this.data.id, this.entryId, this.selectedGroup).then((result) => {
                this.previousId = result.previousId;
                this.nextId = result.nextId;
            });
        }).catch((message) => {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return this.refreshAllData();
            }

            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        }).finally(() => {
            this.content && this.content.scrollToTop();
            this.entryLoaded = true;
        });
    }

    /**
     * Go to selected entry without changing state.
     *
     * @param  {number}       entry Entry Id where to go.
     * @return {Promise<any>}       Resolved when done.
     */
    gotoEntry(entry: number): Promise<any> {
        this.entryId = entry;
        this.page = null;
        this.entryLoaded = false;

        return this.fetchEntryData();
    }

    /**
     * Refresh all the data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected refreshAllData(): Promise<any> {
        const promises = [];

        promises.push(this.dataProvider.invalidateDatabaseData(this.courseId));
        if (this.data) {
            promises.push(this.dataProvider.invalidateEntryData(this.data.id, this.entryId));
            promises.push(this.groupsProvider.invalidateActivityGroupInfo(this.data.coursemodule));
            promises.push(this.dataProvider.invalidateEntriesData(this.data.id));
        }

        return Promise.all(promises).finally(() => {
            return this.fetchEntryData(true);
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
            return this.refreshAllData().finally(() => {
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
        this.entryLoaded = false;

        return this.setEntryIdFromPage(this.data.id, 0, this.selectedGroup).then(() => {
            return this.fetchEntryData();
        });
    }

    /**
     * Convenience function to translate page number to entry identifier.
     *
     * @param  {number}       dataId       Data Id.
     * @param  {number}       [pageNumber] Page number where to go
     * @param  {number}       group        Group Id to get the entry.
     * @return {Promise<any>}              Resolved when done.
     */
    protected setEntryIdFromPage(dataId: number, pageNumber?: number, group?: number): Promise<any> {
        if (typeof pageNumber == 'number') {
            return this.dataHelper.getPageInfoByPage(dataId, pageNumber, group).then((result) => {
                this.entryId = result.entryId;
                this.page = null;
            });
        }

        return Promise.resolve();
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.syncObserver && this.syncObserver.off();
        this.entryChangedObserver && this.entryChangedObserver.off();
    }
}
