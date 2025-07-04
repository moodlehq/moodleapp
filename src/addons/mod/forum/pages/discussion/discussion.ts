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
import { Component, OnDestroy, ViewChild, OnInit, AfterViewInit, ElementRef, inject } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreRatingInfo, CoreRatingProvider } from '@features/rating/services/rating';
import { CoreRatingOffline } from '@features/rating/services/rating-offline';
import { CoreRatingSyncProvider } from '@features/rating/services/rating-sync';
import { CoreUser } from '@features/user/services/user';
import { CanLeave } from '@guards/can-leave';
import { IonContent } from '@ionic/angular';
import { CoreNetwork } from '@services/network';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@singletons/utils';
import { NgZone, Translate } from '@singletons';
import { CoreDom } from '@singletons/dom';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';
import { AddonModForumDiscussionsSource } from '../../classes/forum-discussions-source';
import { AddonModForumDiscussionsSwipeManager } from '../../classes/forum-discussions-swipe-manager';
import {
    AddonModForum,
    AddonModForumAccessInformation,
    AddonModForumData,
    AddonModForumDiscussion,
    AddonModForumPost,
    AddonModForumPostFormData,
    AddonModForumChangeDiscussionData,
    AddonModForumReplyDiscussionData,
} from '../../services/forum';
import { AddonModForumHelper } from '../../services/forum-helper';
import { AddonModForumOffline } from '../../services/forum-offline';
import { AddonModForumSync } from '../../services/forum-sync';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_FORUM_AUTO_SYNCED,
    ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT,
    ADDON_MOD_FORUM_COMPONENT_LEGACY,
    ADDON_MOD_FORUM_MANUAL_SYNCED,
    ADDON_MOD_FORUM_MARK_READ_EVENT,
    ADDON_MOD_FORUM_REPLY_DISCUSSION_EVENT,
    AddonModForumType,
} from '../../constants';
import CoreCourseContentsPage from '@features/course/pages/contents/contents';
import { CoreToasts } from '@services/overlays/toasts';
import { CoreLoadings } from '@services/overlays/loadings';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreObject } from '@singletons/object';
import { CoreAlerts } from '@services/overlays/alerts';
import { AddonModForumPostComponent } from '../../components/post/post';
import { CoreSharedModule } from '@/core/shared.module';

type SortType = 'flat-newest' | 'flat-oldest' | 'nested';

type Post = AddonModForumPost & { children?: Post[] };

/**
 * Page that displays a forum discussion.
 */
@Component({
    selector: 'page-addon-mod-forum-discussion',
    templateUrl: 'discussion.html',
    styleUrl: 'discussion.scss',
    imports: [
        CoreSharedModule,
        AddonModForumPostComponent,
    ],
})
export default class AddonModForumDiscussionPage implements OnInit, AfterViewInit, OnDestroy, CanLeave {

    protected splitView = inject(CoreSplitViewComponent, { optional: true });
    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected route = inject(ActivatedRoute);
    protected courseContentsPage = inject(CoreCourseContentsPage, { optional: true });

    @ViewChild(IonContent) content!: IonContent;

    courseId?: number;
    discussionId!: number;
    forum: Partial<AddonModForumData> = {};
    accessInfo: AddonModForumAccessInformation = {};
    discussion?: AddonModForumDiscussion;
    discussions?: AddonModForumDiscussionDiscussionsSwipeManager;
    startingPost?: Post;
    posts: Post[] = [];
    discussionLoaded = false;
    postSubjects!: { [id: string]: string };
    isOnline!: boolean;
    postHasOffline!: boolean;
    sort: SortType = 'nested';
    trackPosts!: boolean;
    formData: AddonModForumSharedPostFormData = {
        replyingTo: 0,
        isEditing: false,
        subject: '',
        message: null,
        files: [],
        isprivatereply: false,
    };

    originalData: Omit<AddonModForumPostFormData, 'id'> = {
        subject: null,
        message: null,
        files: [],
        isprivatereply: false,
    };

