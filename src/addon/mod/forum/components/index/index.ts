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

import { Component, Optional, Injector, ViewChild } from '@angular/core';
import { Content, ModalController, NavController } from 'ionic-angular';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreRatingProvider } from '@core/rating/providers/rating';
import { CoreRatingOfflineProvider } from '@core/rating/providers/offline';
import { CoreRatingSyncProvider } from '@core/rating/providers/sync';
import { AddonModForumProvider } from '../../providers/forum';
import { AddonModForumHelperProvider } from '../../providers/helper';
import { AddonModForumOfflineProvider } from '../../providers/offline';
import { AddonModForumSyncProvider } from '../../providers/sync';
import { AddonModForumPrefetchHandler } from '../../providers/prefetch-handler';

/**
 * Component that displays a forum entry page.
 */
@Component({
    selector: 'addon-mod-forum-index',
    templateUrl: 'addon-mod-forum-index.html',
})
export class AddonModForumIndexComponent extends CoreCourseModuleMainActivityComponent {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    component = AddonModForumProvider.COMPONENT;
    moduleName = 'forum';

    descriptionNote: string;
    forum: any;
    canLoadMore = false;
    loadMoreError = false;
    discussions = [];
    offlineDiscussions = [];
    selectedDiscussion = 0; // Disucssion ID or negative timecreated if it's an offline discussion.
    canAddDiscussion = false;
    addDiscussionText = this.translate.instant('addon.mod_forum.addanewdiscussion');
    availabilityMessage: string;

    sortingAvailable: boolean;
    sortOrders = [];
    selectedSortOrder = null;
    sortOrderSelectorExpanded = false;

    protected syncEventName = AddonModForumSyncProvider.AUTO_SYNCED;
    protected page = 0;
    protected trackPosts = false;
    protected usesGroups = false;
    protected syncManualObserver: any; // It will observe the sync manual event.
    protected replyObserver: any;
    protected newDiscObserver: any;
    protected viewDiscObserver: any;
    protected changeDiscObserver: any;

    hasOfflineRatings: boolean;
    protected ratingOfflineObserver: any;
    protected ratingSyncObserver: any;

