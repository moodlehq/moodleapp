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

import { Component, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { ActivatedRoute } from '@angular/router';
import { CoreSites } from '@services/sites';
import {
    CoreComments,
    CoreCommentsCommentBasicData,
    CoreCommentsData,
    CoreCommentsProvider,
} from '@features/comments/services/comments';
import {
    CoreCommentsSync,
} from '@features/comments/services/comments-sync';
import { IonContent } from '@ionic/angular';
import { ContextLevel, CoreConstants } from '@/core/constants';
import { CoreNavigator } from '@services/navigator';
import { NgZone, Translate } from '@singletons';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreUser } from '@features/user/services/user';
import { CoreText } from '@singletons/text';
import { CoreError } from '@classes/errors/error';
import { CoreCommentsOffline } from '@features/comments/services/comments-offline';
import { CoreCommentsDBRecord } from '@features/comments/services/database/comments';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreNetwork } from '@services/network';
import moment from 'moment-timezone';
import { Subscription } from 'rxjs';
import { CoreAnimations } from '@components/animations';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { CoreLoadings } from '@services/overlays/loadings';
import { CORE_COMMENTS_AUTO_SYNCED } from '@features/comments/constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreWait } from '@singletons/wait';
import { CoreDom } from '@singletons/dom';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays comments.
 */