    refreshIcon = CoreConstants.ICON_LOADING;
    syncIcon = CoreConstants.ICON_LOADING;
    discussionStr = '';
    component = ADDON_MOD_FORUM_COMPONENT_LEGACY;
    cmId?: number;
    canPin = false;
    availabilityMessage: string | null = null;
    showQAMessage = false;
    leavingPage = false;
    externalUrl?: string;

    protected forumId?: number;
    protected postId?: number;
    protected parent?: number;
    protected onlineObserver?: Subscription;
    protected syncObserver?: CoreEventObserver;
    protected syncManualObserver?: CoreEventObserver;

    ratingInfo?: CoreRatingInfo;
    hasOfflineRatings = false;
    protected ratingOfflineObserver?: CoreEventObserver;
    protected ratingSyncObserver?: CoreEventObserver;
    protected changeDiscObserver?: CoreEventObserver;

    get isMobile(): boolean {
        return CoreScreen.isMobile;
    }

    async ngOnInit(): Promise<void> {
        try {
            const routeData = CoreNavigator.getRouteData(this.route);
            this.courseId = CoreNavigator.getRouteNumberParam('courseId');
            this.cmId = CoreNavigator.getRouteNumberParam('cmId');
            this.forumId = CoreNavigator.getRouteNumberParam('forumId');
            this.discussion = CoreNavigator.getRouteParam<AddonModForumDiscussion>('discussion');
            this.discussionId = this.discussion
                ? this.discussion.discussion
                : CoreNavigator.getRequiredRouteNumberParam('discussionId');
            this.trackPosts = CoreNavigator.getRouteBooleanParam('trackPosts') || false;
            this.postId = CoreNavigator.getRouteNumberParam('postId');
            this.parent = CoreNavigator.getRouteNumberParam('parent');

            if (this.courseId && this.cmId && (routeData.swipeEnabled ?? true)) {
                this.discussions = new AddonModForumDiscussionDiscussionsSwipeManager(
                    CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                        AddonModForumDiscussionsSource,
                        [this.courseId, this.cmId, routeData.discussionsPathPrefix ?? ''],
                    ),
                );

                await this.discussions.start();
            }
        } catch (error) {
            CoreAlerts.showError(error);

            this.goBack();

            return;
        }

