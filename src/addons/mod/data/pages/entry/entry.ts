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

import { Component, OnDestroy, ViewChild, ChangeDetectorRef, OnInit, Type } from '@angular/core';
import { CoreCommentsCommentsComponent } from '@features/comments/components/comments/comments';
import { CoreComments } from '@features/comments/services/comments';
import { CoreCourse } from '@features/course/services/course';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { IonContent } from '@ionic/angular';
import { CoreGroups, CoreGroupInfo } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AddonModDataComponentsCompileModule } from '../../components/components-compile.module';
import {
    AddonModData,
    AddonModDataData,
    AddonModDataGetDataAccessInformationWSResponse,
    AddonModDataField,
    AddonModDataEntry,
} from '../../services/data';
import { AddonModDataHelper } from '../../services/data-helper';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreTime } from '@singletons/time';
import {
    ADDON_MOD_DATA_AUTO_SYNCED,
    ADDON_MOD_DATA_COMPONENT,
    ADDON_MOD_DATA_ENTRIES_PER_PAGE,
    ADDON_MOD_DATA_ENTRY_CHANGED,
    AddonModDataTemplateType,
    AddonModDataTemplateMode,
} from '../../constants';

/**
 * Page that displays the view entry page.
 */
@Component({
    selector: 'page-addon-mod-data-entry',
    templateUrl: 'entry.html',
    styleUrl: '../../data.scss',
})
export class AddonModDataEntryPage implements OnInit, OnDestroy {

    @ViewChild(IonContent) content?: IonContent;
    @ViewChild(CoreCommentsCommentsComponent) comments?: CoreCommentsCommentsComponent;

    protected entryId?: number;
    protected syncObserver: CoreEventObserver; // It will observe the sync auto event.
    protected entryChangedObserver: CoreEventObserver; // It will observe the changed entry event.
    protected fields: Record<number, AddonModDataField> = {};
    protected fieldsArray: AddonModDataField[] = [];
    protected sortBy = 0;
    protected sortDirection = 'DESC';
    protected logView: () => void;

    moduleId = 0;
    courseId!: number;
    offset?: number;
    title = '';
    moduleName = 'data';
    component = ADDON_MOD_DATA_COMPONENT;
    entryLoaded = false;
    renderingEntry = false;
    loadingComments = false;
    loadingRating = false;
    selectedGroup = 0;
    entry?: AddonModDataEntry;
    hasPrevious = false;
    hasNext = false;
    access?: AddonModDataGetDataAccessInformationWSResponse;
    database?: AddonModDataData;
    groupInfo?: CoreGroupInfo;
    showComments = false;
    entryHtml = '';
    siteId: string;
    extraImports: Type<unknown>[] = [AddonModDataComponentsCompileModule];
    jsData?: {
        fields: Record<number, AddonModDataField>;
        entries: Record<number, AddonModDataEntry>;
        database: AddonModDataData;
        title: string;
        group: number;
        access: AddonModDataGetDataAccessInformationWSResponse | undefined;
    };

    ratingInfo?: CoreRatingInfo;
    isPullingToRefresh = false; // Whether the last fetching of data was started by a pull-to-refresh action
    commentsEnabled = false;

    constructor(
        private cdr: ChangeDetectorRef,
    ) {
        this.moduleName = CoreCourse.translateModuleName('data');
        this.siteId = CoreSites.getCurrentSiteId();

        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = CoreEvents.on(ADDON_MOD_DATA_AUTO_SYNCED, (data) => {
            if (data.entryId === undefined) {
                return;
            }

            if ((data.entryId == this.entryId || data.offlineEntryId == this.entryId) && this.database?.id == data.dataId) {
                if (data.deleted) {
                    // If deleted, go back.
                    CoreNavigator.back();
                } else {
                    this.entryId = data.entryId;
                    this.entryLoaded = false;
                    this.fetchEntryData(true);
                }
            }
        }, this.siteId);

        // Refresh entry on change.
        this.entryChangedObserver = CoreEvents.on(ADDON_MOD_DATA_ENTRY_CHANGED, (data) => {
            if (data.entryId == this.entryId && this.database?.id == data.dataId) {
                if (data.deleted) {
                    // If deleted, go back.
                    CoreNavigator.back();
                } else {
                    this.entryLoaded = false;
                    this.fetchEntryData(true);
                }
            }
        }, this.siteId);

        this.logView = CoreTime.once(() => this.performLogView());
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.moduleId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.entryId = CoreNavigator.getRouteNumberParam('entryId') || undefined;
            this.title = CoreNavigator.getRouteParam<string>('title') || '';
            this.selectedGroup = CoreNavigator.getRouteNumberParam('group') || 0;
            this.offset = CoreNavigator.getRouteNumberParam('offset');
            this.sortDirection = CoreNavigator.getRouteParam('sortDirection') ?? this.sortDirection;
            const sortBy = Number(CoreNavigator.getRouteParam('sortBy'));
            this.sortBy = isNaN(sortBy) ? this.sortBy : sortBy;
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        this.commentsEnabled = CoreComments.areCommentsEnabledInSite();

        await this.fetchEntryData();
    }

