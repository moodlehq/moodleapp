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

import { Component, Optional, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import {
    AddonModForum,
    AddonModForumData,
    AddonModForumSortOrder,
    AddonModForumDiscussion,
    AddonModForumNewDiscussionData,
    AddonModForumReplyDiscussionData,
} from '@addons/mod/forum/services/forum';
import { AddonModForumOffline } from '@addons/mod/forum/services/forum-offline';
import { Translate } from '@singletons';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { AddonModForumHelper } from '@addons/mod/forum/services/forum-helper';
import { CoreGroupInfo } from '@services/groups';
import { CoreEvents, CoreEventObserver } from '@singletons/events';
import {
    AddonModForumAutoSyncData,
    AddonModForumManualSyncData,
    AddonModForumSyncResult,
} from '@addons/mod/forum/services/forum-sync';
import { CoreSites } from '@services/sites';
import { CoreUser } from '@features/user/services/user';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourse } from '@features/course/services/course';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { AddonModForumDiscussionOptionsMenuComponent } from '../discussion-options-menu/discussion-options-menu';
import { CoreScreen } from '@services/screen';
import { AddonModForumPrefetchHandler } from '../../services/handlers/prefetch';
import { CoreRatingProvider } from '@features/rating/services/rating';
import { CoreRatingSyncProvider } from '@features/rating/services/rating-sync';
import { CoreRatingOffline } from '@features/rating/services/rating-offline';
import { ContextLevel } from '@/core/constants';
import { AddonModForumDiscussionItem, AddonModForumDiscussionsSource } from '../../classes/forum-discussions-source';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreNavigator } from '@services/navigator';
import {
    ADDON_MOD_FORUM_AUTO_SYNCED,
    ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT,
    ADDON_MOD_FORUM_COMPONENT,
    ADDON_MOD_FORUM_MANUAL_SYNCED,
    ADDON_MOD_FORUM_NEW_DISCUSSION_EVENT,
    ADDON_MOD_FORUM_PAGE_NAME,
    ADDON_MOD_FORUM_PREFERENCE_SORTORDER,
    ADDON_MOD_FORUM_REPLY_DISCUSSION_EVENT,
    ADDON_MOD_FORUM_SEARCH_PAGE_NAME,
} from '@addons/mod/forum/constants';
import { CoreSearchGlobalSearch } from '@features/search/services/global-search';
import { CoreToasts } from '@services/toasts';
/**
 * Component that displays a forum entry page.
 */