@Component({
    selector: 'page-core-comments-viewer',
    templateUrl: 'viewer.html',
    animations: [CoreAnimations.SLIDE_IN_OUT],
    styleUrls: ['../../../../../theme/components/discussion.scss', 'viewer.scss'],
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCommentsViewerPage implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild(IonContent) content?: IonContent;

    comments: CoreCommentsDataToDisplay[] = [];
    commentsLoaded = false;
    contextLevel!: ContextLevel;
    instanceId!: number;
    componentName!: string;
    itemId = 0;
    area = '';
    page = 0;
    title = '';
    courseId?: number;
    canLoadMore = false;
    loadMoreError = false;
    canAddComments = false;
    canDeleteComments = false;
    showDelete = false;
    hasOffline = false;
    refreshIcon = CoreConstants.ICON_LOADING;
    syncIcon = CoreConstants.ICON_LOADING;
    offlineComment?: CoreCommentsOfflineWithUser & { pending?: boolean };
    currentUserId: number;
    sending = false;
    newComment = '';
    isOnline: boolean;

    protected addDeleteCommentsAvailable = false;
    protected syncObserver?: CoreEventObserver;
    protected onlineObserver: Subscription;
    protected keyboardObserver: CoreEventObserver;
    protected viewDestroyed = false;
    protected scrollBottom = true;
    protected scrollElement?: HTMLElement;

    constructor(
        protected route: ActivatedRoute,
    ) {
        this.currentUserId = CoreSites.getCurrentSiteUserId();

        // Refresh data if comments are synchronized automatically.
        this.syncObserver = CoreEvents.on(CORE_COMMENTS_AUTO_SYNCED, (data) => {
            if (data.contextLevel == this.contextLevel && data.instanceId == this.instanceId &&
                    data.componentName == this.componentName && data.itemId == this.itemId && data.area == this.area) {
                // Show the sync warnings.
                this.showSyncWarnings(data.warnings);

                // Refresh the data.
                this.commentsLoaded = false;
                this.refreshIcon = CoreConstants.ICON_LOADING;
                this.syncIcon = CoreConstants.ICON_LOADING;

                this.page = 0;
                this.comments = [];
                this.fetchComments(false);
            }
        }, CoreSites.getCurrentSiteId());

        this.isOnline = CoreNetwork.isOnline();
        this.onlineObserver = CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreNetwork.isOnline();
            });
        });

        this.keyboardObserver = CoreEvents.on(CoreEvents.KEYBOARD_CHANGE, (keyboardHeight: number) => {
            // Force when opening.
            this.scrollToBottom(keyboardHeight > 0);
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.contextLevel = CoreNavigator.getRequiredRouteParam<ContextLevel>('contextLevel');
            this.instanceId = CoreNavigator.getRequiredRouteNumberParam('instanceId');
            this.componentName = CoreNavigator.getRequiredRouteParam<string>('componentName');
            this.itemId = CoreNavigator.getRequiredRouteNumberParam('itemId');
            this.area = CoreNavigator.getRouteParam('area') || '';
            this.title = CoreNavigator.getRouteParam('title') ||
                Translate.instant('core.comments.comments');
            this.courseId = CoreNavigator.getRouteNumberParam('courseId');
        } catch (error) {
            CoreAlerts.showError(error);

            CoreNavigator.back();

            return;
        }

        // Is implicit the user can delete if he can add.
        this.addDeleteCommentsAvailable = await CoreComments.isAddCommentsAvailable();
        this.currentUserId = CoreSites.getCurrentSiteUserId();

        this.commentsLoaded = false;

        await this.fetchComments(true);
    }

    /**
     * View has been initialized.
     */
    async ngAfterViewInit(): Promise<void> {
        this.scrollElement = await this.content?.getScrollElement();
    }

    /**
     * Fetches the comments.
     *
     * @param sync When to resync comments.
     * @param showErrors When to display errors or not.
     * @returns Resolved when done.
     */
    protected async fetchComments(sync: boolean, showErrors = false): Promise<void> {
        this.loadMoreError = false;

        if (sync) {
            await CorePromiseUtils.ignoreErrors(this.syncComments(showErrors));
        }

        this.scrollBottom = CoreDom.scrollIsBottom(this.scrollElement, 5);

        try {
            // Get comments data.
            const commentsResponse = await CoreComments.getComments(
                this.contextLevel,
                this.instanceId,
                this.componentName,
                this.itemId,
                this.area,
                this.page,
            );
            this.canAddComments = this.addDeleteCommentsAvailable && !!commentsResponse.canpost;

            let comments = commentsResponse.comments.sort((a, b) => a.timecreated - b.timecreated);
            if (commentsResponse.count !== undefined) {
                this.canLoadMore = (this.comments.length + comments.length) < commentsResponse.count;
            } else {
                // Old style.
                this.canLoadMore = commentsResponse.comments.length > 0 &&
                    commentsResponse.comments.length >= CoreCommentsProvider.pageSize;
            }

            comments = await Promise.all(comments.map((comment) => this.loadCommentProfile(comment)));

            this.comments = comments.concat(this.comments);

            this.comments.forEach((comment, index) => this.calculateCommentData(comment, this.comments[index - 1]));

            this.canDeleteComments = this.addDeleteCommentsAvailable &&
                (this.hasOffline || this.comments.some((comment) => !!comment.delete));

            await this.loadOfflineData();
        } catch (error) {
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
            if (error && this.componentName == 'assignsubmission_comments') {
                CoreAlerts.show({
                    header: Translate.instant('core.notice'),
                    message: Translate.instant('core.comments.commentsnotworking'),
                });
            } else {
                CoreAlerts.showError(error, { default: Translate.instant('core.error') + ': get_comments' });
            }
        } finally {
            this.commentsLoaded = true;
            this.refreshIcon = CoreConstants.ICON_REFRESH;
            this.syncIcon = CoreConstants.ICON_SYNC;

            this.scrollToBottom(this.page === 0);
        }

    }

    /**
     * Calculate some comment data.
     *
     * @param comment Comment.
     * @param prevComment Previous comment.
     */
    protected calculateCommentData(comment: CoreCommentsDataToDisplay, prevComment?: CoreCommentsDataToDisplay): void {
        comment.showDate = this.showDate(comment, prevComment);
        comment.showUserData = this.showUserData(comment, prevComment);
        comment.showTail = this.showTail(comment, prevComment);
        comment.delete = comment.delete ?? false; // If this property is undefined, core-message assumes comment can be deleted.
    }

    /**
     * Function to load more commemts.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @returns Resolved when done.
     */
    async loadPrevious(infiniteComplete?: () => void): Promise<void> {
        this.page++;
        this.canLoadMore = false;

        try {
            await this.fetchComments(true);
        } finally {
            infiniteComplete && infiniteComplete();
        }
    }

    /**
     * Refresh the comments.
     *
     * @param showErrors Whether to display errors or not.
     * @param refresher Refresher.
     * @returns Resolved when done.
     */
    async refreshComments(showErrors: boolean, refresher?: HTMLIonRefresherElement): Promise<void> {
        this.commentsLoaded = false;
        this.refreshIcon = CoreConstants.ICON_LOADING;
        this.syncIcon = CoreConstants.ICON_LOADING;

        await CorePromiseUtils.ignoreErrors(this.invalidateComments());

        this.page = 0;
        this.comments = [];

        try {
            await this.fetchComments(true, showErrors);
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Show sync warnings if any.
     *
     * @param warnings the warnings
     */
    private showSyncWarnings(warnings: string[]): void {
        const message = CoreText.buildMessage(warnings);
        if (message) {
            CoreAlerts.show({ message });
        }
    }

    /**
     * Tries to synchronize comments.
     *
     * @param showErrors Whether to display errors or not.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    private async syncComments(showErrors: boolean): Promise<void> {
        try {
            const result = await CoreCommentsSync.syncComments(
                this.contextLevel,
                this.instanceId,
                this.componentName,
                this.itemId,
                this.area,
            );
            this.showSyncWarnings(result?.warnings || []);
        } catch (error) {
            if (showErrors) {
                CoreAlerts.showError(error, { default: Translate.instant('core.errorsync') });
            }

            throw new CoreError(error);
        }
    }

    /**
     * Send the comment or store it offline.
     *
     * @param text Comment text to add.
     */
    async addComment(text: string): Promise<void> {
        const loadingModal = await CoreLoadings.show('core.sending', true);
        // Freeze the add comment button.
        this.sending = true;
        try {
            const commentsResponse = await CoreComments.addComment(
                text,
                this.contextLevel,
                this.instanceId,
                this.componentName,
                this.itemId,
                this.area,
            );

            if (commentsResponse) {
                this.invalidateComments();

                const addedComment = await this.loadCommentProfile(commentsResponse);
                this.calculateCommentData(addedComment, this.comments[this.comments.length - 1]);

                // Add the comment to the top.
                this.comments = this.comments.concat([addedComment]);
                this.canDeleteComments = this.addDeleteCommentsAvailable;

                CoreEvents.trigger(CoreCommentsProvider.COMMENTS_COUNT_CHANGED_EVENT, {
                    contextLevel: this.contextLevel,
                    instanceId: this.instanceId,
                    component: this.componentName,
                    itemId: this.itemId,
                    area: this.area,
                    countChange: 1,
                }, CoreSites.getCurrentSiteId());

                this.refreshInBackground();

            } else if (commentsResponse === false) {
                // Comments added in offline mode.
                await this.loadOfflineData();
            }
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            this.sending = false;
            await loadingModal.dismiss();

            // New comments.
            this.scrollToBottom(true);
        }
    }

    /**
     * Delete a comment.
     *
     * @param comment Comment to delete.
     */
    async deleteComment(comment: CoreCommentsDataToDisplay | CoreCommentsOfflineWithUser): Promise<void> {
        const modified = 'lastmodified' in comment
            ? comment.lastmodified
            : comment.timecreated;
        const time = CoreTimeUtils.userDate(
            modified * 1000,
            'core.strftimerecentfull',
        );

        const deleteComment: CoreCommentsCommentBasicData = {
            contextlevel: this.contextLevel,
            instanceid: this.instanceId,
            component: this.componentName,
            itemid: this.itemId,
            area: this.area,
            content: comment.content,
            id: 'id' in comment ? comment.id : undefined,
        };

        try {
            await CoreAlerts.confirmDelete(Translate.instant('core.comments.deletecommentbyon', {
                $a: { user: comment.fullname || '', time: time },
            }));
        } catch {
            // User cancelled, nothing to do.
            return;
        }

        try {
            const deletedOnline = await CoreComments.deleteComment(deleteComment);
            this.showDelete = false;

            if (deletedOnline && 'id' in comment) {
                const index = this.comments.findIndex((commentinList) => commentinList.id == comment.id);

                if (index >= 0) {
                    this.comments.splice(index, 1);

                    CoreEvents.trigger(CoreCommentsProvider.COMMENTS_COUNT_CHANGED_EVENT, {
                        contextLevel: this.contextLevel,
                        instanceId: this.instanceId,
                        component: this.componentName,
                        itemId: this.itemId,
                        area: this.area,
                        countChange: -1,
                    }, CoreSites.getCurrentSiteId());

                    this.refreshInBackground();
                }
            } else {
                this.loadOfflineData();
            }

            this.invalidateComments();

            CoreToasts.show({
                message: 'core.comments.eventcommentdeleted',
                translateMessage: true,
                duration: ToastDuration.LONG,
            });
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Delete comment failed.' });
        }
    }

    /**
     * Invalidate comments.
     *
     * @returns Resolved when done.
     */
    protected invalidateComments(): Promise<void> {
        return CoreComments.invalidateCommentsData(
            this.contextLevel,
            this.instanceId,
            this.componentName,
            this.itemId,
            this.area,
        );
    }

    /**
     * Loads the profile info onto the comment object.
     *
     * @param comment Comment object.
     * @returns Promise resolved with modified comment when done.
     */
    protected async loadCommentProfile(comment: CoreCommentsDataToDisplay): Promise<CoreCommentsDataToDisplay> {
        if (!comment.userid) {
            return comment;
        }

        try {
            // Get the user profile image.
            const user = await CoreUser.getProfile(comment.userid, undefined, true);
            comment.profileimageurl = user.profileimageurl;
            comment.fullname = user.fullname;
        } catch {
            // Ignore errors.
        }

        return comment;

    }

    /**
     * Check if the user info should be displayed for the current message.
     * User data is only displayed if the previous message was from another user.
     *
     * @param comment Comment object.
     * @param prevComment Previous comment object.
     * @returns Whether user data should be shown.
     */
    protected showUserData(
        comment: CoreCommentsDataToDisplay,
        prevComment?: CoreCommentsDataToDisplay,
    ): boolean {
        return comment.userid != this.currentUserId && (!prevComment || prevComment.userid != comment.userid || !!comment.showDate);
    }

    /**
     * Check if a css tail should be shown.
     *
     * @param comment Comment object.
     * @param nextComment Previous comment object.
     * @returns Whether user data should be shown.
     */
    protected showTail(
        comment: CoreCommentsDataToDisplay,
        nextComment?: CoreCommentsDataToDisplay,
    ): boolean {
        return !nextComment || nextComment.userid != comment.userid || !!nextComment.showDate;
    }

    /**
     * Check if the date should be displayed between messages (when the day changes at midnight for example).
     *
     * @param comment Comment object.
     * @param prevComment Previous comment object.
     * @returns True if messages are from diferent days, false othetwise.
     */
    protected showDate(
        comment: CoreCommentsDataToDisplay,
        prevComment?: CoreCommentsDataToDisplay,
    ): boolean {
        if (!prevComment) {
            return true;
        }

        // Check if day has changed.
        return !moment(comment.timecreated * 1000).isSame(prevComment.timecreated * 1000, 'day');
    }

    /**
     * Load offline comments.
     *
     * @returns Promise resolved when done.
     */
    protected async loadOfflineData(): Promise<void> {
        const promises: Promise<void>[] = [];
        let hasDeletedComments = false;

        // Load the only offline comment allowed if any.
        promises.push(CoreCommentsOffline.getComment(
            this.contextLevel,
            this.instanceId,
            this.componentName,
            this.itemId,
            this.area,
        ).then(async (offlineComment) => {
            this.offlineComment = offlineComment;

            if (!this.offlineComment) {
                return;
            }

            if (this.newComment == '') {
                this.newComment = this.offlineComment.content;
            }

            this.offlineComment.userid = this.currentUserId;
            this.offlineComment.pending = true;

            return;
        }));

        // Load deleted comments offline.
        promises.push(CoreCommentsOffline.getDeletedComments(
            this.contextLevel,
            this.instanceId,
            this.componentName,
            this.itemId,
            this.area,
        ).then((deletedComments) => {
            hasDeletedComments = deletedComments && deletedComments.length > 0;

            if (hasDeletedComments) {
                deletedComments.forEach((deletedComment) => {
                    const comment = this.comments.find((comment) => comment.id == deletedComment.commentid);

                    if (comment) {
                        comment.deleted = !!deletedComment.deleted;
                    }
                });
            }

            return;
        }));

        await Promise.all(promises);

        this.hasOffline = !!this.offlineComment || hasDeletedComments;
    }

    /**
     * Restore a comment.
     *
     * @param comment Comment to delete.
     */
    async undoDeleteComment(comment: CoreCommentsDataToDisplay): Promise<void> {
        await CoreCommentsOffline.undoDeleteComment(comment.id);

        comment.deleted = false;
        this.showDelete = false;
    }

    /**
     * Scroll bottom when render has finished.
     *
     * @param force Whether to force scroll to bottom.
     */
    protected async scrollToBottom(force = false): Promise<void> {
        if (this.viewDestroyed) {
            return;
        }

        // Check if scroll is at bottom. If so, scroll bottom after rendering since there might be something new.
        if (!this.scrollBottom && !force) {
            return;
        }

        // Leave time for the view to be rendered.
        await CoreWait.nextTicks(5);

        if (!this.viewDestroyed && this.content) {
            this.content.scrollToBottom(0);
        }
    }

    /**
     * Toggle delete.
     */
    toggleDelete(): void {
        this.showDelete = !this.showDelete;
    }

    /**
     * Refresh cached data in background.
     */
    protected async refreshInBackground(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(this.invalidateComments());

        const promises: Promise<unknown>[] = [];

        for (let i = 0; i <= this.page; i++) {
            promises.push(CoreComments.getComments(
                this.contextLevel,
                this.instanceId,
                this.componentName,
                this.itemId,
                this.area,
                i,
            ));
        }

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.syncObserver?.off();
        this.onlineObserver.unsubscribe();
        this.viewDestroyed = true;
        this.keyboardObserver.off();
    }

}

export type CoreCommentsDataToDisplay = CoreCommentsData & {
    profileimageurl?: string;
    fullname?: string;
    deleted?: boolean;
    showDate?: boolean;
    showTail?: boolean;
    showUserData?: boolean;
};

export type CoreCommentsOfflineWithUser = CoreCommentsDBRecord & {
    profileimageurl?: string;
    fullname?: string;
    userid?: number;
    deleted?: boolean;
};
