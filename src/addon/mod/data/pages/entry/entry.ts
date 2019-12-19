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
import { AddonModDataSyncProvider } from '../../providers/sync';
import { AddonModDataFieldsDelegate } from '../../providers/fields-delegate';
import { AddonModDataComponentsModule } from '../../components/components.module';
import { CoreCommentsProvider } from '@core/comments/providers/comments';
import { CoreCommentsCommentsComponent } from '@core/comments/components/comments/comments';

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
    @ViewChild(CoreCommentsCommentsComponent) comments: CoreCommentsCommentsComponent;

    protected module: any;
    protected entryId: number;
    protected courseId: number;
    protected offset: number;
    protected syncObserver: any; // It will observe the sync auto event.
    protected entryChangedObserver: any; // It will observe the changed entry event.
    protected fields = {};
    protected fieldsArray = [];

    title = '';
    moduleName = 'data';
    component = AddonModDataProvider.COMPONENT;
    entryLoaded = false;
    renderingEntry = false;
    loadingComments = false;
    loadingRating = false;
    selectedGroup = 0;
    entry: any;
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
    commentsEnabled: boolean;

    constructor(params: NavParams, protected utils: CoreUtilsProvider, protected groupsProvider: CoreGroupsProvider,
            protected domUtils: CoreDomUtilsProvider, protected fieldsDelegate: AddonModDataFieldsDelegate,
            protected courseProvider: CoreCourseProvider, protected dataProvider: AddonModDataProvider,
            protected dataHelper: AddonModDataHelperProvider,
            sitesProvider: CoreSitesProvider, protected navCtrl: NavController, protected eventsProvider: CoreEventsProvider,
            private cdr: ChangeDetectorRef, protected commentsProvider: CoreCommentsProvider) {
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
        this.commentsEnabled = !this.commentsProvider.areCommentsDisabledInSite();
        this.fetchEntryData().then(() => {
            this.logView();
        });

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
     * @param refresh Whether to refresh the current data or not.
     * @param isPtr Whether is a pull to refresh action.
     * @return Resolved when done.
     */
    protected fetchEntryData(refresh?: boolean, isPtr?: boolean): Promise<any> {
        this.isPullingToRefresh = isPtr;

        return this.dataProvider.getDatabase(this.courseId, this.module.id).then((data) => {
            this.title = data.name || this.title;
            this.data = data;

            return this.dataProvider.getFields(this.data.id).then((fieldsData) => {
                this.fields = this.utils.arrayToObject(fieldsData, 'id');
                this.fieldsArray = fieldsData;
            });
        }).then(() => {
            return this.setEntryFromOffset().then(() => {
                return this.dataProvider.getDatabaseAccessInformation(this.data.id);
            });
        }).then((accessData) => {
            this.access = accessData;

            return this.groupsProvider.getActivityGroupInfo(this.data.coursemodule).then((groupInfo) => {
                this.groupInfo = groupInfo;
                this.selectedGroup = this.groupsProvider.validateGroupId(this.selectedGroup, groupInfo);
            });
        }).then(() => {
            const actions = this.dataHelper.getActions(this.data, this.access, this.entry);

            const template = this.dataHelper.getTemplate(this.data, 'singletemplate', this.fieldsArray);
            this.entryHtml = this.dataHelper.displayShowFields(template, this.fieldsArray, this.entry, this.offset, 'show',
                    actions);
            this.showComments = actions.comments;

            const entries = {};
            entries[this.entryId] = this.entry;

            // Pass the input data to the component.
            this.jsData = {
                fields: this.fields,
                entries: entries,
                data: this.data,
                module: this.module,
                group: this.selectedGroup
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
     * @param offset Entry offset.
     * @return Resolved when done.
     */
    gotoEntry(offset: number): Promise<any> {
        this.offset = offset;
        this.entryId = null;
        this.entry = null;
        this.entryLoaded = false;

        return this.fetchEntryData().then(() => {
            this.logView();
        });
    }

    /**
     * Refresh all the data.
     *
     * @param isPtr Whether is a pull to refresh action.
     * @return Promise resolved when done.
     */
    protected refreshAllData(isPtr?: boolean): Promise<any> {
        const promises = [];

        promises.push(this.dataProvider.invalidateDatabaseData(this.courseId));
        if (this.data) {
            promises.push(this.dataProvider.invalidateEntryData(this.data.id, this.entryId));
            promises.push(this.groupsProvider.invalidateActivityGroupInfo(this.data.coursemodule));
            promises.push(this.dataProvider.invalidateEntriesData(this.data.id));
            promises.push(this.dataProvider.invalidateFieldsData(this.data.id));

            if (this.data.comments && this.entry && this.entry.id > 0 && this.commentsEnabled && this.comments) {
                // Refresh comments. Don't add it to promises because we don't want the comments fetch to block the entry fetch.
                this.comments.doRefresh().catch(() => {
                    // Ignore errors.
                });
            }
        }

        return Promise.all(promises).finally(() => {
            return this.fetchEntryData(true, isPtr);
        });
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @return Promise resolved when done.
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
     * @param groupId Group identifier to set.
     * @return Resolved when done.
     */
    setGroup(groupId: number): Promise<any> {
        this.selectedGroup = groupId;
        this.offset = null;
        this.entry = null;
        this.entryId = null;
        this.entryLoaded = false;

        return this.fetchEntryData().then(() => {
            this.logView();
        });
    }

    /**
     * Convenience function to fetch the entry and set next/previous entries.
     *
     * @return Resolved when done.
     */
    protected setEntryFromOffset(): Promise<any> {
        const emptyOffset = typeof this.offset != 'number';

        if (emptyOffset && typeof this.entryId == 'number') {
            // Entry id passed as navigation parameter instead of the offset.
            // We don't display next/previous buttons in this case.
            this.nextOffset = null;
            this.previousOffset = null;

            return this.dataHelper.fetchEntry(this.data, this.fieldsArray, this.entryId).then((entry) => {
                this.entry = entry.entry;
                this.ratingInfo = entry.ratinginfo;
            });
        }

        const perPage = AddonModDataProvider.PER_PAGE;
        const page = !emptyOffset && this.offset >= 0 ? Math.floor(this.offset / perPage) : 0;

        return this.dataHelper.fetchEntries(this.data, this.fieldsArray, this.selectedGroup, undefined, undefined, '0', 'DESC',
                page, perPage).then((entries) => {

            const pageEntries = entries.offlineEntries.concat(entries.entries);
            let pageIndex; // Index of the entry when concatenating offline and online page entries.
            if (emptyOffset) {
                // No offset passed, display the first entry.
                pageIndex = 0;
            } else if (this.offset > 0) {
                // Online entry.
                pageIndex = this.offset % perPage + entries.offlineEntries.length;
            } else {
                // Offline entry.
                pageIndex = this.offset + entries.offlineEntries.length;
            }

            this.entry = pageEntries[pageIndex];
            this.entryId = this.entry.id;

            this.previousOffset = page > 0 || pageIndex > 0 ? this.offset - 1 : null;

            let promise;

            if (pageIndex + 1 < pageEntries.length) {
                // Not the last entry on the page;
                this.nextOffset = this.offset + 1;
            } else if (pageEntries.length < perPage) {
                // Last entry of the last page.
                this.nextOffset = null;
            } else {
                // Last entry of the page, check if there are more pages.
                promise = this.dataProvider.getEntries(this.data.id, this.selectedGroup, '0', 'DESC', page + 1, perPage)
                        .then((entries) => {
                    this.nextOffset = entries && entries.entries && entries.entries.length > 0 ? this.offset + 1 : null;
                });
            }

            return Promise.resolve(promise).then(() => {
                if (this.entryId > 0) {
                    // Online entry, we need to fetch the the rating info.
                    return this.dataProvider.getEntry(this.data.id, this.entryId).then((entry) => {
                        this.ratingInfo = entry.ratinginfo;
                    });
                }
            });
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
     * Log viewing the activity.
     *
     * @return Promise resolved when done.
     */
    protected logView(): Promise<any> {
        if (!this.data || !this.data.id) {
            return Promise.resolve();
        }

        return this.dataProvider.logView(this.data.id, this.data.name).catch(() => {
            // Ignore errors, the user could be offline.
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.syncObserver && this.syncObserver.off();
        this.entryChangedObserver && this.entryChangedObserver.off();
    }
}
