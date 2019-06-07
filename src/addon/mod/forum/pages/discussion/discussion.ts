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

import { Component, Optional, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { IonicPage, NavParams, Content } from 'ionic-angular';
import { Network } from '@ionic-native/network';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreRatingProvider, CoreRatingInfo } from '@core/rating/providers/rating';
import { CoreRatingOfflineProvider } from '@core/rating/providers/offline';
import { CoreRatingSyncProvider } from '@core/rating/providers/sync';
import { AddonModForumProvider } from '../../providers/forum';
import { AddonModForumOfflineProvider } from '../../providers/offline';
import { AddonModForumHelperProvider } from '../../providers/helper';
import { AddonModForumSyncProvider } from '../../providers/sync';

type SortType = 'flat-newest' | 'flat-oldest' | 'nested';

/**
 * Page that displays a forum discussion.
 */
@IonicPage({ segment: 'addon-mod-forum-discussion' })
@Component({
    selector: 'page-addon-mod-forum-discussion',
    templateUrl: 'discussion.html',
})
export class AddonModForumDiscussionPage implements OnDestroy {
    @ViewChild(Content) content: Content;

    courseId: number;
    discussionId: number;
    forum: any;
    accessInfo: any;
    discussion: any;
    posts: any[];
    discussionLoaded = false;
    defaultSubject: string;
    isOnline: boolean;
    isSplitViewOn: boolean;
    postHasOffline: boolean;
    sort: SortType = 'flat-oldest';
    trackPosts: boolean;
    replyData = {
        replyingTo: 0,
        isEditing: false,
        subject: '',
        message: null, // Null means empty or just white space.
        files: [],
        isprivatereply: false,
    };
    originalData = {
        subject: null, // Null means original data is not set.
        message: null, // Null means empty or just white space.
        files: [],
        isprivatereply: false,
    };
    refreshIcon = 'spinner';
    syncIcon = 'spinner';
    discussionStr = '';
    component = AddonModForumProvider.COMPONENT;
    cmId: number;
    canPin = false;
    availabilityMessage: string;

    protected forumId: number;
    protected postId: number;
    protected onlineObserver: any;
    protected syncObserver: any;
    protected syncManualObserver: any;

    ratingInfo?: CoreRatingInfo;
    hasOfflineRatings: boolean;
    protected ratingOfflineObserver: any;
    protected ratingSyncObserver: any;

