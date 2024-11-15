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
import { Component, OnDestroy, OnInit, Optional, Type } from '@angular/core';
import { Params } from '@angular/router';
import { CoreCommentsProvider } from '@features/comments/services/comments';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreRatingProvider } from '@features/rating/services/rating';
import { CoreRatingSyncProvider } from '@features/rating/services/rating-sync';
import { IonContent } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    AddonModData,
    AddonModDataEntry,
    AddonModDataField,
    AddonModDataGetDataAccessInformationWSResponse,
    AddonModDataData,
    AddonModDataSearchEntriesAdvancedField,
} from '../../services/data';
import { AddonModDataHelper, AddonModDatDisplayFieldsOptions } from '../../services/data-helper';
import { AddonModDataAutoSyncData, AddonModDataSyncResult } from '../../services/data-sync';
import { AddonModDataPrefetchHandler } from '../../services/handlers/prefetch-lazy';
import { AddonModDataComponentsCompileModule } from '../components-compile.module';
import { CoreUrl } from '@singletons/url';
import { CoreTime } from '@singletons/time';
import {
    ADDON_MOD_DATA_AUTO_SYNCED,
    ADDON_MOD_DATA_COMPONENT,
    ADDON_MOD_DATA_ENTRIES_PER_PAGE,
    ADDON_MOD_DATA_ENTRY_CHANGED,
    ADDON_MOD_DATA_PAGE_NAME,
    AddonModDataTemplateType,
    AddonModDataTemplateMode,
} from '../../constants';
import { CoreModals } from '@services/modals';
import { CorePromiseUtils } from '@singletons/promise-utils';

const contentToken = '<!-- CORE-DATABASE-CONTENT-GOES-HERE -->';

/**
 * Component that displays a data index page.
 */
