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
import { ActivatedRoute, Params } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { ModalOptions } from '@ionic/core';

import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import {
    AddonModForum,
    AddonModForumData,
    AddonModForumProvider,
    AddonModForumSortOrder,
    AddonModForumDiscussion,
    AddonModForumNewDiscussionData,
    AddonModForumReplyDiscussionData,
} from '@addons/mod/forum/services/forum';
import { AddonModForumOffline, AddonModForumOfflineDiscussion } from '@addons/mod/forum/services/forum-offline';
import { Translate } from '@singletons';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { AddonModForumHelper } from '@addons/mod/forum/services/forum-helper';
import { CoreGroups, CoreGroupsProvider } from '@services/groups';
import { CoreEvents, CoreEventObserver } from '@singletons/events';
import {
    AddonModForumAutoSyncData,
    AddonModForumManualSyncData,
    AddonModForumSyncProvider,
    AddonModForumSyncResult,
} from '@addons/mod/forum/services/forum-sync';
import { CoreSites } from '@services/sites';
import { CoreUser } from '@features/user/services/user';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourse } from '@features/course/services/course';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { AddonModForumDiscussionOptionsMenuComponent } from '../discussion-options-menu/discussion-options-menu';
import { AddonModForumSortOrderSelectorComponent } from '../sort-order-selector/sort-order-selector';
import { CoreScreen } from '@services/screen';
import { CoreArray } from '@singletons/array';
import { AddonModForumPrefetchHandler } from '../../services/handlers/prefetch';
import { AddonModForumModuleHandlerService } from '../../services/handlers/module';
import { CoreRatingProvider } from '@features/rating/services/rating';
import { CoreRatingSyncProvider } from '@features/rating/services/rating-sync';
import { CoreRatingOffline } from '@features/rating/services/rating-offline';
import { ContextLevel } from '@/core/constants';

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

    component = AddonModForumProvider.COMPONENT;
    moduleName = 'forum';
    descriptionNote?: string;
    forum?: AddonModForumData;
    discussions: AddonModForumDiscussionsManager;
    canAddDiscussion = false;
    addDiscussionText!: string;
    availabilityMessage: string | null = null;
    sortingAvailable!: boolean;
    sortOrders: AddonModForumSortOrder[] = [];
    selectedSortOrder: AddonModForumSortOrder | null = null;
    canPin = false;
    trackPosts = false;
    hasOfflineRatings = false;
    sortOrderSelectorModalOptions: ModalOptions = {
        component: AddonModForumSortOrderSelectorComponent,
    };

    protected syncEventName = AddonModForumSyncProvider.AUTO_SYNCED;
    protected page = 0;
    protected usesGroups = false;
    protected syncManualObserver?: CoreEventObserver; // It will observe the sync manual event.
    protected replyObserver?: CoreEventObserver;
    protected newDiscObserver?: CoreEventObserver;
    protected viewDiscObserver?: CoreEventObserver;
    protected changeDiscObserver?: CoreEventObserver;
    protected ratingOfflineObserver?: CoreEventObserver;
    protected ratingSyncObserver?: CoreEventObserver;

    constructor(
        route: ActivatedRoute,
        @Optional() protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModForumIndexComponent', content, courseContentsPage);

        this.discussions = new AddonModForumDiscussionsManager(
            route.component,
            this,
            courseContentsPage ? `${AddonModForumModuleHandlerService.PAGE_NAME}/` : '',
        );
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        this.addDiscussionText = Translate.instant('addon.mod_forum.addanewdiscussion');
        this.sortingAvailable = AddonModForum.isDiscussionListSortingAvailable();
        this.sortOrders = AddonModForum.getAvailableSortOrders();

        this.sortOrderSelectorModalOptions.componentProps = {
            sortOrders: this.sortOrders,
        };

        await super.ngOnInit();

        // Refresh data if this forum discussion is synchronized from discussions list.
        this.syncManualObserver = CoreEvents.on(AddonModForumSyncProvider.MANUAL_SYNCED, (data) => {
            this.autoSyncEventReceived(data);
        }, this.siteId);

        // Listen for discussions added. When a discussion is added, we reload the data.
        this.newDiscObserver = CoreEvents.on(
            AddonModForumProvider.NEW_DISCUSSION_EVENT,
            this.eventReceived.bind(this, true),
        );
        this.replyObserver = CoreEvents.on(
            AddonModForumProvider.REPLY_DISCUSSION_EVENT,
            this.eventReceived.bind(this, false),
        );
        this.changeDiscObserver = CoreEvents.on(AddonModForumProvider.CHANGE_DISCUSSION_EVENT, data => {
            if ((this.forum && this.forum.id === data.forumId) || data.cmId === this.module.id) {
                AddonModForum.invalidateDiscussionsList(this.forum!.id).finally(() => {
                    if (data.discussionId) {
                        // Discussion changed, search it in the list of discussions.
                        const discussion = this.discussions.items.find(
                            (disc) => this.discussions.isOnlineDiscussion(disc) && data.discussionId == disc.discussion,
                        ) as AddonModForumDiscussion;

                        if (discussion) {
                            if (typeof data.locked != 'undefined') {
                                discussion.locked = data.locked;
                            }
                            if (typeof data.pinned != 'undefined') {
                                discussion.pinned = data.pinned;
                            }
                            if (typeof data.starred != 'undefined') {
                                discussion.starred = data.starred;
                            }

                            this.showLoadingAndRefresh(false);
                        }
                    }

                    if (typeof data.deleted != 'undefined' && data.deleted) {
                        if (data.post?.parentid == 0 && CoreScreen.isTablet && !this.discussions.empty) {
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
            }
        });

        this.ratingSyncObserver = CoreEvents.on(CoreRatingSyncProvider.SYNCED_EVENT, async (data) => {
            if (this.forum && data.component == 'mod_forum' && data.ratingArea == 'post' &&
                    data.contextLevel == ContextLevel.MODULE && data.instanceId == this.forum.cmid) {
                this.hasOfflineRatings =
                    await CoreRatingOffline.hasRatings('mod_forum', 'post', ContextLevel.MODULE, this.forum.cmid);
            }
        });
    }

    async ngAfterViewInit(): Promise<void> {
        await this.loadContent(false, true);

        if (!this.forum) {
            return;
        }

        CoreUtils.ignoreErrors(
            AddonModForum.instance
                .logView(this.forum.id, this.forum.name)
                .then(async () => {
                    CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);

                    return;
                }),
        );

        this.discussions.start(this.splitView);
    }

    /**
     * Component being destroyed.
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
    }

    /**
     * Download the component contents.
     *
     * @param refresh Whether we're refreshing data.
     * @param sync If the refresh needs syncing.
     * @param showErrors Wether to show errors to the user or hide them.
     */
    protected async fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<void> {
        this.discussions.fetchFailed = false;

        const promises: Promise<void>[] = [];

        promises.push(this.fetchForum(sync, showErrors));
        promises.push(this.fetchSortOrderPreference());

        try {
            await Promise.all(promises);
            await Promise.all([
                this.fetchOfflineDiscussions(),
                this.fetchDiscussions(refresh),
                CoreRatingOffline.hasRatings('mod_forum', 'post', ContextLevel.MODULE, this.forum!.cmid).then((hasRatings) => {
                    this.hasOfflineRatings = hasRatings;

                    return;
                }),
            ]);
        } catch (error) {
            if (refresh) {
                CoreDomUtils.showErrorModalDefault(error, 'addon.mod_forum.errorgetforum', true);

                this.discussions.fetchFailed = true; // Set to prevent infinite calls with infinite-loading.
            } else {
                // Get forum failed, retry without using cache since it might be a new activity.
                await this.refreshContent(sync);
            }
        }

        this.fillContextMenu(refresh);
    }

    private async fetchForum(sync: boolean = false, showErrors: boolean = false): Promise<void> {
        if (!this.courseId || !this.module) {
            return;
        }

        const forum = await AddonModForum.getForum(this.courseId, this.module.id);

        this.forum = forum;
        this.description = forum.intro || this.description;
        this.availabilityMessage = AddonModForumHelper.getAvailabilityMessage(forum);
        this.descriptionNote = Translate.instant('addon.mod_forum.numdiscussions', {
            numdiscussions: forum.numdiscussions,
        });

        if (typeof forum.istracked != 'undefined') {
            this.trackPosts = forum.istracked;
        }

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
                CoreEvents.trigger(AddonModForumSyncProvider.MANUAL_SYNCED, {
                    forumId: forum.id,
                    userId: CoreSites.getCurrentSiteUserId(),
                    source: 'index',
                }, CoreSites.getCurrentSiteId());
            }
        }

        const promises: Promise<void>[] = [];

        // Check if the activity uses groups.
        promises.push(
            CoreGroups.instance
                .getActivityGroupMode(this.forum.cmid)
                .then(async mode => {
                    this.usesGroups = mode === CoreGroupsProvider.SEPARATEGROUPS
                                    || mode === CoreGroupsProvider.VISIBLEGROUPS;

                    return;
                }),
        );

        promises.push(
            AddonModForum.instance
                .getAccessInformation(this.forum.id, { cmId: this.module.id })
                .then(async accessInfo => {
                    // Disallow adding discussions if cut-off date is reached and the user has not the
                    // capability to override it.
                    // Just in case the forum was fetched from WS when the cut-off date was not reached but it is now.
                    const cutoffDateReached = AddonModForumHelper.isCutoffDateReached(this.forum!)
                                    && !accessInfo.cancanoverridecutoff;
                    this.canAddDiscussion = !!this.forum?.cancreatediscussions && !cutoffDateReached;

                    return;
                }),
        );

        if (AddonModForum.isSetPinStateAvailableForSite()) {
            // Use the canAddDiscussion WS to check if the user can pin discussions.
            promises.push(
                AddonModForum.instance
                    .canAddDiscussionToAll(this.forum.id, { cmId: this.module.id })
                    .then(async response => {
                        this.canPin = !!response.canpindiscussions;

                        return;
                    })
                    .catch(async () => {
                        this.canPin = false;

                        return;
                    }),
            );
        } else {
            this.canPin = false;
        }

        await Promise.all(promises);
    }

    /**
     * Convenience function to fetch offline discussions.
     *
     * @return Promise resolved when done.
     */
    protected async fetchOfflineDiscussions(): Promise<void> {
        const forum = this.forum!;
        let offlineDiscussions = await AddonModForumOffline.getNewDiscussions(forum.id);
        this.hasOffline = !!offlineDiscussions.length;

        if (!this.hasOffline) {
            this.discussions.setOfflineDiscussions([]);

            return;
        }

        if (this.usesGroups) {
            offlineDiscussions = await AddonModForum.formatDiscussionsGroups(forum.cmid, offlineDiscussions);
        }

        // Fill user data for Offline discussions (should be already cached).
        const promises = offlineDiscussions.map(async (offlineDiscussion) => {
            const discussion = offlineDiscussion as unknown as AddonModForumDiscussion;

            if (discussion.parent === 0 || forum.type === 'single') {
                // Do not show author for first post and type single.
                return;
            }

            try {
                const user = await CoreUser.getProfile(discussion.userid, this.courseId, true);

                discussion.userfullname = user.fullname;
                discussion.userpictureurl = user.profileimageurl;
            } catch (error) {
                // Ignore errors.
            }
        });

        await Promise.all(promises);

        // Sort discussion by time (newer first).
        offlineDiscussions.sort((a, b) => b.timecreated - a.timecreated);

        this.discussions.setOfflineDiscussions(offlineDiscussions);
    }

    /**
     * Convenience function to get forum discussions.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchDiscussions(refresh: boolean): Promise<void> {
        const forum = this.forum!;
        this.discussions.fetchFailed = false;

        if (refresh) {
            this.page = 0;
        }

        const response = await AddonModForum.getDiscussions(forum.id, {
            cmId: forum.cmid,
            sortOrder: this.selectedSortOrder!.value,
            page: this.page,
        });
        let discussions = response.discussions;

        if (this.usesGroups) {
            discussions = await AddonModForum.formatDiscussionsGroups(forum.cmid, discussions);
        }

        // Hide author for first post and type single.
        if (forum.type === 'single') {
            for (const discussion of discussions) {
                if (discussion.userfullname && discussion.parent === 0) {
                    discussion.userfullname = false;
                    break;
                }
            }
        }

        // If any discussion has unread posts, the whole forum is being tracked.
        if (typeof forum.istracked === 'undefined' && !this.trackPosts) {
            for (const discussion of discussions) {
                if (discussion.numunread > 0) {
                    this.trackPosts = true;
                    break;
                }
            }
        }

        if (this.page === 0) {
            this.discussions.setOnlineDiscussions(discussions, response.canLoadMore);
        } else {
            this.discussions.setItems(this.discussions.items.concat(discussions), response.canLoadMore);
        }

        this.page++;

        // Check if there are replies for discussions stored in offline.
        const hasOffline = await AddonModForumOffline.hasForumReplies(forum.id);

        this.hasOffline = this.hasOffline || hasOffline;

        if (hasOffline) {
            // Only update new fetched discussions.
            const promises = discussions.map(async (discussion) => {
                // Get offline discussions.
                const replies = await AddonModForumOffline.getDiscussionReplies(discussion.discussion);

                discussion.numreplies = Number(discussion.numreplies) + replies.length;
            });

            await Promise.all(promises);
        }
    }

    /**
     * Convenience function to load more forum discussions.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @return Promise resolved when done.
     */
    async fetchMoreDiscussions(complete: () => void): Promise<void> {
        try {
            await this.fetchDiscussions(false);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_forum.errorgetforum', true);

            this.discussions.fetchFailed = true;
        } finally {
            complete();
        }
    }

    /**
     * Convenience function to fetch the sort order preference.
     *
     * @return Promise resolved when done.
     */
    protected async fetchSortOrderPreference(): Promise<void> {
        const getSortOrder = async () => {
            if (!this.sortingAvailable) {
                return null;
            }

            const value = await CoreUtils.ignoreErrors(
                CoreUser.getUserPreference(AddonModForumProvider.PREFERENCE_SORTORDER),
            );

            return value ? parseInt(value, 10) : null;
        };

        const value = await getSortOrder();

        this.selectedSortOrder = this.sortOrders.find(sortOrder => sortOrder.value === value) || this.sortOrders[0];
        this.sortOrderSelectorModalOptions.componentProps!.selected = this.selectedSortOrder.value;
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModForum.invalidateForumData(this.courseId));

        if (this.forum) {
            promises.push(AddonModForum.invalidateDiscussionsList(this.forum.id));
            promises.push(CoreGroups.invalidateActivityGroupMode(this.forum.cmid));
            promises.push(AddonModForum.invalidateAccessInformation(this.forum.id));
        }

        if (this.sortingAvailable) {
            promises.push(CoreUser.invalidateUserPreference(AddonModForumProvider.PREFERENCE_SORTORDER));
        }

        await Promise.all(promises);
    }

    /**
     * Performs the sync of the activity.
     *
     * @return Promise resolved when done.
     */
    protected sync(): Promise<AddonModForumSyncResult> {
        return AddonModForumPrefetchHandler.sync(this.module, this.courseId);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param result Data returned on the sync function.
     * @return Whether it succeed or not.
     */
    protected hasSyncSucceed(result: AddonModForumSyncResult): boolean {
        return result.updated;
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @return True if refresh is needed, false otherwise.
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
    protected eventReceived(
        isNewDiscussion: boolean,
        data: AddonModForumNewDiscussionData | AddonModForumReplyDiscussionData,
    ): void {
        if ((this.forum && this.forum.id === data.forumId) || data.cmId === this.module.id) {
            this.showLoadingAndRefresh(false).finally(() => {
                // If it's a new discussion in tablet mode, try to open it.
                if (isNewDiscussion && CoreScreen.isTablet) {
                    const newDiscussionData = data as AddonModForumNewDiscussionData;
                    const discussion = this.discussions.items.find(disc => {
                        if (this.discussions.isOfflineDiscussion(disc)) {
                            return disc.timecreated === newDiscussionData.discTimecreated;
                        }

                        if (this.discussions.isOnlineDiscussion(disc)) {
                            return CoreArray.contains(newDiscussionData.discussionIds ?? [], disc.discussion);
                        }

                        return false;
                    });

                    if (discussion || !this.discussions.empty) {
                        this.discussions.select(discussion ?? this.discussions.items[0]);
                    }
                }
            });

            // Check completion since it could be configured to complete once the user adds a new discussion or replies.
            CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
        }
    }

    /**
     * Opens the new discussion form.
     *
     * @param timeCreated Creation time of the offline discussion.
     */
    openNewDiscussion(): void {
        this.discussions.select({ newDiscussion: true });
    }

    /**
     * Changes the sort order.
     *
     * @param sortOrder Sort order new data.
     */
    async setSortOrder(sortOrder: AddonModForumSortOrder): Promise<void> {
        if (sortOrder.value != this.selectedSortOrder?.value) {
            this.selectedSortOrder = sortOrder;
            this.sortOrderSelectorModalOptions.componentProps!.selected = this.selectedSortOrder.value;
            this.page = 0;

            try {
                await CoreUser.setUserPreference(AddonModForumProvider.PREFERENCE_SORTORDER, sortOrder.value.toFixed(0));
                await this.showLoadingAndFetch();
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'Error updating preference.');
            }
        }
    }

    /**
     * Display the sort order selector modal.
     */
    async showSortOrderSelector(): Promise<void> {
        const modalData = await CoreDomUtils.openModal<AddonModForumSortOrder>(this.sortOrderSelectorModalOptions);

        if (modalData) {
            this.setSortOrder(modalData);
        }
    }

    /**
     * Show the context menu.
     *
     * @param event Click Event.
     * @param discussion Discussion.
     */
    async showOptionsMenu(event: Event, discussion: AddonModForumDiscussion): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const popoverData = await CoreDomUtils.openPopover<{ action?: string; value: boolean }>({
            component: AddonModForumDiscussionOptionsMenuComponent,
            componentProps: {
                discussion,
                forumId: this.forum!.id,
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

}

/**
 * Type to select the new discussion form.
 */
type NewDiscussionForm = { newDiscussion: true };

/**
 * Type of items that can be held by the discussions manager.
 */
type DiscussionItem = AddonModForumDiscussion | AddonModForumOfflineDiscussion | NewDiscussionForm;

/**
 * Discussions manager.
 */
class AddonModForumDiscussionsManager extends CorePageItemsListManager<DiscussionItem> {

    onlineLoaded = false;
    fetchFailed = false;

    private discussionsPathPrefix: string;
    private component: AddonModForumIndexComponent;

    constructor(pageComponent: unknown, component: AddonModForumIndexComponent, discussionsPathPrefix: string) {
        super(pageComponent);

        this.component = component;
        this.discussionsPathPrefix = discussionsPathPrefix;
    }

    get loaded(): boolean {
        return super.loaded && (this.onlineLoaded || this.fetchFailed);
    }

    get onlineDiscussions(): AddonModForumDiscussion[] {
        return this.items.filter(discussion => this.isOnlineDiscussion(discussion)) as AddonModForumDiscussion[];
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(discussion: DiscussionItem): Params {
        return {
            courseId: this.component.courseId,
            cmId: this.component.module.id,
            forumId: this.component.forum!.id,
            ...(this.isOnlineDiscussion(discussion) ? { discussion, trackPosts: this.component.trackPosts } : {}),
        };
    }

    /**
     * Type guard to infer NewDiscussionForm objects.
     *
     * @param discussion Item to check.
     * @return Whether the item is a new discussion form.
     */
    isNewDiscussionForm(discussion: DiscussionItem): discussion is NewDiscussionForm {
        return 'newDiscussion' in discussion;
    }

    /**
     * Type guard to infer AddonModForumDiscussion objects.
     *
     * @param discussion Item to check.
     * @return Whether the item is an online discussion.
     */
    isOfflineDiscussion(discussion: DiscussionItem): discussion is AddonModForumOfflineDiscussion {
        return !this.isNewDiscussionForm(discussion)
            && !this.isOnlineDiscussion(discussion);
    }

    /**
     * Type guard to infer AddonModForumDiscussion objects.
     *
     * @param discussion Item to check.
     * @return Whether the item is an online discussion.
     */
    isOnlineDiscussion(discussion: DiscussionItem): discussion is AddonModForumDiscussion {
        return 'id' in discussion;
    }

    /**
     * Update online discussion items.
     *
     * @param onlineDiscussions Online discussions
     */
    setOnlineDiscussions(onlineDiscussions: AddonModForumDiscussion[], hasMoreItems: boolean = false): void {
        const otherDiscussions = this.items.filter(discussion => !this.isOnlineDiscussion(discussion));

        this.setItems(otherDiscussions.concat(onlineDiscussions), hasMoreItems);
        this.onlineLoaded = true;
    }

    /**
     * Update offline discussion items.
     *
     * @param offlineDiscussions Offline discussions
     */
    setOfflineDiscussions(offlineDiscussions: AddonModForumOfflineDiscussion[]): void {
        const otherDiscussions = this.items.filter(discussion => !this.isOfflineDiscussion(discussion));

        this.setItems((offlineDiscussions as DiscussionItem[]).concat(otherDiscussions), this.hasMoreItems);
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(discussion: DiscussionItem): string {
        const getRelativePath = () => {
            if (this.isOnlineDiscussion(discussion)) {
                return discussion.discussion;
            }

            if (this.isOfflineDiscussion(discussion)) {
                return `new/${discussion.timecreated}`;
            }

            return 'new/0';
        };

        return this.discussionsPathPrefix + getRelativePath();
    }

}