    constructor(navParams: NavParams,
            network: Network,
            zone: NgZone,
            private appProvider: CoreAppProvider,
            private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider,
            private domUtils: CoreDomUtilsProvider,
            private utils: CoreUtilsProvider,
            private translate: TranslateService,
            private uploaderProvider: CoreFileUploaderProvider,
            private forumProvider: AddonModForumProvider,
            private forumOffline: AddonModForumOfflineProvider,
            private forumHelper: AddonModForumHelperProvider,
            private forumSync: AddonModForumSyncProvider,
            private ratingOffline: CoreRatingOfflineProvider,
            @Optional() private svComponent: CoreSplitViewComponent) {
        this.courseId = navParams.get('courseId');
        this.cmId = navParams.get('cmId');
        this.forumId = navParams.get('forumId');
        this.discussion = navParams.get('discussion');
        this.discussionId = this.discussion ? this.discussion.discussion : navParams.get('discussionId');
        this.trackPosts = navParams.get('trackPosts');
        this.postId = navParams.get('postId');

        this.isOnline = this.appProvider.isOnline();
        this.onlineObserver = network.onchange().subscribe((online) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.isOnline = this.appProvider.isOnline();
            });
        });
        this.isSplitViewOn = this.svComponent && this.svComponent.isOn();

        this.discussionStr = translate.instant('addon.mod_forum.discussion');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchPosts(true, false, true).then(() => {
            if (this.postId) {
                // Scroll to the post.
                setTimeout(() => {
                    this.domUtils.scrollToElementBySelector(this.content, '#addon-mod_forum-post-' + this.postId);
                });
            }
        });
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = this.eventsProvider.on(AddonModForumSyncProvider.AUTO_SYNCED, (data) => {
            if (data.forumId == this.forumId && this.discussionId == data.discussionId
                    && data.userId == this.sitesProvider.getCurrentSiteUserId()) {
                // Refresh the data.
                this.discussionLoaded = false;
                this.refreshPosts();
            }
        }, this.sitesProvider.getCurrentSiteId());

        // Refresh data if this forum discussion is synchronized from discussions list.
        this.syncManualObserver = this.eventsProvider.on(AddonModForumSyncProvider.MANUAL_SYNCED, (data) => {
            if (data.source != 'discussion' && data.forumId == this.forumId &&
                    data.userId == this.sitesProvider.getCurrentSiteUserId()) {
                // Refresh the data.
                this.discussionLoaded = false;
                this.refreshPosts();
            }
        }, this.sitesProvider.getCurrentSiteId());

        // Trigger view event, to highlight the current opened discussion in the split view.
        this.eventsProvider.trigger(AddonModForumProvider.VIEW_DISCUSSION_EVENT, {
            forumId: this.forumId,
            discussion: this.discussionId
        }, this.sitesProvider.getCurrentSiteId());

        // Listen for offline ratings saved and synced.
        this.ratingOfflineObserver = this.eventsProvider.on(CoreRatingProvider.RATING_SAVED_EVENT, (data) => {
            if (data.component == 'mod_forum' && data.ratingArea == 'post' && data.contextLevel == 'module' &&
                    data.instanceId == this.cmId && data.itemSetId == this.discussionId) {
                this.hasOfflineRatings = true;
            }
        });
        this.ratingSyncObserver = this.eventsProvider.on(CoreRatingSyncProvider.SYNCED_EVENT, (data) => {
            if (data.component == 'mod_forum' && data.ratingArea == 'post' && data.contextLevel == 'module' &&
                    data.instanceId == this.cmId && data.itemSetId == this.discussionId) {
                this.hasOfflineRatings = false;
            }
        });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        let promise: any;

        if (this.forumHelper.hasPostDataChanged(this.replyData, this.originalData)) {
            // Show confirmation if some data has been modified.
            promise = this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            // Delete the local files from the tmp folder.
            this.uploaderProvider.clearTmpFiles(this.replyData.files);
        });
    }

    /**
     * Convenience function to get the forum.
     *
     * @return {Promise<any>} Promise resolved with the forum.
     */
    protected fetchForum(): Promise<any> {
        if (this.courseId && this.cmId) {
            return this.forumProvider.getForum(this.courseId, this.cmId);
        } else if (this.courseId && this.forumId) {
            return this.forumProvider.getForumById(this.courseId, this.forumId);
        } else {
            // Cannot get the forum.
            return Promise.reject(null);
        }
    }

    /**
     * Convenience function to get the posts.
     *
     * @param  {boolean} [sync]            Whether to try to synchronize the discussion.
     * @param  {boolean} [showErrors]      Whether to show errors in a modal.
     * @param  {boolean} [forceMarkAsRead] Whether to mark all posts as read.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchPosts(sync?: boolean, showErrors?: boolean, forceMarkAsRead?: boolean): Promise<any> {
        let syncPromise;
        if (sync) {
            // Try to synchronize the forum.
            syncPromise = this.syncDiscussion(showErrors).catch(() => {
                // Ignore errors.
            });
        } else {
            syncPromise = Promise.resolve();
        }

        let onlinePosts = [];
        const offlineReplies = [];
        let hasUnreadPosts = false;
        let ratingInfo;

        return syncPromise.then(() => {
            return this.forumProvider.getDiscussionPosts(this.discussionId).then((response) => {
                onlinePosts = response.posts;
                ratingInfo = response.ratinginfo;
            }).then(() => {
                // Check if there are responses stored in offline.
                return this.forumOffline.getDiscussionReplies(this.discussionId).then((replies) => {
                    this.postHasOffline = !!replies.length;
                    const convertPromises = [];

                    // Index posts to allow quick access. Also check unread field.
                    const posts = {};
                    onlinePosts.forEach((post) => {
                        posts[post.id] = post;
                        hasUnreadPosts = hasUnreadPosts || !post.postread;
                    });

                    replies.forEach((offlineReply) => {
                        // If we don't have forumId and courseId, get it from the post.
                        if (!this.forumId) {
                            this.forumId = offlineReply.forumid;
                        }
                        if (!this.courseId) {
                            this.courseId = offlineReply.courseid;
                        }

                        convertPromises.push(this.forumHelper.convertOfflineReplyToOnline(offlineReply).then((reply) => {
                            offlineReplies.push(reply);

                            // Disable reply of the parent. Reply in offline to the same post is not allowed, edit instead.
                            posts[reply.parent].canreply = false;
                        }));
                    });

                    return Promise.all(convertPromises).then(() => {
                        // Convert back to array.
                        onlinePosts = this.utils.objectToArray(posts);
                    });
                });
            });
        }).then(() => {
            let posts = offlineReplies.concat(onlinePosts);

            // If sort type is nested, normal sorting is disabled and nested posts will be displayed.
            if (this.sort == 'nested') {
                // Sort first by creation date to make format tree work.
                this.forumProvider.sortDiscussionPosts(posts, 'ASC');
                posts = this.utils.formatTree(posts, 'parent', 'id', this.discussion.id);
            } else {
                // Set default reply subject.
                const direction = this.sort == 'flat-newest' ? 'DESC' : 'ASC';
                this.forumProvider.sortDiscussionPosts(posts, direction);
            }

            // Now try to get the forum.
            return this.fetchForum().then((forum) => {
                // "forum.istracked" is more reliable than "trackPosts".
                if (typeof forum.istracked != 'undefined') {
                    this.trackPosts = forum.istracked;
                }

                this.forumId = forum.id;
                this.cmId = forum.cmid;
                this.forum = forum;
                this.availabilityMessage = this.forumHelper.getAvailabilityMessage(forum);

                const promises = [];

                promises.push(this.forumProvider.getAccessInformation(this.forum.id).then((accessInfo) => {
                    this.accessInfo = accessInfo;

                    // Disallow replying if cut-off date is reached and the user has not the capability to override it.
                    // Just in case the posts were fetched from WS when the cut-off date was not reached but it is now.
                    if (this.forumHelper.isCutoffDateReached(forum) && !accessInfo.cancanoverridecutoff) {
                        posts.forEach((post) => {
                            post.canreply = false;
                        });
                    }
                }));

                // Fetch the discussion if not passed as parameter.
                if (!this.discussion) {
                    promises.push(this.forumHelper.getDiscussionById(forum.id, this.discussionId).then((discussion) => {
                        this.discussion = discussion;
                    }).catch(() => {
                        // Ignore errors.
                    }));
                }

                return Promise.all(promises);
            }).catch(() => {
                // Ignore errors.
                this.forum = {};
                this.accessInfo = {};
            }).then(() => {
                this.defaultSubject = this.translate.instant('addon.mod_forum.re') + ' ' +
                    (this.discussion ? this.discussion.subject : '');
                this.replyData.subject = this.defaultSubject;

                const startingPost = this.forumProvider.extractStartingPost(posts);
                if (startingPost) {
                    // Update discussion data from first post.
                    this.discussion = Object.assign(this.discussion || {}, startingPost);
                } else if (!this.discussion) {
                    // The discussion object was not passed as parameter and there is no starting post.
                    return Promise.reject('Invalid forum discussion.');
                }

                if (this.discussion.userfullname && this.discussion.parent == 0 && this.forum.type == 'single') {
                    // Hide author for first post and type single.
                    this.discussion.userfullname = null;
                }

                this.posts = posts;
                this.ratingInfo = ratingInfo;
            });
        }).then(() => {
            if (this.forumProvider.isSetPinStateAvailableForSite()) {
                // Use the canAddDiscussion WS to check if the user can pin discussions.
                return this.forumProvider.canAddDiscussionToAll(this.forumId).then((response) => {
                    this.canPin = !!response.canpindiscussions;
                }).catch(() => {
                    this.canPin = false;
                });
            } else {
                this.canPin = false;
            }
        }).then(() => {
            return this.ratingOffline.hasRatings('mod_forum', 'post', 'module', this.cmId, this.discussionId).then((hasRatings) => {
                this.hasOfflineRatings = hasRatings;
            });
        }).catch((message) => {
            this.domUtils.showErrorModal(message);
        }).finally(() => {
            this.discussionLoaded = true;
            this.refreshIcon = 'refresh';
            this.syncIcon = 'sync';

            if (forceMarkAsRead || (hasUnreadPosts && this.trackPosts)) {
                // // Add log in Moodle and mark unread posts as readed.
                this.forumProvider.logDiscussionView(this.discussionId, this.forumId || -1, this.forum.name).catch(() => {
                    // Ignore errors.
                }).finally(() => {
                    // Trigger mark read posts.
                    this.eventsProvider.trigger(AddonModForumProvider.MARK_READ_EVENT, {
                        courseId: this.courseId,
                        moduleId: this.cmId
                    }, this.sitesProvider.getCurrentSiteId());
                });
            }
        });
    }

    /**
     * Tries to synchronize the posts discussion.
     *
     * @param  {boolean} showErrors Whether to show errors in a modal.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected syncDiscussion(showErrors: boolean): Promise<any> {
        const promises = [];

        promises.push(this.forumSync.syncDiscussionReplies(this.discussionId).then((result) => {
            if (result.warnings && result.warnings.length) {
                this.domUtils.showErrorModal(result.warnings[0]);
            }

            if (result && result.updated) {
                // Sync successful, send event.
                this.eventsProvider.trigger(AddonModForumSyncProvider.MANUAL_SYNCED, {
                    forumId: this.forumId,
                    userId: this.sitesProvider.getCurrentSiteUserId(),
                    source: 'discussion'
                }, this.sitesProvider.getCurrentSiteId());
            }

            return result.updated;
        }));

        promises.push(this.forumSync.syncRatings(this.cmId, this.discussionId).then((result) => {
            if (result.warnings && result.warnings.length) {
                this.domUtils.showErrorModal(result.warnings[0]);
            }
        }));

        return Promise.all(promises).catch((error) => {
            if (showErrors) {
                this.domUtils.showErrorModalDefault(error, 'core.errorsync', true);
            }

            return Promise.reject(null);
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any}       [refresher] Refresher.
     * @param {Function}  [done] Function to call when done.
     * @param {boolean}   [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void, showErrors: boolean = false): Promise<any> {
        if (this.discussionLoaded) {
            return this.refreshPosts(true, showErrors).finally(() => {
                refresher && refresher.complete();
                done && done();
            });
        }

        return Promise.resolve();
    }

    /**
     * Refresh posts.
     *
     * @param  {boolean} [sync]       Whether to try to synchronize the discussion.
     * @param  {boolean} [showErrors] Whether to show errors in a modal.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshPosts(sync?: boolean, showErrors?: boolean): Promise<any> {
        this.domUtils.scrollToTop(this.content);
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';

        const promises = [
            this.forumProvider.invalidateForumData(this.courseId),
            this.forumProvider.invalidateDiscussionPosts(this.discussionId),
            this.forumProvider.invalidateAccessInformation(this.forumId),
            this.forumProvider.invalidateCanAddDiscussion(this.forumId)
        ];

        return this.utils.allPromises(promises).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.fetchPosts(sync, showErrors);
        });
    }

    /**
     * Function to change posts sorting
     *
     * @param  {SortType} type Sort type.
     * @return {Promise<any>} Promised resolved when done.
     */
    changeSort(type: SortType): Promise<any> {
        this.discussionLoaded = false;
        this.sort = type;
        this.domUtils.scrollToTop(this.content);

        return this.fetchPosts();
    }

    /**
     * Lock or unlock the discussion.
     *
     * @param {boolean} locked True to lock the discussion, false to unlock.
     */
    setLockState(locked: boolean): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);

        this.forumProvider.setLockState(this.forumId, this.discussionId, locked).then((response) => {
            this.discussion.locked = response.locked;

            const data = {
                forumId: this.forumId,
                discussionId: this.discussionId,
                cmId: this.cmId,
                locked: this.discussion.locked
            };
            this.eventsProvider.trigger(AddonModForumProvider.CHANGE_DISCUSSION_EVENT, data, this.sitesProvider.getCurrentSiteId());

            this.domUtils.showToast('addon.mod_forum.lockupdated', true);
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Pin or unpin the discussion.
     *
     * @param {boolean} pinned True to pin the discussion, false to unpin it.
     */
    setPinState(pinned: boolean): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);

        this.forumProvider.setPinState(this.discussionId, pinned).then(() => {
            this.discussion.pinned = pinned;

            const data = {
                forumId: this.forumId,
                discussionId: this.discussionId,
                cmId: this.cmId,
                pinned: this.discussion.pinned
            };
            this.eventsProvider.trigger(AddonModForumProvider.CHANGE_DISCUSSION_EVENT, data, this.sitesProvider.getCurrentSiteId());

            this.domUtils.showToast('addon.mod_forum.pinupdated', true);
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Star or unstar the discussion.
     *
     * @param {boolean} starred True to star the discussion, false to unstar it.
     */
    toggleFavouriteState(starred: boolean): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);

        this.forumProvider.toggleFavouriteState(this.discussionId, starred).then(() => {
            this.discussion.starred = starred;

            const data = {
                forumId: this.forumId,
                discussionId: this.discussionId,
                cmId: this.cmId,
                starred: this.discussion.starred
            };
            this.eventsProvider.trigger(AddonModForumProvider.CHANGE_DISCUSSION_EVENT, data, this.sitesProvider.getCurrentSiteId());

            this.domUtils.showToast('addon.mod_forum.favouriteupdated', true);
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * New post added.
     */
    postListChanged(): void {
        // Trigger an event to notify a new reply.
        const data = {
            forumId: this.forumId,
            discussionId: this.discussionId,
            cmId: this.cmId
        };
        this.eventsProvider.trigger(AddonModForumProvider.REPLY_DISCUSSION_EVENT, data, this.sitesProvider.getCurrentSiteId());

        this.discussionLoaded = false;
        this.refreshPosts().finally(() => {
            this.discussionLoaded = true;
        });
    }

    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.syncObserver && this.syncObserver.off();
        this.syncManualObserver && this.syncManualObserver.off();
        this.ratingOfflineObserver && this.ratingOfflineObserver.off();
        this.ratingSyncObserver && this.ratingSyncObserver.off();
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.onlineObserver && this.onlineObserver.unsubscribe();
    }
}