    constructor(injector: Injector,
            @Optional() protected content: Content,
            protected navCtrl: NavController,
            protected modalCtrl: ModalController,
            protected groupsProvider: CoreGroupsProvider,
            protected userProvider: CoreUserProvider,
            protected forumProvider: AddonModForumProvider,
            protected forumHelper: AddonModForumHelperProvider,
            protected forumOffline: AddonModForumOfflineProvider,
            protected forumSync: AddonModForumSyncProvider,
            protected prefetchDelegate: CoreCourseModulePrefetchDelegate,
            protected prefetchHandler: AddonModForumPrefetchHandler,
            protected ratingOffline: CoreRatingOfflineProvider) {
        super(injector);

        this.sortingAvailable = this.forumProvider.isDiscussionListSortingAvailable();
        this.sortOrders = this.forumProvider.getAvailableSortOrders();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        // Refresh data if this forum discussion is synchronized from discussions list.
        this.syncManualObserver = this.eventsProvider.on(AddonModForumSyncProvider.MANUAL_SYNCED, (data) => {
            this.autoSyncEventReceived(data);
        }, this.siteId);

        // Listen for discussions added. When a discussion is added, we reload the data.
        this.newDiscObserver = this.eventsProvider.on(AddonModForumProvider.NEW_DISCUSSION_EVENT,
                this.eventReceived.bind(this, true));
        this.replyObserver = this.eventsProvider.on(AddonModForumProvider.REPLY_DISCUSSION_EVENT,
                this.eventReceived.bind(this, false));
        this.changeDiscObserver = this.eventsProvider.on(AddonModForumProvider.CHANGE_DISCUSSION_EVENT,
                this.eventReceived.bind(this, false));

        // Select the current opened discussion.
        this.viewDiscObserver = this.eventsProvider.on(AddonModForumProvider.VIEW_DISCUSSION_EVENT, (data) => {
            if (this.forum && this.forum.id == data.forumId) {
                this.selectedDiscussion = this.splitviewCtrl.isOn() ? data.discussion : 0;

                // Invalidate discussion list if it was not read.
                const discussion = this.discussions.find((disc) => disc.discussion == data.discussion);
                if (discussion && discussion.numunread > 0) {
                    this.forumProvider.invalidateDiscussionsList(this.forum.id);
                }
            }
        }, this.sitesProvider.getCurrentSiteId());

        // Listen for offline ratings saved and synced.
        this.ratingOfflineObserver = this.eventsProvider.on(CoreRatingProvider.RATING_SAVED_EVENT, (data) => {
            if (this.forum && data.component == 'mod_forum' && data.ratingArea == 'post' &&
                    data.contextLevel == 'module' && data.instanceId == this.forum.cmid) {
                this.hasOfflineRatings = true;
            }
        });
        this.ratingSyncObserver = this.eventsProvider.on(CoreRatingSyncProvider.SYNCED_EVENT, (data) => {
            if (this.forum && data.component == 'mod_forum' && data.ratingArea == 'post' &&
                    data.contextLevel == 'module' && data.instanceId == this.forum.cmid) {
               this.ratingOffline.hasRatings('mod_forum', 'post', 'module', this.forum.cmid).then((hasRatings) => {
                   this.hasOfflineRatings = hasRatings;
               });
            }
        });

        this.loadContent(false, true).then(() => {
            if (!this.forum) {
                return;
            }

            if (this.splitviewCtrl.isOn()) {
                // Load the first discussion.
                if (this.offlineDiscussions.length > 0) {
                    this.openNewDiscussion(this.offlineDiscussions[0].timecreated);
                } else if (this.discussions.length > 0) {
                    this.openDiscussion(this.discussions[0]);
                }
            }

            this.forumProvider.logView(this.forum.id, this.forum.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch((error) => {
                // Ignore errors.
            });
        });
    }

    /**
     * Download the component contents.
     *
     * @param  {boolean} [refresh=false]    Whether we're refreshing data.
     * @param  {boolean} [sync=false]       If the refresh needs syncing.
     * @param  {boolean} [showErrors=false] Wether to show errors to the user or hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {
        this.loadMoreError = false;

        const promises = [];

        promises.push(this.forumProvider.getForum(this.courseId, this.module.id).then((forum) => {
            this.forum = forum;

            this.description = forum.intro || this.description;
            this.descriptionNote = this.translate.instant('addon.mod_forum.numdiscussions', {numdiscussions: forum.numdiscussions});
            if (typeof forum.istracked != 'undefined') {
                this.trackPosts = forum.istracked;
            }
            this.availabilityMessage = this.forumHelper.getAvailabilityMessage(forum);

            this.dataRetrieved.emit(forum);

            switch (forum.type) {
                case 'news':
                case 'blog':
                    this.addDiscussionText = this.translate.instant('addon.mod_forum.addanewtopic');
                    break;
                case 'qanda':
                    this.addDiscussionText = this.translate.instant('addon.mod_forum.addanewquestion');
                    break;
                default:
                    this.addDiscussionText = this.translate.instant('addon.mod_forum.addanewdiscussion');
            }

            if (sync) {
                // Try to synchronize the forum.
                return this.syncActivity(showErrors).then((updated) => {
                    if (updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonModForumSyncProvider.MANUAL_SYNCED, {
                            forumId: forum.id,
                            userId: this.sitesProvider.getCurrentSiteUserId(),
                            source: 'index',
                        }, this.sitesProvider.getCurrentSiteId());
                    }
                });
            }
        }).then(() => {
            return Promise.all([
                // Check if the activity uses groups.
                this.groupsProvider.getActivityGroupMode(this.forum.cmid).then((mode) => {
                    this.usesGroups = (mode === CoreGroupsProvider.SEPARATEGROUPS || mode === CoreGroupsProvider.VISIBLEGROUPS);
                }),
                this.forumProvider.getAccessInformation(this.forum.id).then((accessInfo) => {
                    // Disallow adding discussions if cut-off date is reached and the user has not the capability to override it.
                    // Just in case the forum was fetched from WS when the cut-off date was not reached but it is now.
                    const cutoffDateReached = this.forumHelper.isCutoffDateReached(this.forum) && !accessInfo.cancanoverridecutoff;
                    this.canAddDiscussion = this.forum.cancreatediscussions && !cutoffDateReached;
                }),
            ]);
        }));

        promises.push(this.fetchSortOrderPreference());

        return Promise.all(promises).then(() => {
            return Promise.all([
                this.fetchOfflineDiscussion(),
                this.fetchDiscussions(refresh),
                this.ratingOffline.hasRatings('mod_forum', 'post', 'module', this.forum.cmid).then((hasRatings) => {
                    this.hasOfflineRatings = hasRatings;
                })
            ]);
        }).catch((message) => {
            if (!refresh) {
                // Get forum failed, retry without using cache since it might be a new activity.
                return this.refreshContent(sync);
            }

            this.domUtils.showErrorModalDefault(message, 'addon.mod_forum.errorgetforum', true);

            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        }).then(() => {
            // All data obtained, now fill the context menu.
            this.fillContextMenu(refresh);
        });
    }

    /**
     * Convenience function to fetch offline discussions.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchOfflineDiscussion(): Promise<any> {
        return this.forumOffline.getNewDiscussions(this.forum.id).then((offlineDiscussions) => {
            this.hasOffline = !!offlineDiscussions.length;

            if (this.hasOffline) {
                let promise;
                if (this.usesGroups) {
                    promise = this.forumProvider.formatDiscussionsGroups(this.forum.cmid, offlineDiscussions);
                } else {
                    promise = Promise.resolve(offlineDiscussions);
                }

                return promise.then((offlineDiscussions) => {
                    // Fill user data for Offline discussions (should be already cached).
                    const userPromises = [];
                    offlineDiscussions.forEach((discussion) => {
                        if (discussion.parent != 0 || this.forum.type != 'single') {
                            // Do not show author for first post and type single.
                            userPromises.push(this.userProvider.getProfile(discussion.userid, this.courseId, true)
                                    .then((user) => {
                                discussion.userfullname = user.fullname;
                                discussion.userpictureurl = user.profileimageurl;
                            }).catch(() => {
                                // Ignore errors.
                            }));
                        }
                    });

                    return Promise.all(userPromises).then(() => {
                        // Sort discussion by time (newer first).
                        offlineDiscussions.sort((a, b) => b.timecreated - a.timecreated);

                        this.offlineDiscussions = offlineDiscussions;
                    });
                });
            } else {
                this.offlineDiscussions = [];
            }
        });
    }

    /**
     * Convenience function to get forum discussions.
     *
     * @param  {boolean} refresh Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchDiscussions(refresh: boolean): Promise<any> {
        this.loadMoreError = false;

        if (refresh) {
            this.page = 0;
        }

        return this.forumProvider.getDiscussions(this.forum.id, this.selectedSortOrder.value, this.page).then((response) => {
            let promise;
            if (this.usesGroups) {
                promise = this.forumProvider.formatDiscussionsGroups(this.forum.cmid, response.discussions);
            } else {
                promise = Promise.resolve(response.discussions);
            }

            return promise.then((discussions) => {
                if (this.forum.type == 'single') {
                    // Hide author for first post and type single.
                    for (const x in discussions) {
                        if (discussions[x].userfullname && discussions[x].parent == 0) {
                            discussions[x].userfullname = false;
                            break;
                        }
                    }
                }

                if (typeof this.forum.istracked == 'undefined' && !this.trackPosts) {
                    // If any discussion has unread posts, the whole forum is being tracked.
                    for (const y in discussions) {
                        if (discussions[y].numunread > 0) {
                            this.trackPosts = true;
                            break;
                        }
                    }
                }

                if (this.page == 0) {
                    this.discussions = discussions;
                } else {
                    this.discussions = this.discussions.concat(discussions);
                }

                this.canLoadMore = response.canLoadMore;
                this.page++;

                // Check if there are replies for discussions stored in offline.
                return this.forumOffline.hasForumReplies(this.forum.id).then((hasOffline) => {
                    const offlinePromises = [];
                    this.hasOffline = this.hasOffline || hasOffline;

                    if (hasOffline) {
                        // Only update new fetched discussions.
                        discussions.forEach((discussion) => {
                            // Get offline discussions.
                            offlinePromises.push(this.forumOffline.getDiscussionReplies(discussion.discussion).then((replies) => {
                                discussion.numreplies = parseInt(discussion.numreplies, 10) + replies.length;
                            }));
                        });
                    }

                    return Promise.all(offlinePromises);
                });
            });
        });
    }

    /**
     * Convenience function to load more forum discussions.
     *
     * @param {any} [infiniteComplete] Infinite scroll complete function. Only used from core-infinite-loading.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchMoreDiscussions(infiniteComplete?: any): Promise<any> {
        return this.fetchDiscussions(false).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'addon.mod_forum.errorgetforum', true);

            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        }).finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Convenience function to fetch the sort order preference.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchSortOrderPreference(): Promise<any> {
        let promise;
        if (this.sortingAvailable) {
            promise = this.userProvider.getUserPreference(AddonModForumProvider.PREFERENCE_SORTORDER).then((value) => {
                return value ? parseInt(value, 10) : null;
            });
        } else {
            // Use default.
            promise = Promise.resolve(null);
        }

        return promise.then((value) => {
           this.selectedSortOrder = this.sortOrders.find((sortOrder) => sortOrder.value === value) || this.sortOrders[0];
        });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.forumProvider.invalidateForumData(this.courseId));

        if (this.forum) {
            promises.push(this.forumProvider.invalidateDiscussionsList(this.forum.id));
            promises.push(this.groupsProvider.invalidateActivityGroupMode(this.forum.cmid));
            promises.push(this.forumProvider.invalidateAccessInformation(this.forum.id));
        }

        if (this.sortingAvailable) {
            promises.push(this.userProvider.invalidateUserPreference(AddonModForumProvider.PREFERENCE_SORTORDER));
        }

        return Promise.all(promises);
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<boolean> {
        return this.prefetchHandler.sync(this.module, this.courseId);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param  {any} result Data returned on the sync function.
     * @return {boolean} Whether it succeed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        return result.updated;
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param  {any} syncEventData Data receiven on sync observer.
     * @return {boolean} True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        return this.forum && syncEventData.source != 'index' && syncEventData.forumId == this.forum.id &&
            syncEventData.userId == this.sitesProvider.getCurrentSiteUserId();
    }

    /**
     * Function called when we receive an event of new discussion or reply to discussion.
     *
     * @param {boolean} isNewDiscussion Whether it's a new discussion event.
     * @param {any} data Event data.
     */
    protected eventReceived(isNewDiscussion: boolean, data: any): void {
        if ((this.forum && this.forum.id === data.forumId) || data.cmId === this.module.id) {
            if (isNewDiscussion && this.splitviewCtrl.isOn()) {
                // Discussion added, clear details page.
                this.splitviewCtrl.emptyDetails();
            }

            this.showLoadingAndRefresh(false).finally(() => {
                // If it's a new discussion in tablet mode, try to open it.
                if (isNewDiscussion && this.splitviewCtrl.isOn()) {

                    if (data.discussionIds) {
                        // Discussion sent to server, search it in the list of discussions.
                        const discussion = this.discussions.find((disc) => {
                            return data.discussionIds.indexOf(disc.discussion) >= 0;
                        });
                        if (discussion) {
                            this.openDiscussion(discussion);
                        }

                    } else if (data.discTimecreated) {
                        // It's an offline discussion, open it.
                        this.openNewDiscussion(data.discTimecreated);
                    }
                }
            });

            // Check completion since it could be configured to complete once the user adds a new discussion or replies.
            this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
        }
    }

    /**
     * Opens a discussion.
     *
     * @param {any} discussion Discussion object.
     */
    openDiscussion(discussion: any): void {
        const params = {
            courseId: this.courseId,
            cmId: this.module.id,
            forumId: this.forum.id,
            discussion: discussion,
            trackPosts: this.trackPosts,
        };
        this.splitviewCtrl.push('AddonModForumDiscussionPage', params);
    }

    /**
     * Opens the new discussion form.
     *
     * @param {number} [timeCreated=0] Creation time of the offline discussion.
     */
    openNewDiscussion(timeCreated: number = 0): void {
        const params = {
            courseId: this.courseId,
            cmId: this.module.id,
            forumId: this.forum.id,
            timeCreated: timeCreated,
        };
        this.splitviewCtrl.push('AddonModForumNewDiscussionPage', params);

        this.selectedDiscussion = 0;
    }

    /**
     * Display the sort order selector modal.
     *
     * @param {MouseEvent} event Event.
     */
    showSortOrderSelector(event: MouseEvent): void {
        if (!this.sortingAvailable) {
            return;
        }

        const params = { sortOrders: this.sortOrders, selected: this.selectedSortOrder.value };
        const modal = this.modalCtrl.create('AddonModForumSortOrderSelectorPage', params);
        modal.onDidDismiss((sortOrder) => {
            this.sortOrderSelectorExpanded = false;

            if (sortOrder && sortOrder.value != this.selectedSortOrder.value) {
                this.selectedSortOrder = sortOrder;
                this.page = 0;
                this.userProvider.setUserPreference(AddonModForumProvider.PREFERENCE_SORTORDER, sortOrder.value.toFixed(0))
                        .then(() => {
                    this.showLoadingAndFetch();
                }).catch((error) => {
                    this.domUtils.showErrorModalDefault(error, 'Error updating preference.');
                });
            }
        });

        modal.present({ev: event});
        this.sortOrderSelectorExpanded = true;
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
}
