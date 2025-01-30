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

import { ContextLevel, CoreConstants } from '@/core/constants';
import {
    ADDON_BLOG_AUTO_SYNCED,
    ADDON_BLOG_ENTRY_UPDATED,
    ADDON_BLOG_MANUAL_SYNCED,
} from '@addons/blog/constants';
import {
    AddonBlog,
    AddonBlogFilter,
    AddonBlogOfflinePostFormatted,
    AddonBlogPostFormatted,
    AddonBlogProvider,
} from '@addons/blog/services/blog';
import { AddonBlogOffline, AddonBlogOfflineEntry } from '@addons/blog/services/blog-offline';
import { AddonBlogSync } from '@addons/blog/services/blog-sync';
import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { CoreComments } from '@features/comments/services/comments';
import { CoreTag } from '@features/tag/services/tag';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreNavigator } from '@services/navigator';
import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreUrl } from '@singletons/url';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreArray } from '@singletons/array';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreTime } from '@singletons/time';
import { CorePopovers } from '@services/overlays/popovers';
import { CoreLoadings } from '@services/overlays/loadings';
import { Subscription } from 'rxjs';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';
import { CoreCommentsComponentsModule } from '@features/comments/components/components.module';
import { CoreTagComponentsModule } from '@features/tag/components/components.module';
import { CoreMainMenuComponentsModule } from '@features/mainmenu/components/components.module';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the list of blog entries.
 */
@Component({
    selector: 'page-addon-blog-index',
    templateUrl: 'index.html',
    styleUrl: './index.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreMainMenuComponentsModule,
        CoreTagComponentsModule,
        CoreCommentsComponentsModule,
    ],
})
export default class AddonBlogIndexPage implements OnInit, OnDestroy {

    title = '';

    protected filter: AddonBlogFilter = {};
    protected pageLoaded = 0;
    protected siteHomeId: number;
    protected logView: () => void;

    loaded = signal(false);
    canLoadMore = false;
    loadMoreError = false;
    entries: (AddonBlogOfflinePostFormatted | AddonBlogPostFormatted)[] = [];
    entriesToRemove: { id: number; subject: string }[] = [];
    entriesToUpdate: AddonBlogOfflineEntry[] = [];
    offlineEntries: AddonBlogOfflineEntry[] = [];
    currentUserId: number;
    showMyEntriesToggle = false;
    onlyMyEntries = false;
    component = AddonBlogProvider.COMPONENT;
    commentsEnabled = false;
    tagsEnabled = false;
    contextLevel: ContextLevel = ContextLevel.SYSTEM;
    contextInstanceId = 0;
    entryUpdateObserver: CoreEventObserver;
    syncObserver: CoreEventObserver;
    onlineObserver: Subscription;
    optionsAvailable = false;
    hasOfflineDataToSync = signal(false);
    isOnline = signal(false);
    siteId: string;
    syncIcon = CoreConstants.ICON_SYNC;
    syncHidden = computed(() => !this.loaded() || !this.isOnline() || !this.hasOfflineDataToSync());

