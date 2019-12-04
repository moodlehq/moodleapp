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

import { Component, ViewChild, OnDestroy } from '@angular/core';
import { IonicPage, Content, NavParams, ModalController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { coreSlideInOut } from '@classes/animations';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreEventsProvider } from '@providers/events';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreCommentsProvider } from '../../providers/comments';
import { CoreCommentsOfflineProvider } from '../../providers/offline';
import { CoreCommentsSyncProvider } from '../../providers/sync';

/**
 * Page that displays comments.
 */
@IonicPage({ segment: 'core-comments-viewer' })
@Component({
    selector: 'page-core-comments-viewer',
    templateUrl: 'viewer.html',
    animations: [coreSlideInOut]
})
export class CoreCommentsViewerPage implements OnDestroy {
    @ViewChild(Content) content: Content;

    comments = [];
    commentsLoaded = false;
    contextLevel: string;
    instanceId: number;
    componentName: string;
    itemId: number;
    area: string;
    page: number;
    title: string;
    courseId: number;
    canLoadMore = false;
    loadMoreError = false;
    canAddComments = false;
    canDeleteComments = false;
    showDelete = false;
    hasOffline = false;
    refreshIcon = 'spinner';
    syncIcon = 'spinner';
    offlineComment: any;
    currentUserId: number;

    protected addDeleteCommentsAvailable = false;
    protected syncObserver: any;
    protected currentUser: any;

