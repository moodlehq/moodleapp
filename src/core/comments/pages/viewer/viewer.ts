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

import { Component, ViewChild, OnDestroy } from '@angular/core';
import { IonicPage, Content, NavParams, ModalController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
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
    canLoadMore = false;
    loadMoreError = false;
    canAddComments = false;
    hasOffline = false;
    refreshIcon = 'spinner';
    syncIcon = 'spinner';
    offlineComment: any;

    protected addCommentsAvailable = false;
    protected syncObserver: any;
    protected currentUser: any;

    constructor(navParams: NavParams, private sitesProvider: CoreSitesProvider, private userProvider: CoreUserProvider,
             private domUtils: CoreDomUtilsProvider, private translate: TranslateService, private modalCtrl: ModalController,
             private commentsProvider: CoreCommentsProvider, private offlineComments: CoreCommentsOfflineProvider,
             eventsProvider: CoreEventsProvider, private commentsSync: CoreCommentsSyncProvider,
             private textUtils: CoreTextUtilsProvider) {

        this.contextLevel = navParams.get('contextLevel');
        this.instanceId = navParams.get('instanceId');
        this.componentName = navParams.get('componentName');
        this.itemId = navParams.get('itemId');
        this.area = navParams.get('area') || '';
        this.title = navParams.get('title') || this.translate.instant('core.comments.comments');
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
            this.addCommentsAvailable = enabled;
        });

        this.fetchComments(true);
    }

    /**
     * Fetches the comments.
     *
     * @param  {boolean} sync         When to resync notes.
     * @param  {boolean} [showErrors] When to display errors or not.
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchComments(sync: boolean, showErrors?: boolean): Promise<any> {
        this.loadMoreError = false;

        const promise = sync ? this.syncComment(showErrors) : Promise.resolve();

        return promise.catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.offlineComments.getComment(this.contextLevel, this.instanceId, this.componentName, this.itemId,
                    this.area).then((offlineComment) => {
                this.hasOffline = !!offlineComment;
                this.offlineComment = offlineComment;

                if (this.hasOffline && !this.currentUser) {
                    return this.userProvider.getProfile(this.sitesProvider.getCurrentSiteUserId(), undefined, true).then((user) => {
                        this.currentUser = user;
                        this.offlineComment.profileimageurl = user.profileimageurl;
                        this.offlineComment.fullname = user.fullname;
                        this.offlineComment.userid = user.id;
                    }).catch(() => {
                        // Ignore errors.
                    });
                } else if (this.hasOffline) {
                    this.offlineComment.profileimageurl = this.currentUser.profileimageurl;
                    this.offlineComment.fullname = this.currentUser.fullname;
                    this.offlineComment.userid = this.currentUser.id;
                }
            });
        }).then(() => {

            // Get comments data.
            return this.commentsProvider.getComments(this.contextLevel, this.instanceId, this.componentName, this.itemId,
                    this.area, this.page).then((response) => {
                this.canAddComments = this.addCommentsAvailable && response.canpost;

                const comments = response.comments.sort((a, b) => b.timecreated - a.timecreated);
                this.canLoadMore = comments.length >= CoreCommentsProvider.pageSize;

                this.comments.forEach((comment) => {
                    // Get the user profile image.
                    this.userProvider.getProfile(comment.userid, undefined, true).then((user) => {
                        comment.profileimageurl = user.profileimageurl;
                    }).catch(() => {
                        // Ignore errors.
                    });
                });

                this.comments = this.comments.concat(comments);
            });
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
     * Function to load more cp,,emts.
     *
     * @param {any} [infiniteComplete] Infinite scroll complete function. Only used from core-infinite-loading.
     * @return {Promise<any>} Resolved when done.
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
     * @param {boolean} showErrors Whether to display errors or not.
     * @param {any} [refresher] Refresher.
     * @return {Promise<any>} Resolved when done.
     */
    refreshComments(showErrors: boolean, refresher?: any): Promise<any> {
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';

        return this.commentsProvider.invalidateCommentsData(this.contextLevel, this.instanceId, this.componentName,
                this.itemId, this.area).finally(() => {
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
     * @param {string[]} warnings the warnings
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
     * @param  {boolean} showErrors Whether to display errors or not.
     * @return {Promise<any>}       Promise resolved if sync is successful, rejected otherwise.
     */
    private syncComment(showErrors: boolean): Promise<any> {
        return this.commentsSync.syncComment(this.contextLevel, this.instanceId, this.componentName, this.itemId,
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
     * @param {Event} e Event.
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
                this.comments = data.comments.concat(this.comments);
            } else if (data && !data.comments) {
                this.fetchComments(false);
            }
        });
        modal.present();
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.syncObserver && this.syncObserver.off();
    }
}