    constructor() {
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.siteHomeId = CoreSites.getCurrentSiteHomeId();
        this.siteId = CoreSites.getCurrentSiteId();
        this.isOnline.set(CoreNetwork.isOnline());

        this.logView = CoreTime.once(async () => {
            await CorePromiseUtils.ignoreErrors(AddonBlog.logView(this.filter));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_blog_view_entries',
                name: this.title,
                data: {
                    ...this.filter,
                    category: 'blog',
                },
                url: CoreUrl.addParamsToUrl('/blog/index.php', {
                    ...this.filter,
                    modid: this.filter.cmid,
                    cmid: undefined,
                }),
            });
        });

        this.entryUpdateObserver = CoreEvents.on(ADDON_BLOG_ENTRY_UPDATED, async () => {
            this.loaded.set(false);
            await CorePromiseUtils.ignoreErrors(this.refresh());
            this.loaded.set(true);
        });

        this.syncObserver = CoreEvents.onMultiple([ADDON_BLOG_MANUAL_SYNCED, ADDON_BLOG_AUTO_SYNCED], async ({ source }) => {
            if (this === source) {
                return;
            }

            this.loaded.set(false);
            await CorePromiseUtils.ignoreErrors(this.refresh(false));
            this.loaded.set(true);
        });

        // Refresh online status when changes.
        this.onlineObserver = CoreNetwork.onChange().subscribe(async () => {
            this.isOnline.set(CoreNetwork.isOnline());
        });
    }

    /**
     * Retrieves an unique id to be used in template.
     *
     * @param entry Entry.
     * @returns Entry template ID.
     */
    getEntryTemplateId(entry: AddonBlogOfflinePostFormatted | AddonBlogPostFormatted): string {
        return 'entry-' + ('id' in entry && entry.id ? entry.id : ('created-' + entry.created));
    }

    /**
     * View loaded.
     */
    async ngOnInit(): Promise<void> {
        const userId = CoreNavigator.getRouteNumberParam('userId');
        const courseId = CoreNavigator.getRouteNumberParam('courseId');
        const cmId = CoreNavigator.getRouteNumberParam('cmId');
        const entryId = CoreNavigator.getRouteNumberParam('entryId');
        const groupId = CoreNavigator.getRouteNumberParam('groupId');
        const tagId = CoreNavigator.getRouteNumberParam('tagId');

        if (!userId && !courseId && !cmId && !entryId && !groupId && !tagId) {
            this.title = 'addon.blog.siteblogheading';
        } else {
            this.title = 'addon.blog.blogentries';
        }

        if (userId) {
            this.filter.userid = userId;
        }

        if (courseId) {
            this.filter.courseid = courseId;
        }

        if (cmId) {
            this.filter.cmid = cmId;
        }

        if (entryId) {
            this.filter.entryid = entryId;
        }

        if (groupId) {
            this.filter.groupid = groupId;
        }

        if (tagId) {
            this.filter.tagid = tagId;
        }

        this.showMyEntriesToggle = !userId && !this.filter.entryid;

        // Calculate the context level.
        if (userId && !courseId && !cmId) {
            this.contextLevel = ContextLevel.USER;
            this.contextInstanceId = userId;
        } else if (courseId && courseId != this.siteHomeId) {
            this.contextLevel = ContextLevel.COURSE;
            this.contextInstanceId = courseId;
        } else {
            this.contextLevel = ContextLevel.SYSTEM;
            this.contextInstanceId = 0;
        }

        this.commentsEnabled = CoreComments.areCommentsEnabledInSite();
        this.tagsEnabled = CoreTag.areTagsAvailableInSite();

        CoreSites.loginNavigationFinished();

        await this.fetchEntries(false, false, true);
        this.optionsAvailable = await AddonBlog.isEditingEnabled();
    }

    /**
     * Retrieves entry id or undefined.
     *
     * @param entry Entry.
     * @returns Entry id or undefined.
     */
    getEntryId(entry: AddonBlogPostFormatted | AddonBlogOfflinePostFormatted): number | undefined {
        return this.isOnlineEntry(entry) ? entry.id : undefined;
    }

    /**
     * Fetch blog entries.
     *
     * @param refresh Empty events array first.
     * @returns Promise with the entries.
     */
    protected async fetchEntries(refresh: boolean, showSyncErrors = false, sync?: boolean): Promise<void> {
        this.loadMoreError = false;

        if (refresh) {
            this.pageLoaded = 0;
        }

        if (this.isOnline() && sync) {
            // Try to synchronize offline events.
            try {
                const result = await AddonBlogSync.syncEntriesForSite(CoreSites.getCurrentSiteId());

                if (result.warnings && result.warnings.length) {
                    CoreAlerts.show({ message: result.warnings[0] });
                }

                if (result.updated) {
                    CoreEvents.trigger(ADDON_BLOG_MANUAL_SYNCED, { ...result, source: this });
                }
            } catch (error) {
                if (showSyncErrors) {
                    CoreAlerts.showError(error, { default: Translate.instant('core.errorsync') });
                }
            }
        }

        try {
            const result = await AddonBlog.getEntries(
                this.filter,
                {
                    page: this.pageLoaded,
                    readingStrategy: refresh
                        ? CoreSitesReadingStrategy.PREFER_NETWORK
                        : undefined,
                },
            );

            await Promise.all(result.entries.map(async (entry: AddonBlogPostFormatted) => AddonBlog.formatEntry(entry)));

            this.entries = refresh
                ? result.entries
                : this.entries.concat(result.entries).sort((a, b) => {
                    if ('id' in a && !('id' in b)) {
                        return 1;
                    } else if ('id' in b && !('id' in a)) {
                        return -1;
                    }

                    return b.created - a.created;
                });

            this.canLoadMore = result.totalentries > this.entries.length;
            await this.loadOfflineEntries(this.pageLoaded === 0);
            this.entries = CoreArray.unique(this.entries, 'id');

            this.pageLoaded++;
            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.blog.errorloadentries') });
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        } finally {
            this.loaded.set(true);
        }
    }

    /**
     * Load offline entries and format them.
     *
     * @param loadCreated Load offline entries to create or not.
     */
    async loadOfflineEntries(loadCreated: boolean): Promise<void> {
        if (loadCreated) {
            this.offlineEntries = await AddonBlogOffline.getOfflineEntries(this.filter);
            this.entriesToUpdate = this.offlineEntries.filter(entry => !!entry.id);
            this.entriesToRemove = await AddonBlogOffline.getEntriesToRemove();
            const entriesToCreate = this.offlineEntries.filter(entry => !entry.id);

            const formattedEntries = await Promise.all(entriesToCreate.map(async (entryToCreate) =>
                await AddonBlog.formatOfflineEntry(entryToCreate)));

            this.entries = [...formattedEntries, ...this.entries];
        }

        if (this.entriesToUpdate.length) {
            this.entries = await Promise.all(this.entries.map(async (entry) => {
                const entryToUpdate = this.entriesToUpdate.find(entryToUpdate =>
                    this.isOnlineEntry(entry) && entryToUpdate.id === entry.id);

                return !entryToUpdate || !('id' in entry) ? entry : await AddonBlog.formatOfflineEntry(entryToUpdate, entry);
            }));
        }

        for (const entryToRemove of this.entriesToRemove) {
            const foundEntry = this.entries.find(entry => ('id' in entry && entry.id === entryToRemove.id));

            if (foundEntry) {
                foundEntry.deleted = true;
            }
        }

        this.hasOfflineDataToSync.set(this.offlineEntries.length > 0 || this.entriesToRemove.length > 0);
    }

    /**
     * Toggle between showing only my entries or not.
     *
     * @param enabled If true, filter my entries. False otherwise.
     */
    async onlyMyEntriesToggleChanged(enabled: boolean): Promise<void> {
        const loading = await CoreLoadings.show();

        try {
            this.filter.userid = !enabled ? undefined : this.currentUserId;
            await this.fetchEntries(true);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.blog.errorloadentries') });
            this.onlyMyEntries = !enabled;
            this.filter.userid = !enabled ? this.currentUserId : undefined;
        } finally {
            loading.dismiss();
        }
    }

    /**
     * Check if provided entry is online.
     *
     * @param entry Entry.
     * @returns Whether it's an online entry.
     */
    isOnlineEntry(entry: AddonBlogOfflinePostFormatted | AddonBlogPostFormatted): entry is AddonBlogPostFormatted {
        return 'id' in entry;
    }

    /**
     * Function to load more entries.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @returns Resolved when done.
     */
    async loadMore(infiniteComplete?: () => void): Promise<void> {
        try {
            return await this.fetchEntries(false);
        } finally {
            infiniteComplete?.();
        }
    }

    /**
     * Refresh blog entries on PTR.
     *
     * @param sync Sync entries.
     * @param refresher Refresher instance.
     */
    async refresh(sync = true, refresher?: HTMLIonRefresherElement): Promise<void> {
        const promises = this.entries.map(async (entry) => {
            if (this.isOnlineEntry(entry)) {
                return CoreComments.invalidateCommentsData(
                    ContextLevel.USER,
                    entry.userid,
                    this.component,
                    entry.id,
                    'format_blog',
                );
            }
        });

        promises.push(AddonBlog.invalidateEntries(this.filter));

        if (this.showMyEntriesToggle) {
            this.filter['userid'] = this.currentUserId;
            promises.push(AddonBlog.invalidateEntries(this.filter));

            if (!this.onlyMyEntries) {
                delete this.filter['userid'];
            }

        }

        await CorePromiseUtils.allPromises(promises);
        await this.fetchEntries(true, false, sync);
        refresher?.complete();
    }

    /**
     * Redirect to entry creation form.
     */
    createNewEntry(): void {
        CoreNavigator.navigateToSitePath('blog/edit/0', { params: { cmId: this.filter.cmid, courseId: this.filter.courseid } });
    }

    /**
     * Delete entry.
     *
     * @param entryToRemove Entry.
     */
    async deleteEntry(entryToRemove: AddonBlogOfflinePostFormatted | AddonBlogPostFormatted): Promise<void> {
        try {
            await CoreAlerts.confirmDelete(Translate.instant('addon.blog.blogdeleteconfirm', { $a: entryToRemove.subject }));
        } catch {
            return;
        }

        const loading = await CoreLoadings.show();

        try {
            if ('id' in entryToRemove && entryToRemove.id) {
                await AddonBlog.deleteEntry({ entryid: entryToRemove.id, subject: entryToRemove.subject });
            } else {
                await AddonBlogOffline.deleteOfflineEntryRecord({ created: entryToRemove.created });
            }

            CoreEvents.trigger(ADDON_BLOG_ENTRY_UPDATED);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.blog.errorloadentries') });
        } finally {
            loading.dismiss();
        }
    }

    /**
     * Show the context menu.
     *
     * @param event Click Event.
     * @param entry Entry to remove.
     */
    async showEntryActionsPopover(event: Event, entry: AddonBlogPostFormatted | AddonBlogOfflinePostFormatted): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const { AddonBlogEntryOptionsMenuComponent } =
            await import('@addons/blog/components/entry-options-menu/entry-options-menu');

        const popoverData = await CorePopovers.open<string>({
            component: AddonBlogEntryOptionsMenuComponent,
            event,
        });

        switch (popoverData) {
            case 'edit': {
                await CoreNavigator.navigateToSitePath(`blog/edit/${this.isOnlineEntry(entry) && entry.id
                    ? entry.id
                    : 'new-' + entry.created}`, {
                        params: this.filter.cmid
                            ? { cmId: this.filter.cmid, filters: this.filter, lastModified: entry.lastmodified }
                            : { filters: this.filter, lastModified: entry.lastmodified },
                });
                break;
            }
            case 'delete':
                await this.deleteEntry(entry);
                break;
            default:
                break;
        }
    }

    /**
     * Undo entry deletion.
     *
     * @param entry Entry to prevent deletion.
     */
    async undoDelete(entry: AddonBlogOfflinePostFormatted | AddonBlogPostFormatted): Promise<void> {
        await AddonBlogOffline.unmarkEntryAsRemoved('id' in entry ? entry.id : entry.created);
        CoreEvents.trigger(ADDON_BLOG_ENTRY_UPDATED);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.entryUpdateObserver.off();
        this.syncObserver.off();
        this.onlineObserver.unsubscribe();
    }

}