    constructor(navParams: NavParams,
            protected sitesProvider: CoreSitesProvider,
            protected userProvider: CoreUserProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected translate: TranslateService,
            protected modalCtrl: ModalController,
            protected commentsProvider: CoreCommentsProvider,
            protected offlineComments: CoreCommentsOfflineProvider,
            protected eventsProvider: CoreEventsProvider,
            protected commentsSync: CoreCommentsSyncProvider,
            protected textUtils: CoreTextUtilsProvider,
            protected timeUtils: CoreTimeUtilsProvider) {

        this.contextLevel = navParams.get('contextLevel');
        this.instanceId = navParams.get('instanceId');
        this.componentName = navParams.get('componentName');
        this.itemId = navParams.get('itemId');
        this.area = navParams.get('area') || '';
        this.title = navParams.get('title') || this.translate.instant('core.comments.comments');
        this.courseId = navParams.get('courseId');
        this.page = 0;

        // Refresh data if comments are synchronized automatically.
        this.syncObserver = eventsProvider.on(CoreCommentsSyncProvider.AUTO_SYNCED, (data) => {
            if (data.contextLevel == this.contextLevel && data.instanceId == this.instanceId &&
                    data.componentName == this.componentName && data.itemId == this.itemId && data.area == this.area) {
                // Show the sync warnings.
                this.showSyncWarnings(data.warnings);

                // Refresh the data.
                this.commentsLoaded = false;
                this.refreshIcon = 'spinner';
                this.syncIcon = 'spinner';

                this.domUtils.scrollToTop(this.content);

                this.page = 0;
                this.comments = [];
                this.fetchComments(false);
            }
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.commentsProvider.isAddCommentsAvailable().then((enabled) => {
            // Is implicit the user can delete if he can add.
            this.addDeleteCommentsAvailable = enabled;
        });

        this.currentUserId = this.sitesProvider.getCurrentSiteUserId();
        this.fetchComments(true);
    }

    /**
     * Fetches the comments.
     *
     * @param sync When to resync comments.
     * @param showErrors When to display errors or not.
     * @return Resolved when done.
     */
    protected fetchComments(sync: boolean, showErrors?: boolean): Promise<any> {
        this.loadMoreError = false;

        const promise = sync ? this.syncComments(showErrors) : Promise.resolve();

        return promise.catch(() => {
            // Ignore errors.
        }).then(() => {
            // Get comments data.
            return this.commentsProvider.getComments(this.contextLevel, this.instanceId, this.componentName, this.itemId,
                    this.area, this.page).then((response) => {
                this.canAddComments = this.addDeleteCommentsAvailable && response.canpost;

                const comments = response.comments.sort((a, b) => b.timecreated - a.timecreated);
                if (typeof response.count != 'undefined') {
                    this.canLoadMore = (this.comments.length + comments.length) > response.count;
                } else {
                    // Old style.
                    this.canLoadMore = response.comments.length > 0 && response.comments.length >= CoreCommentsProvider.pageSize;
                }

                return Promise.all(comments.map((comment) => this.loadCommentProfile(comment)));
            }).then((comments) => {
                this.comments = this.comments.concat(comments);

                this.canDeleteComments = this.addDeleteCommentsAvailable && (this.hasOffline || this.comments.some((comment) => {
                    return !!comment.delete;
                }));
            });
        }).then(() => {
            return this.loadOfflineData();
        }).catch((error) => {
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
            if (error && this.componentName == 'assignsubmission_comments') {
                this.domUtils.showAlertTranslated('core.notice', 'core.comments.commentsnotworking');
            } else {
                this.domUtils.showErrorModalDefault(error, this.translate.instant('core.error') + ': get_comments');
            }
        }).finally(() => {
            this.commentsLoaded = true;
            this.refreshIcon = 'refresh';
            this.syncIcon = 'sync';
        });

    }

    /**
     * Function to load more commemts.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @return Resolved when done.
     */
    loadMore(infiniteComplete?: any): Promise<any> {
        this.page++;
        this.canLoadMore = false;

        return this.fetchComments(true).finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Refresh the comments.
     *
     * @param showErrors Whether to display errors or not.
     * @param refresher Refresher.
     * @return Resolved when done.
     */
    refreshComments(showErrors: boolean, refresher?: any): Promise<any> {
        this.commentsLoaded = false;
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';

        return this.invalidateComments().finally(() => {
            this.page = 0;
            this.comments = [];

            return this.fetchComments(true, showErrors).finally(() => {
                refresher && refresher.complete();
            });
        });
    }

    /**
     * Show sync warnings if any.
     *
     * @param warnings the warnings
     */
    private showSyncWarnings(warnings: string[]): void {
        const message = this.textUtils.buildMessage(warnings);
        if (message) {
            this.domUtils.showErrorModal(message);
        }
    }

    /**
     * Tries to synchronize comments.
     *
     * @param showErrors Whether to display errors or not.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    private syncComments(showErrors: boolean): Promise<any> {
        return this.commentsSync.syncComments(this.contextLevel, this.instanceId, this.componentName, this.itemId,
                this.area).then((warnings) => {
            this.showSyncWarnings(warnings);
        }).catch((error) => {
            if (showErrors) {
                this.domUtils.showErrorModalDefault(error, 'core.errorsync', true);
            }

            return Promise.reject(null);
        });
    }

    /**
     * Add a new comment to the list.
     *
     * @param e Event.
     */
    addComment(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        const params = {
            contextLevel: this.contextLevel,
            instanceId: this.instanceId,
            componentName: this.componentName,
            itemId: this.itemId,
            area: this.area,
            content: this.hasOffline ? this.offlineComment.content : ''
        };

        const modal = this.modalCtrl.create('CoreCommentsAddPage', params);
        modal.onDidDismiss((data) => {
            if (data && data.comments) {
                this.invalidateComments();

                return Promise.all(data.comments.map((comment) => this.loadCommentProfile(comment))).then((addedComments) => {
                    // Add the comment to the top.
                    this.comments = addedComments.concat(this.comments);
                    this.canDeleteComments = this.addDeleteCommentsAvailable;

                    this.eventsProvider.trigger(CoreCommentsProvider.COMMENTS_COUNT_CHANGED_EVENT, {
                            contextLevel: this.contextLevel,
                            instanceId: this.instanceId,
                            component: this.componentName,
                            itemId: this.itemId,
                            area: this.area,
                            countChange: addedComments.length,
                        }, this.sitesProvider.getCurrentSiteId());
                });
            } else if (data && !data.comments) {
                // Comments added in offline mode.
                return this.loadOfflineData();
            }
        });
        modal.present();
    }

    /**
     * Delete a comment.
     *
     * @param e Click event.
     * @param deleteComment Comment to delete.
     */
    deleteComment(e: Event, deleteComment: any): void {
        e.preventDefault();
        e.stopPropagation();

        const time = this.timeUtils.userDate((deleteComment.lastmodified || deleteComment.timecreated) * 1000,
            'core.strftimerecentfull');

        deleteComment.contextlevel = this.contextLevel;
        deleteComment.instanceid = this.instanceId;
        deleteComment.component = this.componentName;
        deleteComment.itemid = this.itemId;
        deleteComment.area = this.area;

        this.domUtils.showDeleteConfirm('core.comments.deletecommentbyon', {$a:
                { user: deleteComment.fullname || '', time: time } }).then(() => {
            this.commentsProvider.deleteComment(deleteComment).then((deletedOnline) => {
                this.showDelete = false;

                if (deletedOnline) {
                    const index = this.comments.findIndex((comment) => comment.id == deleteComment.id);
                    if (index >= 0) {
                        this.comments.splice(index, 1);

                        this.eventsProvider.trigger(CoreCommentsProvider.COMMENTS_COUNT_CHANGED_EVENT, {
                            contextLevel: this.contextLevel,
                            instanceId: this.instanceId,
                            component: this.componentName,
                            itemId: this.itemId,
                            area: this.area,
                            countChange: -1,
                        }, this.sitesProvider.getCurrentSiteId());
                    }
                } else {
                    this.loadOfflineData();
                }

                this.invalidateComments();

                this.domUtils.showToast('core.comments.eventcommentdeleted', true, 3000);
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'Delete comment failed.');
            });
        }).catch(() => {
            // User cancelled, nothing to do.
        });
    }

    /**
     * Invalidate comments.
     *
     * @return Resolved when done.
     */
    protected invalidateComments(): Promise<void> {
        return this.commentsProvider.invalidateCommentsData(this.contextLevel, this.instanceId, this.componentName, this.itemId,
                    this.area);
    }

    /**
     * Loads the profile info onto the comment object.
     *
     * @param  comment Comment object.
     * @return Promise resolved with modified comment when done.
     */
    protected loadCommentProfile(comment: any): Promise<any> {
        // Get the user profile image.
        return this.userProvider.getProfile(comment.userid, undefined, true).then((user) => {
            comment.profileimageurl = user.profileimageurl;
            comment.fullname = user.fullname;
            comment.userid = user.id;

            return comment;
        }).catch(() => {
            // Ignore errors.
            return comment;
        });
    }

    /**
     * Load offline comments.
     *
     * @return Promise resolved when done.
     */
    protected loadOfflineData(): Promise<void> {
        const promises = [];
        let hasDeletedComments = false;

        // Load the only offline comment allowed if any.
        promises.push(this.offlineComments.getComment(this.contextLevel, this.instanceId, this.componentName, this.itemId,
                this.area).then((offlineComment) => {

            if (offlineComment && !this.currentUser) {
                offlineComment.userid = this.currentUserId;

                this.loadCommentProfile(offlineComment).then((comment) => {
                    // Save this fields for further requests.
                    if (comment.fullname) {
                        this.currentUser = {};
                        this.currentUser.profileimageurl = comment.profileimageurl;
                        this.currentUser.fullname = comment.fullname;
                        this.currentUser.userid = comment.userid;
                    }
                });
            } else if (offlineComment) {
                offlineComment.profileimageurl = this.currentUser.profileimageurl;
                offlineComment.fullname = this.currentUser.fullname;
                offlineComment.userid = this.currentUser.id;
            }

            this.offlineComment = offlineComment;
        }));

        // Load deleted comments offline.
        promises.push(this.offlineComments.getDeletedComments(this.contextLevel, this.instanceId, this.componentName, this.itemId,
                this.area).then((deletedComments) => {
            hasDeletedComments = deletedComments && deletedComments.length > 0;

            hasDeletedComments && deletedComments.forEach((deletedComment) => {
                const comment = this.comments.find((comment) => {
                    return comment.id == deletedComment.commentid;
                });

                if (comment) {
                    comment.deleted = deletedComment.deleted;
                }
            });
        }));

        return Promise.all(promises).then(() => {
            this.hasOffline = !!this.offlineComment || hasDeletedComments;
        });
    }

    /**
     * Restore a comment.
     *
     * @param e Click event.
     * @param comment Comment to delete.
     */
    undoDeleteComment(e: Event, comment: any): void {
        e.preventDefault();
        e.stopPropagation();

        this.offlineComments.undoDeleteComment(comment.id).then(() => {
            comment.deleted = false;
            this.showDelete = false;
        });
    }

    /**
     * Toggle delete.
     */
    toggleDelete(): void {
        this.showDelete = !this.showDelete;
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.syncObserver && this.syncObserver.off();
    }
}