    /**
     * Fetch the entry data.
     *
     * @param refresh Whether to refresh the current data or not.
     * @param isPtr Whether is a pull to refresh action.
     * @returns Resolved when done.
     */
    protected async fetchEntryData(refresh = false, isPtr = false): Promise<void> {
        this.isPullingToRefresh = isPtr;

        try {
            this.database = await AddonModData.getDatabase(this.courseId, this.moduleId);
            this.title = this.database.name || this.title;

            this.fieldsArray = await AddonModData.getFields(this.database.id, { cmId: this.moduleId });
            this.fields = CoreUtils.arrayToObject(this.fieldsArray, 'id');

            await this.setEntryFromOffset();

            this.access = await AddonModData.getDatabaseAccessInformation(this.database.id, { cmId: this.moduleId });

            this.groupInfo = await CoreGroups.getActivityGroupInfo(this.database.coursemodule);
            if (this.groupInfo.visibleGroups && this.groupInfo.groups.length) {
                // There is a bug in Moodle with All participants and visible groups (MOBILE-3597). Remove it.
                this.groupInfo.groups = this.groupInfo.groups.filter(group => group.id !== 0);
                this.groupInfo.defaultGroupId = this.groupInfo.groups[0].id;
            }

            this.selectedGroup = CoreGroups.validateGroupId(this.selectedGroup, this.groupInfo);

            const actions = AddonModDataHelper.getActions(this.database, this.access, this.entry!, AddonModDataTemplateMode.SHOW);

            const template = AddonModDataHelper.getTemplate(this.database, AddonModDataTemplateType.SINGLE, this.fieldsArray);
            this.entryHtml = AddonModDataHelper.displayShowFields(
                template,
                this.fieldsArray,
                this.entry!,
                AddonModDataTemplateMode.SHOW,
                actions,
                {
                    offset: this.offset,
                    sortBy: this.sortBy,
                    sortDirection: this.sortDirection,
                },
            );

            this.showComments = actions.comments;

            const entries: Record<number, AddonModDataEntry> = {};
            entries[this.entryId!] = this.entry!;

            // Pass the input data to the component.
            this.jsData = {
                fields: this.fields,
                entries: entries,
                database: this.database,
                title: this.title,
                group: this.selectedGroup,
                access: this.access,
            };

            this.logView();
        } catch (error) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return this.refreshAllData(isPtr);
            }

            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        } finally {
            this.content?.scrollToTop();
            this.entryLoaded = true;
        }
    }

    /**
     * Go to selected entry without changing state.
     *
     * @param offset Entry offset.
     * @returns Resolved when done.
     */
    async gotoEntry(offset: number): Promise<void> {
        this.offset = offset;
        this.entryId = undefined;
        this.entry = undefined;
        this.entryLoaded = false;
        this.logView = CoreTime.once(() => this.performLogView()); // Log again after loading data.

        await this.fetchEntryData();
    }

    /**
     * Refresh all the data.
     *
     * @param isPtr Whether is a pull to refresh action.
     * @returns Promise resolved when done.
     */
    protected async refreshAllData(isPtr?: boolean): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModData.invalidateDatabaseData(this.courseId));
        if (this.database) {
            promises.push(AddonModData.invalidateEntryData(this.database.id, this.entryId!));
            promises.push(CoreGroups.invalidateActivityGroupInfo(this.database.coursemodule));
            promises.push(AddonModData.invalidateEntriesData(this.database.id));
            promises.push(AddonModData.invalidateFieldsData(this.database.id));

            if (this.database.comments && this.entry && this.entry.id > 0 && this.commentsEnabled && this.comments) {
                // Refresh comments. Don't add it to promises because we don't want the comments fetch to block the entry fetch.
                this.comments.doRefresh().catch(() => {
                    // Ignore errors.
                });
            }
        }

        await Promise.all(promises).finally(() =>
            this.fetchEntryData(true, isPtr));
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshDatabase(refresher?: HTMLIonRefresherElement): void {
        if (!this.entryLoaded) {
            return;
        }

        this.refreshAllData(true).finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Set group to see the database.
     *
     * @param groupId Group identifier to set.
     * @returns Resolved when done.
     */
    async setGroup(groupId: number): Promise<void> {
        this.selectedGroup = groupId;
        this.offset = undefined;
        this.entry = undefined;
        this.entryId = undefined;
        this.entryLoaded = false;

        await this.fetchEntryData();
    }

    /**
     * Convenience function to fetch the entry and set next/previous entries.
     *
     * @returns Resolved when done.
     */
    protected async setEntryFromOffset(): Promise<void> {
        if (this.offset === undefined && this.entryId !== undefined) {
            // Entry id passed as navigation parameter instead of the offset.
            // We don't display next/previous buttons in this case.
            this.hasNext = false;
            this.hasPrevious = false;

            const entry = await AddonModDataHelper.fetchEntry(this.database!, this.fieldsArray, this.entryId);
            this.entry = entry.entry;
            this.ratingInfo = entry.ratinginfo;

            return;
        }

        const perPage = ADDON_MOD_DATA_ENTRIES_PER_PAGE;
        const page = this.offset !== undefined && this.offset >= 0
            ? Math.floor(this.offset / perPage)
            : 0;

        const entries = await AddonModDataHelper.fetchEntries(this.database!, this.fieldsArray, {
            groupId: this.selectedGroup,
            sort: this.sortBy,
            order: this.sortDirection,
            page,
            perPage,
        });

        const pageEntries = (entries.offlineEntries || []).concat(entries.entries);

        // Index of the entry when concatenating offline and online page entries.
        let pageIndex = 0;
        if (this.offset === undefined) {
            // No offset passed, display the first entry.
            pageIndex = 0;
            this.offset = 0;
        } else if (this.offset > 0) {
            // Online entry.
            pageIndex = this.offset % perPage + (entries.offlineEntries?.length || 0);
        } else {
            // Offline entry.
            pageIndex = this.offset + (entries.offlineEntries?.length || 0);
        }

        this.entry = pageEntries[pageIndex];
        this.entryId = this.entry.id;

        this.hasPrevious = page > 0 || pageIndex > 0;

        if (pageIndex + 1 < pageEntries.length) {
            // Not the last entry on the page;
            this.hasNext = true;
        } else if (pageEntries.length < perPage) {
            // Last entry of the last page.
            this.hasNext = false;
        } else {
            // Last entry of the page, check if there are more pages.
            const entries = await AddonModData.getEntries(this.database!.id, {
                groupId: this.selectedGroup,
                page: page + 1,
                perPage: perPage,
            });
            this.hasNext = entries?.entries?.length > 0;
        }

        if (this.entryId > 0) {
            // Online entry, we need to fetch the the rating info.
            const entry = await AddonModData.getEntry(this.database!.id, this.entryId, { cmId: this.moduleId });
            this.ratingInfo = entry.ratinginfo;
        }
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
        AddonModData.invalidateEntryData(this.database!.id, this.entryId!);
    }

    /**
     * Log view.
     */
    protected async performLogView(): Promise<void> {
        if (!this.database) {
            return;
        }

        await CoreUtils.ignoreErrors(AddonModData.logView(this.database.id));

        // Store module viewed because this page also updates recent accessed items block.
        CoreCourse.storeModuleViewed(this.courseId, this.moduleId);

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'mod_data_view_database',
            name: this.database.name,
            data: { id: this.entryId, databaseid: this.database.id, category: 'data' },
            url: `/mod/data/view.php?d=${this.database.id}&rid=${this.entryId}`,
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.syncObserver?.off();
        this.entryChangedObserver?.off();
    }

}
