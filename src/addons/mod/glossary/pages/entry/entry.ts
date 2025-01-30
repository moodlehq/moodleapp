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

import { AddonModGlossaryHelper } from '@addons/mod/glossary/services/glossary-helper';
import { AddonModGlossaryOffline, AddonModGlossaryOfflineEntry } from '@addons/mod/glossary/services/glossary-offline';
import { Component, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreCommentsCommentsComponent } from '@features/comments/components/comments/comments';
import { CoreComments } from '@features/comments/services/comments';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { CoreTag } from '@features/tag/services/tag';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { CoreNavigator } from '@services/navigator';
import { CoreNetwork } from '@services/network';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AddonModGlossaryEntriesSource, AddonModGlossaryEntryItem } from '../../classes/glossary-entries-source';
import {
    AddonModGlossary,
    AddonModGlossaryEntry,
    AddonModGlossaryGlossary,
} from '../../services/glossary';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ADDON_MOD_GLOSSARY_COMPONENT, ADDON_MOD_GLOSSARY_ENTRY_UPDATED, ADDON_MOD_GLOSSARY_PAGE_NAME } from '../../constants';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreRatingComponentsModule } from '@features/rating/components/components.module';
import { CoreCommentsComponentsModule } from '@features/comments/components/components.module';
import { CoreTagComponentsModule } from '@features/tag/components/components.module';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays a glossary entry.
 */
@Component({
    selector: 'page-addon-mod-glossary-entry',
    templateUrl: 'entry.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreTagComponentsModule,
        CoreCommentsComponentsModule,
        CoreRatingComponentsModule,
    ],
})
export class AddonModGlossaryEntryPage implements OnInit, OnDestroy {

    @ViewChild(CoreCommentsCommentsComponent) comments?: CoreCommentsCommentsComponent;

    component = ADDON_MOD_GLOSSARY_COMPONENT;
    componentId?: number;
    onlineEntry?: AddonModGlossaryEntry;
    offlineEntry?: AddonModGlossaryOfflineEntry;
    offlineEntryFiles?: FileEntry[];
    entries!: AddonModGlossaryEntryEntriesSwipeManager;
    glossary?: AddonModGlossaryGlossary;
    entryUpdatedObserver?: CoreEventObserver;
    loaded = false;
    showAuthor = false;
    showDate = false;
    ratingInfo?: CoreRatingInfo;
    tagsEnabled = false;
    canEdit = false;
    canDelete = false;
    commentsEnabled = false;
    courseId!: number;
    cmId!: number;

    protected entrySlug!: string;
    protected logView: () => void;

    constructor(
        @Optional() protected splitView: CoreSplitViewComponent,
        protected route: ActivatedRoute,
        @Optional() protected courseContentsPage?: CoreCourseContentsPage,
    ) {
        this.logView = CoreTime.once(async () => {
            if (!this.onlineEntry || !this.glossary || !this.componentId) {
                return;
            }

            await CorePromiseUtils.ignoreErrors(AddonModGlossary.logEntryView(this.onlineEntry.id, this.componentId));

            this.analyticsLogEvent('mod_glossary_get_entry_by_id', `/mod/glossary/showentry.php?eid=${this.onlineEntry.id}`);
        });
    }

    get entry(): AddonModGlossaryEntry | AddonModGlossaryOfflineEntry | undefined {
        return this.onlineEntry ?? this.offlineEntry;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        let onlineEntryId: number | null = null;
        let offlineEntryTimeCreated: number | null = null;

        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.tagsEnabled = CoreTag.areTagsAvailableInSite();
            this.commentsEnabled = CoreComments.areCommentsEnabledInSite();
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.entrySlug = CoreNavigator.getRequiredRouteParam<string>('entrySlug');

            const routeData = CoreNavigator.getRouteData(this.route);
            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonModGlossaryEntriesSource,
                [this.courseId, this.cmId, routeData.glossaryPathPrefix ?? ''],
            );

            this.entries = new AddonModGlossaryEntryEntriesSwipeManager(source);