        const currentSite = CoreSites.getCurrentSite();
        this.isOnline = CoreNetwork.isOnline();
        this.externalUrl = currentSite && currentSite.shouldDisplayInformativeLinks() ?
            currentSite.createSiteUrl('/mod/forum/discuss.php', { d: this.discussionId.toString() }) :
            undefined;
        this.onlineObserver = CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreNetwork.isOnline();
            });
        });

        this.discussionStr = Translate.instant('addon.mod_forum.discussion');
    }

    /**
     * View loaded.
     */
    async ngAfterViewInit(): Promise<void> {
        this.sort = this.parent
            ? 'nested' // Force nested order.
            : await this.getUserSort();

        await this.fetchPosts(true, false, true);

        const scrollTo = this.postId || this.parent;
        if (scrollTo) {
            // Scroll to the post.
            CoreDom.scrollToElement(
                this.element,
                `#addon-mod_forum-post-${scrollTo}`,
            );
        }
    }

    /**
     * User entered the page that contains the component.
     */
    async ionViewDidEnter(): Promise<void> {
        if (this.syncObserver) {
            // Already setup.
            return;
        }

        // The discussion object was not passed as parameter.
        if (!this.discussion) {
            await this.loadDiscussion(this.discussionId, this.forumId, this.cmId);
        }

        const discussion = this.discussion;

        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = CoreEvents.on(ADDON_MOD_FORUM_AUTO_SYNCED, data => {
            if (data.forumId == this.forumId && this.discussionId == data.discussionId
                    && data.userId == CoreSites.getCurrentSiteUserId()) {
                // Refresh the data.
                this.discussionLoaded = false;
                this.refreshPosts();
            }
        }, CoreSites.getCurrentSiteId());

        // Refresh data if this forum discussion is synchronized from discussions list.
        this.syncManualObserver = CoreEvents.on(ADDON_MOD_FORUM_MANUAL_SYNCED, data => {
            if (data.source != 'discussion' && data.forumId == this.forumId &&
                    data.userId == CoreSites.getCurrentSiteUserId()) {
                // Refresh the data.
                this.discussionLoaded = false;
                this.refreshPosts();
            }
        }, CoreSites.getCurrentSiteId());

        // Invalidate discussion list if it was not read.
        if (this.forumId && discussion && discussion.numunread > 0) {
            AddonModForum.invalidateDiscussionsList(this.forumId);
        }

        // Listen for offline ratings saved and synced.
        this.ratingOfflineObserver = CoreEvents.on(CoreRatingProvider.RATING_SAVED_EVENT, (data) => {
            if (data.component == 'mod_forum' && data.ratingArea == 'post' && data.contextLevel == ContextLevel.MODULE &&
                    data.instanceId == this.cmId && data.itemSetId == this.discussionId) {
                this.hasOfflineRatings = true;
            }
        });

        this.ratingSyncObserver = CoreEvents.on(CoreRatingSyncProvider.SYNCED_EVENT, async (data) => {
            if (data.component == 'mod_forum' && data.ratingArea == 'post' && data.contextLevel == ContextLevel.MODULE &&
                    data.instanceId == this.cmId && data.itemSetId == this.discussionId) {
                this.hasOfflineRatings = false;
            }
        });

        this.changeDiscObserver = CoreEvents.on(ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT, data => {
            if (discussion && this.forumId && (this.forumId === data.forumId || data.cmId === this.cmId)) {
                AddonModForum.invalidateDiscussionsList(this.forumId).finally(() => {
                    if (data.locked !== undefined) {
                        discussion.locked = data.locked;
                    }
                    if (data.pinned !== undefined) {
                        discussion.pinned = data.pinned;
                    }
                    if (data.starred !== undefined) {
                        discussion.starred = data.starred;
                    }

                    if (data.deleted !== undefined && data.deleted) {
                        if (!data.post?.parentid) {
                            this.goBack();
                        } else {
                            this.discussionLoaded = false;
                            this.refreshPosts();
                        }
                    }
                });
            }
        });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @returns Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (AddonModForumHelper.hasPostDataChanged(this.formData, this.originalData)) {
            // Show confirmation if some data has been modified.
            await CoreAlerts.confirmLeaveWithChanges();
        }

        // Delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(this.formData.files);

        this.leavingPage = true;

        return true;
    }

    /**
     * Helper function to go back.
     */
    protected goBack(): void {
        if (this.leavingPage) {
            return;
        }

        if (this.splitView?.outletActivated) {
            CoreNavigator.navigate((this.courseContentsPage ? '../' : '') + '../');
        } else {
            CoreNavigator.back();
        }
    }

    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.syncObserver?.off();
        this.syncManualObserver?.off();
        this.ratingOfflineObserver?.off();
        this.ratingSyncObserver?.off();
        this.changeDiscObserver?.off();
        delete this.syncObserver;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.onlineObserver?.unsubscribe();
        this.discussions?.destroy();
    }

    /**
     * Get sort type configured by the current user.
     *
     * @returns Promise resolved with the sort type.
     */
    protected async getUserSort(): Promise<SortType> {
        try {
            const value = await CoreSites.getRequiredCurrentSite().getLocalSiteConfig<SortType>('AddonModForumDiscussionSort');

            return value;
        } catch {
            try {
                const value = await CoreUser.getUserPreference('forum_displaymode');

                switch (Number(value)) {
                    case 1:
                        return 'flat-oldest';
                    case -1:
                        return 'flat-newest';
                    case 3:
                        return 'nested';
                    case 2: // Threaded not implemented.
                    default:
                        // Not set, use default sort.
                        // @TODO add fallback to $CFG->forum_displaymode.
                }
            } catch {
                // Ignore errors.
            }
        }

        return 'flat-oldest';
    }

    /**
     * Convenience function to get the forum.
     *
     * @returns Promise resolved with the forum.
     */
    protected fetchForum(): Promise<AddonModForumData> {
        if (this.courseId && this.cmId) {
            return AddonModForum.getForum(this.courseId, this.cmId);
        }

        if (this.courseId && this.forumId) {
            return AddonModForum.getForumById(this.courseId, this.forumId);
        }

        throw new Error('Cannot get the forum');
    }

    /**
     * Convenience function to get the posts.
     *
     * @param sync Whether to try to synchronize the discussion.
     * @param showErrors Whether to show errors in a modal.
     * @param forceMarkAsRead Whether to mark all posts as read.
     * @returns Promise resolved when done.
     */
    protected async fetchPosts(sync?: boolean, showErrors?: boolean, forceMarkAsRead?: boolean): Promise<void> {
        let onlinePosts: AddonModForumPost[] = [];
        const offlineReplies: AddonModForumPost[] = [];
        let hasUnreadPosts = false;

        try {
            if (sync) {
                // Try to synchronize the forum.
                await CorePromiseUtils.ignoreErrors(this.syncDiscussion(!!showErrors));
            }

            const response = await AddonModForum.getDiscussionPosts(this.discussionId, { cmId: this.cmId });
            const replies = await AddonModForumOffline.getDiscussionReplies(this.discussionId);
            this.ratingInfo = response.ratinginfo;

            onlinePosts = response.posts;
            this.courseId = response.courseid || this.courseId;
            this.forumId = response.forumid || this.forumId;

            // Check if there are responses stored in offline.
            this.postHasOffline = !!replies.length;
            const convertPromises: Promise<void>[] = [];

            // Index posts to allow quick access. Also check unread field.
            const onlinePostsMap: Record<string, AddonModForumPost> = {};
            onlinePosts.forEach((post) => {
                onlinePostsMap[post.id] = post;
                hasUnreadPosts = hasUnreadPosts || !!post.unread;
            });

            replies.forEach((offlineReply) => {
                // If we don't have forumId and courseId, get it from the post.
                if (!this.forumId) {
                    this.forumId = offlineReply.forumid;
                }
                if (!this.courseId) {
                    this.courseId = offlineReply.courseid;
                }

                convertPromises.push(
                    AddonModForumHelper.instance
                        .convertOfflineReplyToOnline(offlineReply)
                        .then(async reply => {
                            offlineReplies.push(reply);

                            // Disable reply of the parent. Reply in offline to the same post is not allowed, edit instead.
                            reply.parentid && (onlinePostsMap[reply.parentid].capabilities.reply = false);

                            return;
                        }),
                );
            });

            await Promise.all(convertPromises);

            // Convert back to array.
            onlinePosts = CoreObject.toArray(onlinePostsMap);

            let posts = offlineReplies.concat(onlinePosts);

            this.startingPost = AddonModForum.extractStartingPost(posts);

            // If sort type is nested, normal sorting is disabled and nested posts will be displayed.
            if (this.sort == 'nested') {
                // Sort first by creation date to make format tree work.
                AddonModForum.sortDiscussionPosts(posts, 'ASC');

                const rootId = this.startingPost ? this.startingPost.id : (this.discussion ? this.discussion.id : 0);
                posts = CoreUtils.formatTree(posts, 'parentid', 'id', rootId);
            } else {
                // Set default reply subject.
                const direction = this.sort == 'flat-newest' ? 'DESC' : 'ASC';
                AddonModForum.sortDiscussionPosts(posts, direction);
            }

            try {
                // Now try to get the forum.
                const forum = await this.fetchForum();
                // "forum.istracked" is more reliable than "trackPosts".
                if (forum.istracked !== undefined) {
                    this.trackPosts = forum.istracked;
                }

                this.forumId = forum.id;
                this.cmId = forum.cmid;
                this.courseId = forum.course;
                this.forum = forum;
                this.availabilityMessage = AddonModForumHelper.getAvailabilityMessage(forum);

                const promises: Promise<void>[] = [];

                promises.push(
                    AddonModForum.instance
                        .getAccessInformation(this.forumId, { cmId: this.cmId })
                        .then(async accessInfo => {
                            this.accessInfo = accessInfo;

                            // Disallow replying if cut-off date is reached and the user has not the capability to override it.
                            // Just in case the posts were fetched from WS when the cut-off date was not reached but it is now.
                            if (AddonModForumHelper.isCutoffDateReached(forum) && !accessInfo.cancanoverridecutoff) {
                                posts.forEach((post) => {
                                    post.capabilities.reply = false;
                                });
                            }

                            // Show Q&A message if user hasn't posted.
                            const currentUserId = CoreSites.getCurrentSiteUserId();
                            this.showQAMessage = forum.type === AddonModForumType.QANDA && !accessInfo.canviewqandawithoutposting &&
                                !posts.some(post => post.author.id === currentUserId);

                            return;
                        }),
                );

                // The discussion object was not passed as parameter and there is no starting post.
                if (!this.discussion) {
                    promises.push(this.loadDiscussion(this.discussionId, this.forumId, this.cmId));
                }

                await Promise.all(promises);
            } catch {
                // Ignore errors.
            }

            if (!this.discussion && !this.startingPost) {
                // The discussion object was not passed as parameter and there is no starting post. Should not happen.
                throw new Error('Invalid forum discussion.');
            }

            if (this.startingPost && this.startingPost.author && this.forum.type === AddonModForumType.SINGLE) {
                // Hide author and groups for first post and type single.
                delete this.startingPost.author.fullname;
                delete this.startingPost.author.groups;
            }

            this.posts = posts;
            this.postSubjects = this.getAllPosts().reduce(
                (postSubjects, post) => {
                    postSubjects[post.id] = post.subject;

                    return postSubjects;
                },
                this.startingPost
                    ? { [this.startingPost.id]: this.startingPost.subject }
                    : {},
            );

            if (AddonModForum.isSetPinStateAvailableForSite() && this.forumId) {
                // Use the canAddDiscussion WS to check if the user can pin discussions.
                try {
                    const response = await AddonModForum.canAddDiscussionToAll(this.forumId, { cmId: this.cmId });

                    this.canPin = !!response.canpindiscussions;
                } catch {
                    this.canPin = false;
                }
            } else {
                this.canPin = false;
            }

            this.hasOfflineRatings =
                await CoreRatingOffline.hasRatings('mod_forum', 'post', ContextLevel.MODULE, this.cmId, this.discussionId);
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            this.discussionLoaded = true;
            this.refreshIcon = CoreConstants.ICON_REFRESH;
            this.syncIcon = CoreConstants.ICON_SYNC;

            if (forceMarkAsRead || (hasUnreadPosts && this.trackPosts)) {
                // Add log in Moodle and mark unread posts as readed.
                this.logDiscussionView(forceMarkAsRead);
            }
        }
    }

    /**
     * Convenience function to load discussion.
     *
     * @param discussionId Discussion ID.
     * @param forumId Forum ID.
     * @param cmId Forum cmid.
     * @returns Promise resolved when done.
     */
    protected async loadDiscussion(discussionId: number, forumId?: number, cmId?: number): Promise<void> {
        // Fetch the discussion if not passed as parameter.
        if (this.discussion || !forumId || ! cmId) {
            return;
        }

        this.discussion = await AddonModForumHelper.getDiscussionById(forumId, cmId, discussionId);
        this.discussionId = this.discussion.discussion;
    }

    /**
     * Tries to synchronize the posts discussion.
     *
     * @param showErrors Whether to show errors in a modal.
     * @returns Promise resolved when done.
     */
    protected async syncDiscussion(showErrors: boolean): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(
            AddonModForumSync.instance
                .syncDiscussionReplies(this.discussionId)
                .then((result) => {
                    if (result.warnings && result.warnings.length) {
                        CoreAlerts.show({ message: result.warnings[0] });
                    }

                    if (result && result.updated && this.forumId) {
                        // Sync successful, send event.
                        CoreEvents.trigger(ADDON_MOD_FORUM_MANUAL_SYNCED, {
                            forumId: this.forumId,
                            userId: CoreSites.getCurrentSiteUserId(),
                            source: 'discussion',
                        }, CoreSites.getCurrentSiteId());
                    }

                    return;
                }),
        );

        promises.push(
            AddonModForumSync.instance
                .syncRatings(this.cmId, this.discussionId)
                .then((result) => {
                    if (result.warnings && result.warnings.length) {
                        CoreAlerts.show({ message: result.warnings[0] });
                    }

                    return;
                }),
        );

        try {
            await Promise.all(promises);
        } catch (error) {
            if (showErrors) {
                CoreAlerts.showError(error, { default: Translate.instant('core.errorsync') });
            }

            throw new Error('Failed syncing discussion');
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param showErrors If show errors to the user of hide them.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement | null, done?: () => void, showErrors: boolean = false): Promise<void> {
        if (this.discussionLoaded) {
            await this.refreshPosts(true, showErrors).finally(() => {
                refresher?.complete();
                done && done();
            });
        }
    }

    /**
     * Refresh posts.
     *
     * @param sync Whether to try to synchronize the discussion.
     * @param showErrors Whether to show errors in a modal.
     * @returns Promise resolved when done.
     */
    async refreshPosts(sync?: boolean, showErrors?: boolean): Promise<void> {
        this.content.scrollToTop();
        this.refreshIcon = CoreConstants.ICON_LOADING;
        this.syncIcon = CoreConstants.ICON_LOADING;

        const promises: Promise<void>[] = [];

        this.courseId && promises.push(AddonModForum.invalidateForumData(this.courseId));
        promises.push(AddonModForum.invalidateDiscussionPosts(this.discussionId, this.forumId));
        this.forumId && promises.push(AddonModForum.invalidateAccessInformation(this.forumId));
        this.forumId && promises.push(AddonModForum.invalidateCanAddDiscussion(this.forumId));

        await CorePromiseUtils.allPromisesIgnoringErrors(promises);

        await this.fetchPosts(sync, showErrors);
    }

    /**
     * Function to change posts sorting
     *
     * @param type Sort type.
     * @returns Promised resolved when done.
     */
    changeSort(type: SortType): Promise<void> {
        this.discussionLoaded = false;
        this.sort = type;
        CoreSites.getRequiredCurrentSite().setLocalSiteConfig('AddonModForumDiscussionSort', this.sort);
        this.content.scrollToTop();

        return this.fetchPosts();
    }

    /**
     * Lock or unlock the discussion.
     *
     * @param locked True to lock the discussion, false to unlock.
     */
    async setLockState(locked: boolean): Promise<void> {
        if (!this.discussion || !this.forumId || !this.cmId) {
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            const response = await AddonModForum.setLockState(this.forumId, this.discussionId, locked);
            this.discussion.locked = response.locked;

            const data: AddonModForumChangeDiscussionData = {
                forumId: this.forumId,
                discussionId: this.discussionId,
                cmId: this.cmId,
                locked: this.discussion.locked,
            };
            CoreEvents.trigger(ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT, data, CoreSites.getCurrentSiteId());

            CoreToasts.show({
                message: 'addon.mod_forum.lockupdated',
                translateMessage: true,
            });
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Pin or unpin the discussion.
     *
     * @param pinned True to pin the discussion, false to unpin it.
     */
    async setPinState(pinned: boolean): Promise<void> {
        if (!this.discussion || !this.forumId || !this.cmId) {
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            await AddonModForum.setPinState(this.discussionId, pinned);

            this.discussion.pinned = pinned;

            const data: AddonModForumChangeDiscussionData = {
                forumId: this.forumId,
                discussionId: this.discussionId,
                cmId: this.cmId,
                pinned: this.discussion.pinned,
            };
            CoreEvents.trigger(ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT, data, CoreSites.getCurrentSiteId());

            CoreToasts.show({
                message: 'addon.mod_forum.pinupdated',
                translateMessage: true,
            });
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Star or unstar the discussion.
     *
     * @param starred True to star the discussion, false to unstar it.
     */
    async toggleFavouriteState(starred: boolean): Promise<void> {
        if (!this.discussion || !this.forumId || !this.cmId) {
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            await AddonModForum.toggleFavouriteState(this.discussionId, starred);

            this.discussion.starred = starred;

            const data: AddonModForumChangeDiscussionData = {
                forumId: this.forumId,
                discussionId: this.discussionId,
                cmId: this.cmId,
                starred: this.discussion.starred,
            };
            CoreEvents.trigger(ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT, data, CoreSites.getCurrentSiteId());

            CoreToasts.show({
                message: 'addon.mod_forum.favouriteupdated',
                translateMessage: true,
            });
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * New post added.
     */
    postListChanged(): void {
        if (!this.forumId || !this.cmId) {
            return;
        }

        // Trigger an event to notify a new reply.
        const data: AddonModForumReplyDiscussionData = {
            forumId: this.forumId,
            discussionId: this.discussionId,
            cmId: this.cmId,
        };
        CoreEvents.trigger(ADDON_MOD_FORUM_REPLY_DISCUSSION_EVENT, data, CoreSites.getCurrentSiteId());

        this.discussionLoaded = false;
        this.refreshPosts().finally(() => {
            this.discussionLoaded = true;
        });
    }

    /**
     * Get all the posts contained in the discussion.
     *
     * @returns Array containing all the posts of the discussion.
     */
    protected getAllPosts(): Post[] {
        const allPosts = this.posts.map(post => this.flattenPostHierarchy(post));

        return allPosts.flat();
    }

    /**
     * Flatten a post's hierarchy into an array.
     *
     * @param parent Parent post.
     * @returns Array containing all the posts within the hierarchy (including the parent).
     */
    protected flattenPostHierarchy(parent: Post): Post[] {
        const posts = [parent];
        const children = parent.children || [];

        for (const child of children) {
            posts.push(...this.flattenPostHierarchy(child));
        }

        return posts;
    }

    /**
     * Log discussion as viewed. This will also mark the posts as read.
     *
     * @param logAnalytics Whether to log analytics too or not.
     */
    protected async logDiscussionView(logAnalytics = false): Promise<void> {
        await CorePromiseUtils.ignoreErrors(AddonModForum.logDiscussionView(this.discussionId, this.forumId || -1));

        if (logAnalytics) {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_forum_view_forum_discussion',
                name: this.startingPost?.subject ?? this.forum.name ?? '',
                data: { id: this.discussionId, forumid: this.forumId, category: 'forum' },
                url: `/mod/forum/discuss.php?d=${this.discussionId}` + (this.postId ? `#p${this.postId}` : ''),
            });
        }

        if (!this.courseId || !this.cmId || !this.trackPosts) {
            return;
        }

        // Trigger mark read posts.
        CoreEvents.trigger(ADDON_MOD_FORUM_MARK_READ_EVENT, {
            courseId: this.courseId,
            moduleId: this.cmId,
        }, CoreSites.getCurrentSiteId());
    }

}

/**
 * Reply data shared by post.
 */
export type AddonModForumSharedPostFormData = Omit<AddonModForumPostFormData, 'id'> & {
    id?: number; // ID when editing an online reply.
    syncId?: string; // Sync ID if some post has blocked synchronization.
};

/**
 * Helper to manage swiping within a collection of discussions.
 */
class AddonModForumDiscussionDiscussionsSwipeManager extends AddonModForumDiscussionsSwipeManager {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        const params = CoreNavigator.getRouteParams(route);

        return this.getSource().DISCUSSIONS_PATH_PREFIX + params.discussionId;
    }

}