@Component({
    selector: 'addon-mod-forum-index',
    templateUrl: 'index.html',
    styleUrls: ['index.scss'],
})
export class AddonModForumIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    component = ADDON_MOD_FORUM_COMPONENT;
    pluginName = 'forum';
    descriptionNote?: string;
    promisedDiscussions: CorePromisedValue<AddonModForumDiscussionsManager>;
    discussionsItems: AddonModForumDiscussionItem[] = [];
    fetchFailed = false;
    canAddDiscussion = false;
    addDiscussionText!: string;
    availabilityMessage: string | null = null;
    sortingAvailable!: boolean;
    sortOrders: AddonModForumSortOrder[] = [];
    hasOfflineRatings = false;
    showQAMessage = false;
    isSetPinAvailable = false;
    showSearch = false;

    protected fetchContentDefaultError = 'addon.mod_forum.errorgetforum';
    protected syncEventName = ADDON_MOD_FORUM_AUTO_SYNCED;
    protected syncManualObserver?: CoreEventObserver; // It will observe the sync manual event.
    protected replyObserver?: CoreEventObserver;
    protected newDiscObserver?: CoreEventObserver;
    protected viewDiscObserver?: CoreEventObserver;
    protected changeDiscObserver?: CoreEventObserver;
    protected ratingOfflineObserver?: CoreEventObserver;
    protected ratingSyncObserver?: CoreEventObserver;
    protected sourceUnsubscribe?: () => void;
    protected checkCompletionAfterLog = false; // Use CoreListItemsManager log system instead.

    constructor(
        public route: ActivatedRoute,
        @Optional() protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModForumIndexComponent', content, courseContentsPage);

        this.promisedDiscussions = new CorePromisedValue();
    }

    get discussions(): AddonModForumDiscussionsManager | null {
        return this.promisedDiscussions.value;
    }

    get forum(): AddonModForumData | undefined {
        return this.discussions?.getSource().forum;
    }

    get selectedSortOrder(): AddonModForumSortOrder | undefined {
        return this.discussions?.getSource().selectedSortOrder ?? undefined;
    }

    get supportsChangeGroup(): boolean {
        return this.discussions?.getSource().supportsChangeGroup ?? false;
    }

    get groupId(): number {
        return this.discussions?.getSource().groupId ?? 0;
    }

    set groupId(value: number) {
        if (this.discussions) {
            this.discussions.getSource().groupId = value;
        }
    }

    get groupInfo(): CoreGroupInfo | undefined {
        return this.discussions?.getSource().groupInfo;
    }

    get usesGroups(): boolean {
        return !!(this.discussions?.getSource().usesGroups);
    }

    get canPin(): boolean {
        return !!(this.isSetPinAvailable && this.discussions?.getSource().allPartsPermissions?.canpindiscussions);
    }

    get canAddDiscussionToGroup(): boolean {
        return !!(this.forum && this.canAddDiscussion && this.discussions?.getSource().canAddDiscussionToGroup);
    }

    get errorLoadingDiscussions(): boolean {
        return !!this.discussions?.getSource().errorLoadingDiscussions;
    }

    /**
     * Check whether a discussion is online.
     *
     * @param discussion Discussion
     * @returns Whether the discussion is online.
     */
    isOnlineDiscussion(discussion: AddonModForumDiscussionItem): boolean {
        return !!this.discussions?.getSource().isOnlineDiscussion(discussion);
    }

    /**
     * Check whether a discussion is offline.
     *
     * @param discussion Discussion
     * @returns Whether the discussion is offline.
     */
    isOfflineDiscussion(discussion: AddonModForumDiscussionItem): boolean {
        return !!this.discussions?.getSource().isOfflineDiscussion(discussion);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.addDiscussionText = Translate.instant('addon.mod_forum.addanewdiscussion');
        this.sortingAvailable = AddonModForum.isDiscussionListSortingAvailable();
        this.sortOrders = AddonModForum.getAvailableSortOrders();
        this.isSetPinAvailable = AddonModForum.isSetPinStateAvailableForSite();

        await super.ngOnInit();

        // Initialize discussions manager.
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
            AddonModForumDiscussionsSource,
            [this.courseId, this.module.id, this.courseContentsPage ? `${ADDON_MOD_FORUM_PAGE_NAME}/` : ''],
        );

        this.sourceUnsubscribe = source.addListener({
            onItemsUpdated: async discussions => {
                this.discussionsItems = discussions.filter(discussion => !source.isNewDiscussionForm(discussion));
                this.hasOffline = discussions.some(discussion => source.isOfflineDiscussion(discussion));

                if (!this.forum) {
                    return;
                }

                // Check if there are replies for discussions stored in offline.
                const hasOffline = await AddonModForumOffline.hasForumReplies(this.forum.id);

                this.hasOffline = this.hasOffline || hasOffline || this.hasOfflineRatings;

                if (hasOffline) {
                    // Only update new fetched discussions.
                    const promises = discussions.map(async (discussion) => {
                        if (!this.discussions?.getSource().isOnlineDiscussion(discussion)) {
                            return;
                        }

                        // Get offline discussions.
                        const replies = await AddonModForumOffline.getDiscussionReplies(discussion.discussion);

                        discussion.numreplies = Number(discussion.numreplies) + replies.length;
                    });

                    await Promise.all(promises);
                }
            },
            onReset: () => {
                this.discussionsItems = [];
            },
        });

        this.promisedDiscussions.resolve(new AddonModForumDiscussionsManager(source, this));

        // Refresh data if this forum discussion is synchronized from discussions list.
        this.syncManualObserver = CoreEvents.on(ADDON_MOD_FORUM_MANUAL_SYNCED, (data) => {
            this.autoSyncEventReceived(data);
        }, this.siteId);

        // Listen for discussions added. When a discussion is added, we reload the data.
        this.newDiscObserver = CoreEvents.on(
            ADDON_MOD_FORUM_NEW_DISCUSSION_EVENT,
            (data) => this.eventReceived(true, data),
        );
        this.replyObserver = CoreEvents.on(
            ADDON_MOD_FORUM_REPLY_DISCUSSION_EVENT,
            (data) => this.eventReceived(false, data),
        );
        this.changeDiscObserver = CoreEvents.on(ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT, data => {
            if (!this.forum) {
                return;
            }

            if (this.forum.id === data.forumId || data.cmId === this.module.id) {
                AddonModForum.invalidateDiscussionsList(this.forum.id).finally(() => {
                    if (data.discussionId) {
                        // Discussion changed, search it in the list of discussions.
                        const discussion = this.discussions?.items.find(
                            disc => this.discussions?.getSource().isOnlineDiscussion(disc) && data.discussionId == disc.discussion,
                        ) as AddonModForumDiscussion;

                        if (discussion) {
                            if (data.locked !== undefined) {
                                discussion.locked = data.locked;
                            }
                            if (data.pinned !== undefined) {
                                discussion.pinned = data.pinned;
                            }
                            if (data.starred !== undefined) {
                                discussion.starred = data.starred;
                            }

                            this.showLoadingAndRefresh(false);
                        }
                    }

                    if (data.deleted !== undefined && data.deleted) {
                        if (data.post?.parentid == 0 && CoreScreen.isTablet && this.discussions && !this.discussions.empty) {
                            // Discussion deleted, clear details page.
                            this.discussions.select(this.discussions[0]);
                        }

                        this.showLoadingAndRefresh(false);
                    }
                });
            }
        });

        // Listen for offline ratings saved and synced.
        this.ratingOfflineObserver = CoreEvents.on(CoreRatingProvider.RATING_SAVED_EVENT, (data) => {
            if (this.forum && data.component == 'mod_forum' && data.ratingArea == 'post' &&
                    data.contextLevel == ContextLevel.MODULE && data.instanceId == this.forum.cmid) {
                this.hasOfflineRatings = true;
                this.hasOffline = true;
            }
        });

        this.ratingSyncObserver = CoreEvents.on(CoreRatingSyncProvider.SYNCED_EVENT, async (data) => {
            if (this.forum && data.component == 'mod_forum' && data.ratingArea == 'post' &&
                    data.contextLevel == ContextLevel.MODULE && data.instanceId == this.forum.cmid) {
                this.hasOfflineRatings =
                    await CoreRatingOffline.hasRatings('mod_forum', 'post', ContextLevel.MODULE, this.forum.cmid);
                this.hasOffline = this.hasOffline || this.hasOfflineRatings;
            }
        });

        // Initialize search.
        this.showSearch = await this.isSearchEnabled();
    }

    async ngAfterViewInit(): Promise<void> {
        await this.loadContent(false, true);

        const discussions = await this.promisedDiscussions;

        discussions.start(this.splitView);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.syncManualObserver && this.syncManualObserver.off();
        this.newDiscObserver && this.newDiscObserver.off();
        this.replyObserver && this.replyObserver.off();
        this.viewDiscObserver && this.viewDiscObserver.off();
        this.changeDiscObserver && this.changeDiscObserver.off();
        this.ratingOfflineObserver && this.ratingOfflineObserver.off();
        this.ratingSyncObserver && this.ratingSyncObserver.off();
        this.sourceUnsubscribe && this.sourceUnsubscribe();
        this.discussions?.destroy();
    }

    /**
     * Open search page.
     */
    async openSearch(): Promise<void> {
        if (!this.forum) {
            return;
        }

        await CoreNavigator.navigateToSitePath(ADDON_MOD_FORUM_SEARCH_PAGE_NAME, {
            params: {
                courseId: this.courseId,
                forumId: this.forum.id,
            },
        });
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh = false, sync = false, showErrors = false): Promise<void> {
        this.fetchFailed = false;

        try {
            await Promise.all([
                this.fetchForum(sync, showErrors),
                this.fetchSortOrderPreference(),
            ]);

            if (!this.forum) {
                return;
            }

            const discussions = await this.promisedDiscussions;

            await Promise.all([
                refresh ? discussions.reload() : discussions.load(),
                CoreRatingOffline.hasRatings('mod_forum', 'post', ContextLevel.MODULE, this.forum.cmid).then((hasRatings) => {
                    this.hasOfflineRatings = hasRatings;

                    return;
                }),
            ]);
        } catch (error) {
            this.fetchFailed = true; // Set to prevent infinite calls with infinite-loading.

            throw error; // Pass the error to the parent catch.
        }
    }

    private async fetchForum(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        if (!this.courseId || !this.module) {
            return;
        }

        const discussions = await this.promisedDiscussions;

        await discussions.getSource().loadForum();

        if (!this.forum) {
            return;
        }

        const forum = this.forum;
        const showDueDateMessage = !CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.11');
        this.description = forum.intro || this.description;
        this.availabilityMessage = AddonModForumHelper.getAvailabilityMessage(forum, showDueDateMessage);
        this.descriptionNote = Translate.instant('addon.mod_forum.numdiscussions', {
            numdiscussions: forum.numdiscussions,
        });

        this.dataRetrieved.emit(forum);

        switch (forum.type) {
            case 'news':
            case 'blog':
                this.addDiscussionText = Translate.instant('addon.mod_forum.addanewtopic');
                break;
            case 'qanda':
                this.addDiscussionText = Translate.instant('addon.mod_forum.addanewquestion');
                break;
            default:
                this.addDiscussionText = Translate.instant('addon.mod_forum.addanewdiscussion');
        }

        if (sync) {
            // Try to synchronize the forum.
            const updated = await this.syncActivity(showErrors);

            if (updated) {
                // Sync successful, send event.
                CoreEvents.trigger(ADDON_MOD_FORUM_MANUAL_SYNCED, {
                    forumId: forum.id,
                    userId: CoreSites.getCurrentSiteUserId(),
                    source: 'index',
                }, CoreSites.getCurrentSiteId());
            }
        }

        const promises: Promise<void>[] = [];

        // Check if the activity uses groups.
        promises.push(discussions.getSource().loadGroupInfo(forum.id));

        promises.push(
            AddonModForum
                .getAccessInformation(forum.id, { cmId: this.module.id })
                .then(async accessInfo => {
                    // Disallow adding discussions if cut-off date is reached and the user has not the
                    // capability to override it.
                    // Just in case the forum was fetched from WS when the cut-off date was not reached but it is now.
                    const cutoffDateReached = AddonModForumHelper.isCutoffDateReached(forum)
                                    && !accessInfo.cancanoverridecutoff;
                    this.canAddDiscussion = !!forum.cancreatediscussions && !cutoffDateReached;
                    this.showQAMessage = forum.type === 'qanda' && !accessInfo.canviewqandawithoutposting;

                    return;
                }),
        );

        await Promise.all(promises);
    }

    /**
     * Convenience function to load more forum discussions.
     *
     * @param complete Infinite scroll complete function. Only used from core-infinite-loading.
     * @returns Promise resolved when done.
     */
    async fetchMoreDiscussions(complete: () => void): Promise<void> {
        const discussions = await this.promisedDiscussions;

        try {
            this.fetchFailed = false;

            await discussions.load();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_forum.errorgetforum', true);

            this.fetchFailed = true;
        } finally {
            complete();
        }
    }

    /**
     * Convenience function to fetch the sort order preference.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchSortOrderPreference(): Promise<void> {
        const discussions = await this.promisedDiscussions;
        const selectedOrder = await AddonModForum.getSelectedSortOrder();

        discussions.getSource().selectedSortOrder = selectedOrder;
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        if (this.discussions) {
            promises.push(this.discussions.getSource().invalidateCache());
        }

        if (this.forum) {
            promises.push(AddonModForum.invalidateAccessInformation(this.forum.id));
        }

        if (this.sortingAvailable) {
            promises.push(CoreUser.invalidateUserPreference(ADDON_MOD_FORUM_PREFERENCE_SORTORDER));
        }

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    protected sync(): Promise<AddonModForumSyncResult> {
        return AddonModForumPrefetchHandler.sync(this.module, this.courseId);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @returns True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModForumAutoSyncData | AddonModForumManualSyncData): boolean {
        return !!this.forum
            && (!('source' in syncEventData) || syncEventData.source != 'index')
            && syncEventData.forumId == this.forum.id
            && syncEventData.userId == CoreSites.getCurrentSiteUserId();
    }

    /**
     * Function called when we receive an event of new discussion or reply to discussion.
     *
     * @param isNewDiscussion Whether it's a new discussion event.
     * @param data Event data.
     */
    protected async eventReceived(
        isNewDiscussion: boolean,
        data: AddonModForumNewDiscussionData | AddonModForumReplyDiscussionData,
    ): Promise<void> {
        if ((!this.forum || this.forum.id !== data.forumId) && data.cmId !== this.module.id) {
            return; // Not current forum.
        }

        // Check completion since it could be configured to complete once the user adds a new discussion or replies.
        this.checkCompletion();

        try {
            if (isNewDiscussion) {
                CoreToasts.show({
                    message: 'addon.mod_forum.postaddedsuccess',
                    translateMessage: true,
                });

                const newDiscGroupId = (data as AddonModForumNewDiscussionData).groupId;

                if (!newDiscGroupId || newDiscGroupId < 0 || !this.groupId || newDiscGroupId === this.groupId) {
                    await this.showLoadingAndRefresh(false);
                } else {
                    // Discussion is in a different group than the one currently viewed, only invalidate data.
                    await this.discussions?.getSource().invalidateList();
                }
            } else {
                await this.showLoadingAndRefresh(false);
            }
        } finally {
            // If it's a new discussion in tablet mode, try to open it.
            if (isNewDiscussion && CoreScreen.isTablet && this.discussions) {
                const newDiscussionData = data as AddonModForumNewDiscussionData;
                const discussion = this.discussions.items.find(disc => {
                    if (this.discussions?.getSource().isOfflineDiscussion(disc)) {
                        return disc.timecreated === newDiscussionData.discTimecreated;
                    }

                    if (this.discussions?.getSource().isOnlineDiscussion(disc)) {
                        return (newDiscussionData.discussionIds ?? []).includes(disc.discussion);
                    }

                    return false;
                });

                this.discussions.select(discussion ?? null);
            }
        }

    }

    /**
     * Opens the new discussion form.
     */
    openNewDiscussion(): void {
        this.discussions?.select(AddonModForumDiscussionsSource.NEW_DISCUSSION);
    }

    /**
     * Changes the sort order.
     *
     * @param sortOrderValue Sort order new data.
     */
    async setSortOrder(sortOrderValue: number): Promise<void> {
        const sortOrder = this.sortOrders.find(sortOrder => sortOrder.value === sortOrderValue);

        if (this.discussions && sortOrder && sortOrder.value != this.discussions.getSource().selectedSortOrder?.value) {
            this.discussions.getSource().selectedSortOrder = sortOrder;
            this.discussions.getSource().setDirty(true);

            try {
                await CoreUser.setUserPreference(ADDON_MOD_FORUM_PREFERENCE_SORTORDER, sortOrder.value.toFixed(0));
                await this.showLoadingAndFetch();
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'Error updating preference.');
            }
        }
    }

    /**
     * Show the context menu.
     *
     * @param event Click Event.
     * @param discussion Discussion.
     */
    async showOptionsMenu(event: Event, discussion: AddonModForumDiscussion): Promise<void> {
        if (!this.forum) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const popoverData = await CoreDomUtils.openPopover<{ action?: string; value: boolean }>({
            component: AddonModForumDiscussionOptionsMenuComponent,
            componentProps: {
                discussion,
                forumId: this.forum.id,
                cmId: this.module.id,
            },
            event,
        });

        if (popoverData && popoverData.action) {
            switch (popoverData.action) {
                case 'lock':
                    discussion.locked = popoverData.value;
                    break;
                case 'pin':
                    discussion.pinned = popoverData.value;
                    break;
                case 'star':
                    discussion.starred = popoverData.value;
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * Group has changed.
     */
    async groupChanged(): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            await Promise.all([
                this.discussions?.getSource().loadSelectedGroupData(),
                this.discussions?.reload(),
            ]);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Check if forum search is available.
     *
     * @returns Whether forum search is available.
     */
    protected async isSearchEnabled(): Promise<boolean> {
        if (!CoreSearchGlobalSearch.isEnabled()) {
            return false;
        }

        const searchAreas = await CoreSearchGlobalSearch.getSearchAreas();

        return !!searchAreas.find(({ id }) => id === 'mod_forum-post');
    }

}

/**
 * Discussions manager.
 */
class AddonModForumDiscussionsManager extends CoreListItemsManager<AddonModForumDiscussionItem, AddonModForumDiscussionsSource> {

    page: AddonModForumIndexComponent;

    constructor(source: AddonModForumDiscussionsSource, page: AddonModForumIndexComponent) {
        super(source, page.route.component);

        this.page = page;
    }

    /**
     * @inheritdoc
     */
    protected getDefaultItem(): AddonModForumDiscussionItem | null {
        const source = this.getSource();

        return this.items.find(discussion => !source.isNewDiscussionForm(discussion)) || null;
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        const forum = this.getSource().forum;

        if (!forum) {
            return;
        }

        try {
            await AddonModForum.logView(forum.id);

            CoreCourse.checkModuleCompletion(this.page.courseId, this.page.module.completiondata);
        } catch {
            // Ignore errors.
        }

        this.page.analyticsLogEvent('mod_forum_view_forum');
    }

    /**
     * Check whether there is any discussion in the items.
     *
     * @returns Whether there is a discussion.
     */
    get hasDiscussions(): boolean {
        const source = this.getSource();
        const items = source.getItems();

        return items !== null && items.some(item => !source.isNewDiscussionForm(item));
    }

}