            await this.entries.start();

            if (this.entrySlug.startsWith('new-')) {
                offlineEntryTimeCreated = Number(this.entrySlug.slice(4));
            } else {
                onlineEntryId = Number(this.entrySlug);
            }
        } catch (error) {
            CoreAlerts.showError(error);
            this.goBack();

            return;
        }

        this.entryUpdatedObserver = CoreEvents.on(ADDON_MOD_GLOSSARY_ENTRY_UPDATED, data => {
            if (data.glossaryId !== this.glossary?.id) {
                return;
            }

            if (
                (this.onlineEntry && this.onlineEntry.id === data.entryId) ||
                (this.offlineEntry && this.offlineEntry.timecreated === data.timecreated)
            ) {
                this.doRefresh();
            }
        });

        try {
            if (onlineEntryId) {
                await this.loadOnlineEntry(onlineEntryId);
            } else if (offlineEntryTimeCreated) {
                await this.loadOfflineEntry(offlineEntryTimeCreated);
            }
        } finally {
            this.loaded = true;
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.entries.destroy();
        this.entryUpdatedObserver?.off();
    }

    /**
     * Edit entry.
     */
    async editEntry(): Promise<void> {
        await CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_GLOSSARY_PAGE_NAME}/${this.courseId}/${this.cmId}/entry/${this.entrySlug}/edit`,
        );
    }

    /**
     * Delete entry.
     */
    async deleteEntry(): Promise<void> {
        // Log analytics even if the user cancels for consistency with LMS.
        this.analyticsLogEvent(
            'mod_glossary_delete_entry',
            `/mod/glossary/deleteentry.php?id=${this.glossary?.id}&mode=delete&entry=${this.onlineEntry?.id}`,
        );

        const glossaryId = this.glossary?.id;
        const cancelled = await CorePromiseUtils.promiseFails(
            CoreAlerts.confirm(Translate.instant('addon.mod_glossary.areyousuredelete')),
        );

        if (!glossaryId || cancelled) {
            return;
        }

        const modal = await CoreLoadings.show();

        try {
            if (this.onlineEntry) {
                const entryId = this.onlineEntry.id;

                await AddonModGlossary.deleteEntry(glossaryId, entryId);
                await Promise.all([
                    CorePromiseUtils.ignoreErrors(AddonModGlossary.invalidateEntry(entryId)),
                    CorePromiseUtils.ignoreErrors(AddonModGlossary.invalidateEntriesByLetter(glossaryId)),
                    CorePromiseUtils.ignoreErrors(AddonModGlossary.invalidateEntriesByAuthor(glossaryId)),
                    CorePromiseUtils.ignoreErrors(AddonModGlossary.invalidateEntriesByCategory(glossaryId)),
                    CorePromiseUtils.ignoreErrors(AddonModGlossary.invalidateEntriesByDate(glossaryId, 'CREATION')),
                    CorePromiseUtils.ignoreErrors(AddonModGlossary.invalidateEntriesByDate(glossaryId, 'UPDATE')),
                    CorePromiseUtils.ignoreErrors(this.entries.getSource().invalidateCache(false)),
                ]);
            } else if (this.offlineEntry) {
                const concept = this.offlineEntry.concept;
                const timecreated = this.offlineEntry.timecreated;

                await AddonModGlossaryOffline.deleteOfflineEntry(glossaryId, timecreated);
                await AddonModGlossaryHelper.deleteStoredFiles(glossaryId, concept, timecreated);
            }

            CoreToasts.show({
                message: 'addon.mod_glossary.entrydeleted',
                translateMessage: true,
                duration: ToastDuration.LONG,
            });

            await this.goBack();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_glossary.errordeleting') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement): Promise<void> {
        if (this.onlineEntry && this.glossary?.allowcomments && this.onlineEntry.id > 0 && this.commentsEnabled && this.comments) {
            // Refresh comments asynchronously (without blocking the current promise).
            CorePromiseUtils.ignoreErrors(this.comments.doRefresh());
        }

        try {
            if (this.onlineEntry) {
                await CorePromiseUtils.ignoreErrors(AddonModGlossary.invalidateEntry(this.onlineEntry.id));
                await this.loadOnlineEntry(this.onlineEntry.id);
            } else if (this.offlineEntry) {
                const timecreated = Number(this.entrySlug.slice(4));

                await this.loadOfflineEntry(timecreated);
            }
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Load online entry data.
     */
    protected async loadOnlineEntry(entryId: number): Promise<void> {
        try {
            const result = await AddonModGlossary.getEntry(entryId);
            const canDeleteEntries = CoreNetwork.isOnline() && await AddonModGlossary.canDeleteEntries();
            const canUpdateEntries = CoreNetwork.isOnline() && await AddonModGlossary.canUpdateEntries();

            this.onlineEntry = result.entry;
            this.ratingInfo = result.ratinginfo;
            this.canDelete = canDeleteEntries && !!result.permissions?.candelete;
            this.canEdit = canUpdateEntries && !!result.permissions?.canupdate;

            await this.loadGlossary();

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_glossary.errorloadingentry') });
        }
    }

    /**
     * Load offline entry data.
     *
     * @param timecreated Entry Timecreated.
     */
    protected async loadOfflineEntry(timecreated: number): Promise<void> {
        try {
            const glossary = await this.loadGlossary();

            this.offlineEntry = await AddonModGlossaryOffline.getOfflineEntry(glossary.id, timecreated);
            this.offlineEntryFiles = this.offlineEntry.attachments && this.offlineEntry.attachments.offline > 0
                ? await AddonModGlossaryHelper.getStoredFiles(
                    glossary.id,
                    this.offlineEntry.concept,
                    timecreated,
                )
                : undefined;
            this.canEdit = true;
            this.canDelete = true;
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_glossary.errorloadingentry') });
        }
    }

    /**
     * Load glossary data.
     *
     * @returns Glossary.
     */
    protected async loadGlossary(): Promise<AddonModGlossaryGlossary> {
        if (this.glossary) {
            return this.glossary;
        }

        this.glossary = await AddonModGlossary.getGlossary(this.courseId, this.cmId);
        this.componentId = this.glossary.coursemodule;

        switch (this.glossary.displayformat) {
            case 'fullwithauthor':
            case 'encyclopedia':
                this.showAuthor = true;
                this.showDate = true;
                break;
            case 'fullwithoutauthor':
                this.showAuthor = false;
                this.showDate = true;
                break;
            default: // Default, and faq, simple, entrylist, continuous.
                this.showAuthor = false;
                this.showDate = false;
        }

        return this.glossary;
    }

    /**
     * Function called when rating is updated online.
     */
    ratingUpdated(): void {
        if (!this.onlineEntry) {
            return;
        }

        AddonModGlossary.invalidateEntry(this.onlineEntry.id);
    }

    /**
     * Log analytics event.
     *
     * @param wsName WS name.
     * @param url URL.
     */
    protected analyticsLogEvent(wsName: string, url: string): void {
        if (!this.onlineEntry || !this.glossary) {
            return;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: wsName,
            name: this.onlineEntry.concept,
            data: { id: this.onlineEntry.id, glossaryid: this.glossary.id, category: 'glossary' },
            url,
        });
    }

    /**
     * Helper function to go back.
     */
    protected async goBack(): Promise<void> {
        if (this.splitView?.outletActivated) {
            await CoreNavigator.navigate((this.courseContentsPage ? '../' : '') + '../../');
        } else {
            await CoreNavigator.back();
        }
    }

}

/**
 * Helper to manage swiping within a collection of glossary entries.
 */
class AddonModGlossaryEntryEntriesSwipeManager
    extends CoreSwipeNavigationItemsManager<AddonModGlossaryEntryItem, AddonModGlossaryEntriesSource> {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        const params = CoreNavigator.getRouteParams(route);

        return `${this.getSource().GLOSSARY_PATH_PREFIX}entry/${params.entrySlug}`;
    }

}