@Component({
    selector: 'addon-mod-data-index',
    templateUrl: 'addon-mod-data-index.html',
    styleUrl: '../../data.scss',
})
export class AddonModDataIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

    component = ADDON_MOD_DATA_COMPONENT;
    pluginName = 'data';

    access?: AddonModDataGetDataAccessInformationWSResponse;
    database?: AddonModDataData;
    fields: Record<number, AddonModDataField> = {};
    selectedGroup = 0;
    timeAvailableFrom?: number;
    timeAvailableFromReadable?: string;
    timeAvailableTo?: number;
    timeAvailableToReadable?: string;
    isEmpty = true;
    groupInfo?: CoreGroupInfo;
    entries: AddonModDataEntry[] = [];
    firstEntry?: number;
    canAdd = false;
    canSearch = false;
    search: AddonModDataSearchDataParams = {
        sortBy: '0',
        sortDirection: 'DESC',
        page: 0,
        text: '',
        searching: false,
        searchingAdvanced: false,
        advanced: [],
    };

    hasNextPage = false;
    entriesRendered = '';
    extraImports: Type<unknown>[] = [AddonModDataComponentsCompileModule];

    jsData?: {
        fields: Record<number, AddonModDataField>;
        entries: Record<number, AddonModDataEntry>;
        database: AddonModDataData;
        title: string;
        group: number;
        access: AddonModDataGetDataAccessInformationWSResponse | undefined;
        gotoEntry: (entryId: number) => void;
    };

    // Data for found records translation.
    foundRecordsTranslationData?: {
        num: number;
        max: number;
        reseturl: string;
    };

    hasOfflineRatings = false;

    protected syncEventName = ADDON_MOD_DATA_AUTO_SYNCED;
    protected hasComments = false;
    protected fieldsArray: AddonModDataField[] = [];
    protected entryChangedObserver?: CoreEventObserver;
    protected ratingOfflineObserver?: CoreEventObserver;
    protected ratingSyncObserver?: CoreEventObserver;
    protected logSearch?: () => void;

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModDataIndexComponent', content, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await super.ngOnInit();

        this.selectedGroup = this.group || 0;

        // Refresh entries on change.
        this.entryChangedObserver = CoreEvents.on(ADDON_MOD_DATA_ENTRY_CHANGED, (eventData) => {
            if (this.database?.id == eventData.dataId) {
                this.showLoading = true;

                return this.loadContent(true);
            }
        }, this.siteId);

        // Listen for offline ratings saved and synced.
        this.ratingOfflineObserver = CoreEvents.on(CoreRatingProvider.RATING_SAVED_EVENT, (data) => {
            if (data.component == 'mod_data' && data.ratingArea == 'entry' && data.contextLevel == ContextLevel.MODULE
                    && data.instanceId == this.database?.coursemodule) {
                this.hasOfflineRatings = true;
            }
        });
        this.ratingSyncObserver = CoreEvents.on(CoreRatingSyncProvider.SYNCED_EVENT, (data) => {
            if (data.component == 'mod_data' && data.ratingArea == 'entry' && data.contextLevel == ContextLevel.MODULE
                    && data.instanceId == this.database?.coursemodule) {
                this.hasOfflineRatings = false;
            }
        });

        await this.loadContent(false, true);
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModData.invalidateDatabaseData(this.courseId));
        if (this.database) {
            promises.push(AddonModData.invalidateDatabaseAccessInformationData(this.database.id));
            promises.push(CoreGroups.invalidateActivityGroupInfo(this.database.coursemodule));
            promises.push(AddonModData.invalidateEntriesData(this.database.id));
            promises.push(AddonModData.invalidateFieldsData(this.database.id));

            if (this.hasComments) {
                CoreEvents.trigger(CoreCommentsProvider.REFRESH_COMMENTS_EVENT, {
                    contextLevel: ContextLevel.MODULE,
                    instanceId: this.database.coursemodule,
                }, CoreSites.getCurrentSiteId());
            }
        }

        await Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @returns True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModDataAutoSyncData): boolean {
        if (this.database && syncEventData.dataId == this.database.id && syncEventData.entryId === undefined) {
            this.showLoading = true;
            // Refresh the data.
            this.content?.scrollToTop();

            return true;
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        let canAdd = false;
        let canSearch = false;

        this.database = await AddonModData.getDatabase(this.courseId, this.module.id);
        this.hasComments = this.database.comments;

        this.description = this.database.intro;
        this.dataRetrieved.emit(this.database);

        if (sync) {
            // Try to synchronize the data.
            await CorePromiseUtils.ignoreErrors(this.syncActivity(showErrors));
        }

        this.groupInfo = await CoreGroups.getActivityGroupInfo(this.database.coursemodule);
        if (this.groupInfo.visibleGroups && this.groupInfo.groups.length) {
            // There is a bug in Moodle with All participants and visible groups (MOBILE-3597). Remove it.
            this.groupInfo.groups = this.groupInfo.groups.filter(group => group.id !== 0);
            this.groupInfo.defaultGroupId = this.groupInfo.groups[0].id;
        }

        this.selectedGroup = CoreGroups.validateGroupId(this.selectedGroup, this.groupInfo);

        this.access = await AddonModData.getDatabaseAccessInformation(this.database.id, {
            cmId: this.module.id,
            groupId: this.selectedGroup,
        });

        if (!this.access.timeavailable) {
            const time = CoreTimeUtils.timestamp();

            this.timeAvailableFrom = this.database.timeavailablefrom && time < this.database.timeavailablefrom
                ? this.database.timeavailablefrom * 1000
                : undefined;
            this.timeAvailableFromReadable = this.timeAvailableFrom
                ? CoreTimeUtils.userDate(this.timeAvailableFrom)
                : undefined;
            this.timeAvailableTo = this.database.timeavailableto && time > this.database.timeavailableto
                ? this.database.timeavailableto * 1000
                : undefined;
            this.timeAvailableToReadable = this.timeAvailableTo
                ? CoreTimeUtils.userDate(this.timeAvailableTo)
                : undefined;

            this.isEmpty = true;
            this.groupInfo = undefined;

            return;
        } else {
            canSearch = true;
            canAdd = this.access.canaddentry;
        }

        const fields = await AddonModData.getFields(this.database.id, { cmId: this.module.id });
        this.search.advanced = [];

        this.fields = CoreUtils.arrayToObject(fields, 'id');
        this.fieldsArray = CoreUtils.objectToArray(this.fields);
        if (this.fieldsArray.length == 0) {
            canSearch = false;
            canAdd = false;
        }

        try {
            await this.fetchEntriesData();
        } finally {
            this.canAdd = canAdd;
            this.canSearch = canSearch;
        }
    }

    /**
     * Fetch current database entries.
     *
     * @returns Resolved then done.
     */
    protected async fetchEntriesData(): Promise<void> {

        const search = this.search.searching && !this.search.searchingAdvanced ? this.search.text : undefined;
        const advSearch = this.search.searching && this.search.searchingAdvanced ? this.search.advanced : undefined;

        const entries = await AddonModDataHelper.fetchEntries(this.database!, this.fieldsArray, {
            groupId: this.selectedGroup,
            search,
            advSearch,
            sort: Number(this.search.sortBy),
            order: this.search.sortDirection,
            page: this.search.page,
            cmId: this.module.id,
        });

        const numEntries = entries.entries.length;
        const numOfflineEntries = entries.offlineEntries?.length || 0;

        this.isEmpty = !numEntries && !numOfflineEntries;

        this.hasNextPage = numEntries >= ADDON_MOD_DATA_ENTRIES_PER_PAGE && ((this.search.page + 1) *
            ADDON_MOD_DATA_ENTRIES_PER_PAGE) < entries.totalcount;

        this.hasOffline = !!entries.hasOfflineActions;

        this.hasOfflineRatings = !!entries.hasOfflineRatings;

        this.entriesRendered = '';

        this.foundRecordsTranslationData = entries.maxcount !== undefined
            ? {
                num: entries.totalcount,
                max: entries.maxcount,
                reseturl: '#',
            }
            : undefined;

        if (!this.isEmpty) {
            this.entries = (entries.offlineEntries || []).concat(entries.entries);

            let headerAndFooter = AddonModDataHelper.getTemplate(
                this.database!,
                AddonModDataTemplateType.LIST_HEADER,
                this.fieldsArray,
            );

            headerAndFooter += contentToken;

            headerAndFooter += AddonModDataHelper.getTemplate(
                this.database!,
                AddonModDataTemplateType.LIST_FOOTER,
                this.fieldsArray,
            );

            headerAndFooter = CoreDomUtils.fixHtml(headerAndFooter);

            // Get first entry from the whole list.
            if (!this.search.searching || !this.firstEntry) {
                this.firstEntry = this.entries[0].id;
            }

            const template = AddonModDataHelper.getTemplate(this.database!, AddonModDataTemplateType.LIST, this.fieldsArray);

            let entriesHTML = '';

            const entriesById: Record<number, AddonModDataEntry> = {};
            this.entries.forEach((entry, index) => {
                entriesById[entry.id] = entry;

                const actions = AddonModDataHelper.getActions(this.database!, this.access!, entry, AddonModDataTemplateMode.LIST);
                const options: AddonModDatDisplayFieldsOptions = {};
                if (!this.search.searching) {
                    options.offset = this.search.page * ADDON_MOD_DATA_ENTRIES_PER_PAGE + index - numOfflineEntries;
                    options.sortBy = this.search.sortBy;
                    options.sortDirection = this.search.sortDirection;
                }

                entriesHTML += AddonModDataHelper.displayShowFields(
                    template,
                    this.fieldsArray,
                    entry,
                    AddonModDataTemplateMode.LIST,
                    actions,
                    options,
                );
            });

            this.entriesRendered = headerAndFooter.replace(contentToken, entriesHTML);

            // Pass the input data to the component.
            this.jsData = {
                fields: this.fields,
                entries: entriesById,
                database: this.database!,
                title: this.module.name,
                group: this.selectedGroup,
                access: this.access,
                gotoEntry: (entryId) => this.gotoEntry(entryId),
            };
        } else if (!this.search.searching) {
            // Empty and no searching.
            this.canSearch = false;
            this.firstEntry = undefined;
        } else {
            this.firstEntry = undefined;
        }
    }

    /**
     * Display the chat users modal.
     */
    async showSearch(): Promise<void> {
        const { AddonModDataSearchModalComponent } = await import('@addons/mod/data/components/search-modal/search-modal');

        const modalData = await CoreModals.openModal<AddonModDataSearchDataParams>({
            component: AddonModDataSearchModalComponent,
            componentProps: {
                search: this.search,
                fields: this.fields,
                database: this.database,
            },
        });

        // Add data to search object.
        if (modalData) {
            this.search = modalData;
            this.logSearch = CoreTime.once(() => this.performLogSearch());
            this.searchEntries(0);
        }
    }

    /**
     * Performs the search and closes the modal.
     *
     * @param page Page number.
     * @returns Resolved when done.
     */
    async searchEntries(page: number): Promise<void> {
        this.showLoading = true;
        this.search.page = page;

        try {
            await this.fetchEntriesData();

            this.logSearch?.();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        } finally {
            this.showLoading = false;
        }
    }

    /**
     * Reset all search filters and closes the modal.
     *
     * @param ev Event.
     */
    searchReset(ev: Event): void {
        ev.preventDefault();
        ev.stopPropagation();

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
     * @param groupId Group ID.
     * @returns Resolved when new group is selected or rejected if not.
     */
    async setGroup(groupId: number): Promise<void> {
        this.selectedGroup = groupId;
        this.search.page = 0;

        // Only update canAdd if there's any field, otheerwise, canAdd will remain false.
        if (this.fieldsArray.length > 0) {
            // Update values for current group.
            this.access = await AddonModData.getDatabaseAccessInformation(this.database!.id, {
                groupId: this.selectedGroup,
                cmId: this.module.id,
            });

            this.canAdd = this.access.canaddentry;
        }

        try {
            await this.fetchEntriesData();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        }
    }

    /**
     * Opens add entry form.
     */
    gotoAddEntry(): void {
        const params: Params = {
            title: this.module.name,
            group: this.selectedGroup,
        };

        CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_DATA_PAGE_NAME}/${this.courseId}/${this.module.id}/edit`,
            { params },
        );
    }

    /**
     * Goto the selected entry.
     *
     * @param entryId Entry ID.
     */
    gotoEntry(entryId: number): void {
        const params: Params = {
            title: this.module.name,
            group: this.selectedGroup,
        };

        // Try to find page number and offset of the entry.
        if (!this.search.searching) {
            const pageXOffset = this.entries.findIndex((entry) => entry.id == entryId);
            if (pageXOffset >= 0) {
                params.offset = this.search.page * ADDON_MOD_DATA_ENTRIES_PER_PAGE + pageXOffset;
                params.sortBy = this.search.sortBy;
                params.sortDirection = this.search.sortDirection;
            }
        }

        CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_DATA_PAGE_NAME}/${this.courseId}/${this.module.id}/${entryId}`,
            { params },
        );
    }

    /**
     * @inheritdoc
     */
    protected sync(): Promise<AddonModDataSyncResult> {
        return AddonModDataPrefetchHandler.sync(this.module, this.courseId);
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.database || !this.database.id) {
            return;
        }

        await AddonModData.logView(this.database.id);

        this.analyticsLogEvent('mod_data_view_database');
    }

    /**
     * Log search.
     */
    protected async performLogSearch(): Promise<void> {
        if (!this.database || !this.search.searching) {
            return;
        }

        const params: Record<string, unknown> = {
            perpage: ADDON_MOD_DATA_ENTRIES_PER_PAGE,
            search: !this.search.searchingAdvanced ? this.search.text : '',
            sort: this.search.sortBy,
            order: this.search.sortDirection,
            advanced: this.search.searchingAdvanced ? 1 : 0,
            filter: 1,
        };

        // @todo: Add advanced search parameters. Leave them empty if not using advanced search.

        this.analyticsLogEvent('mod_data_search_entries', {
            data: params,
            url: CoreUrl.addParamsToUrl(`/mod/data/view.php?d=${this.database.id}`, params),
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
        this.entryChangedObserver?.off();
        this.ratingOfflineObserver?.off();
        this.ratingSyncObserver?.off();
    }

}

export type AddonModDataSearchDataParams = {
    sortBy: string | number;
    sortDirection: string;
    page: number;
    text: string;
    searching: boolean;
    searchingAdvanced: boolean;
    advanced?: AddonModDataSearchEntriesAdvancedField[];
};
