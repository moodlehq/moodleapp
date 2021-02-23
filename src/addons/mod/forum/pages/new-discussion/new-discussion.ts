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

import { Component, OnDestroy, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FileEntry } from '@ionic-native/file/ngx';
import { FormControl } from '@angular/forms';
import { CoreEvents, CoreEventObserver } from '@singletons/events';
import { CoreGroup, CoreGroups, CoreGroupsProvider } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import {
    AddonModForum,
    AddonModForumAccessInformation,
    AddonModForumCanAddDiscussion,
    AddonModForumData,
    AddonModForumProvider,
} from '@addons/mod/forum/services/forum.service';
import { CoreEditorRichTextEditorComponent } from '@features/editor/components/rich-text-editor/rich-text-editor';
import { AddonModForumSync, AddonModForumSyncProvider } from '@addons/mod/forum/services/sync.service';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import { CoreSync } from '@services/sync';
import { AddonModForumDiscussionOptions, AddonModForumOffline } from '@addons/mod/forum/services/offline.service';
import { CoreUtils } from '@services/utils/utils';
import { AddonModForumHelper } from '@addons/mod/forum/services/helper.service';
import { IonRefresher } from '@ionic/angular';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreTextUtils } from '@services/utils/text';

type NewDiscussionData = {
    subject: string;
    message: string | null; // Null means empty or just white space.
    postToAllGroups: boolean;
    groupId: number;
    subscribe: boolean;
    pin: boolean;
    files: FileEntry[];
};

/**
 * Page that displays the new discussion form.
 */
@Component({
    selector: 'page-addon-mod-forum-new-discussion',
    templateUrl: 'new-discussion.html',
})
export class AddonModForumNewDiscussionPage implements OnInit, OnDestroy {

    @ViewChild('newDiscFormEl') formElement!: ElementRef;
    @ViewChild(CoreEditorRichTextEditorComponent) messageEditor!: CoreEditorRichTextEditorComponent;

    component = AddonModForumProvider.COMPONENT;
    messageControl = new FormControl();
    groupsLoaded = false;
    showGroups = false;
    hasOffline = false;
    canCreateAttachments = true; // Assume we can by default.
    canPin = false;
    forum!: AddonModForumData;
    showForm = false;
    groups: CoreGroup[] = [];
    groupIds: number[] = [];
    newDiscussion: NewDiscussionData = {
        subject: '',
        message: null,
        postToAllGroups: false,
        groupId: 0,
        subscribe: true,
        pin: false,
        files: [],
    };

    advanced = false; // Display all form fields.
    accessInfo: AddonModForumAccessInformation = {};

    protected courseId!: number;
    protected cmId!: number;
    protected forumId!: number;
    protected timeCreated!: number;
    protected syncId!: string;
    protected syncObserver?: CoreEventObserver;
    protected isDestroyed = false;
    protected originalData?: Partial<NewDiscussionData>;
    protected forceLeave = false;

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.courseId = CoreNavigator.instance.getRouteNumberParam('courseId')!;
        this.cmId = CoreNavigator.instance.getRouteNumberParam('cmId')!;
        this.forumId = CoreNavigator.instance.getRouteNumberParam('forumId')!;
        this.timeCreated = CoreNavigator.instance.getRouteNumberParam('timeCreated')!;

        this.fetchDiscussionData().finally(() => {
            this.groupsLoaded = true;
        });
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        if (this.syncObserver) {
            // Already setup.
            return;
        }

        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = CoreEvents.on(AddonModForumSyncProvider.AUTO_SYNCED, (data: any) => {
            if (data.forumId == this.forumId && data.userId == CoreSites.instance.getCurrentSiteUserId()) {
                CoreDomUtils.instance.showAlertTranslated('core.notice', 'core.contenteditingsynced');
                this.returnToDiscussions();
            }
        }, CoreSites.instance.getCurrentSiteId());

        // Trigger view event, to highlight the current opened discussion in the split view.
        CoreEvents.trigger(AddonModForumProvider.VIEW_DISCUSSION_EVENT, {
            forumId: this.forumId,
            discussion: -this.timeCreated,
        }, CoreSites.instance.getCurrentSiteId());
    }

    /**
     * Fetch if forum uses groups and the groups it uses.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchDiscussionData(refresh?: boolean): Promise<void> {
        try {
            const mode = await CoreGroups.instance.getActivityGroupMode(this.cmId);
            const promises: Promise<unknown>[] = [];

            if (mode === CoreGroupsProvider.SEPARATEGROUPS || mode === CoreGroupsProvider.VISIBLEGROUPS) {
                promises.push(
                    CoreGroups.instance
                        .getActivityAllowedGroups(this.cmId)
                        .then((result) => {
                            let promise;
                            if (mode === CoreGroupsProvider.VISIBLEGROUPS) {
                                // We need to check which of the returned groups the user can post to.
                                promise = this.validateVisibleGroups(result.groups);
                            } else {
                                // WS already filters groups, no need to do it ourselves. Add "All participants" if needed.
                                promise = this.addAllParticipantsOption(result.groups, true);
                            }

                            // eslint-disable-next-line promise/no-nesting
                            return promise.then((forumGroups) => {
                                if (forumGroups.length > 0) {
                                    this.groups = forumGroups;
                                    this.groupIds = forumGroups.map((group) => group.id).filter((id) => id > 0);
                                    // Do not override group id.
                                    this.newDiscussion.groupId = this.newDiscussion.groupId || forumGroups[0].id;
                                    this.showGroups = true;
                                    if (this.groupIds.length <= 1) {
                                        this.newDiscussion.postToAllGroups = false;
                                    }

                                    return;
                                } else {
                                    const message = mode === CoreGroupsProvider.SEPARATEGROUPS ?
                                        'addon.mod_forum.cannotadddiscussionall' : 'addon.mod_forum.cannotadddiscussion';

                                    throw new Error(Translate.instant(message));
                                }
                            });
                        }),
                );
            } else {
                this.showGroups = false;
                this.newDiscussion.postToAllGroups = false;

                // Use the canAddDiscussion WS to check if the user can add attachments and pin discussions.
                promises.push(
                    CoreUtils.instance.ignoreErrors(
                        AddonModForum.instance
                            .canAddDiscussionToAll(this.forumId, { cmId: this.cmId })
                            .then((response) => {
                                this.canPin = !!response.canpindiscussions;
                                this.canCreateAttachments = !!response.cancreateattachment;

                                return;
                            }),
                    ),
                );
            }

            // Get forum.
            promises.push(AddonModForum.instance.getForum(this.courseId, this.cmId).then((forum) => this.forum = forum));

            // Get access information.
            promises.push(
                AddonModForum.instance
                    .getAccessInformation(this.forumId, { cmId: this.cmId })
                    .then((accessInfo) => this.accessInfo = accessInfo),
            );

            await Promise.all(promises);

            // If editing a discussion, get offline data.
            if (this.timeCreated && !refresh) {
                this.syncId = AddonModForumSync.instance.getForumSyncId(this.forumId);

                await AddonModForumSync.instance.waitForSync(this.syncId).then(() => {
                    // Do not block if the scope is already destroyed.
                    if (!this.isDestroyed) {
                        CoreSync.instance.blockOperation(AddonModForumProvider.COMPONENT, this.syncId);
                    }

                    // eslint-disable-next-line promise/no-nesting
                    return AddonModForumOffline.instance
                        .getNewDiscussion(this.forumId, this.timeCreated)
                        .then(async (discussion) => {
                            this.hasOffline = true;
                            discussion.options = discussion.options || {};
                            if (discussion.groupid == AddonModForumProvider.ALL_GROUPS) {
                                this.newDiscussion.groupId = this.groups[0].id;
                                this.newDiscussion.postToAllGroups = true;
                            } else {
                                this.newDiscussion.groupId = discussion.groupid;
                                this.newDiscussion.postToAllGroups = false;
                            }
                            this.newDiscussion.subject = discussion.subject;
                            this.newDiscussion.message = discussion.message;
                            this.newDiscussion.subscribe = !!discussion.options.discussionsubscribe;
                            this.newDiscussion.pin = !!discussion.options.discussionpinned;
                            this.messageControl.setValue(discussion.message);

                            // Treat offline attachments if any.
                            if (typeof discussion.options.attachmentsid === 'object' && discussion.options.attachmentsid.offline) {
                                const files = await AddonModForumHelper.instance.getNewDiscussionStoredFiles(
                                    this.forumId,
                                    this.timeCreated,
                                );

                                this.newDiscussion.files = files;
                            }

                            // Show advanced fields by default if any of them has not the default value.
                            if (
                                !this.newDiscussion.subscribe ||
                                this.newDiscussion.pin ||
                                this.newDiscussion.files.length ||
                                this.groups.length > 0 && this.newDiscussion.groupId != this.groups[0].id ||
                                this.newDiscussion.postToAllGroups
                            ) {
                                this.advanced = true;
                            }

                            return;
                        });
                });
            }

            if (!this.originalData) {
                // Initialize original data.
                this.originalData = {
                    subject: this.newDiscussion.subject,
                    message: this.newDiscussion.message,
                    files: this.newDiscussion.files.slice(),
                };
            }

            this.showForm = true;
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'addon.mod_forum.errorgetgroups', true);

            this.showForm = false;
        }
    }

    /**
     * Validate which of the groups returned by getActivityAllowedGroups in visible groups should be shown to post to.
     *
     * @param forumGroups Forum groups.
     * @return Promise resolved with the list of groups.
     */
    protected async validateVisibleGroups(forumGroups: CoreGroup[]): Promise<CoreGroup[]> {
        let response: AddonModForumCanAddDiscussion;

        // We first check if the user can post to all the groups.
        try {
            response = await AddonModForum.instance.canAddDiscussionToAll(this.forumId, { cmId: this.cmId });
        } catch (error) {
            // The call failed, let's assume he can't.
            response = {
                status: false,
                canpindiscussions: false,
                cancreateattachment: true,
            };
        }

        this.canPin = !!response.canpindiscussions;
        this.canCreateAttachments = !!response.cancreateattachment;

        // The user can post to all groups, add the "All participants" option and return them all.
        if (response.status) {
            return this.addAllParticipantsOption(forumGroups, false);
        }

        // The user can't post to all groups, let's check which groups he can post to.
        const promises: Promise<unknown>[] = [];
        const filtered: CoreGroup[] = [];

        forumGroups.forEach((group) => {
            promises.push(
                AddonModForum.instance
                    .canAddDiscussion(this.forumId, group.id, { cmId: this.cmId })

                    // The call failed, let's return true so the group is shown.
                    // If the user can't post to it an error will be shown when he tries to add the discussion.
                    .catch(() =>({ status: true }))

                    .then((response) => {
                        if (response.status) {
                            filtered.push(group);
                        }

                        return;
                    }),
            );
        });

        await Promise.all(promises);

        return filtered;
    }

    /**
     * Filter forum groups, returning only those that are inside user groups.
     *
     * @param forumGroups Forum groups.
     * @param userGroups User groups.
     * @return Filtered groups.
     */
    protected filterGroups(forumGroups: CoreGroup[], userGroups: CoreGroup[]): CoreGroup[] {
        const userGroupsIds = userGroups.map(group => group.id);

        return forumGroups.filter(forumGroup => userGroupsIds.indexOf(forumGroup.id) > -1);
    }

    /**
     * Add the "All participants" option to a list of groups if the user can add a discussion to all participants.
     *
     * @param groups Groups.
     * @param check True to check if the user can add a discussion to all participants.
     * @return Promise resolved with the list of groups.
     */
    protected addAllParticipantsOption(groups: CoreGroup[], check: boolean): Promise<CoreGroup[]> {
        if (!AddonModForum.instance.isAllParticipantsFixed()) {
            // All participants has a bug, don't add it.
            return Promise.resolve(groups);
        }

        let promise;

        if (check) {
            // We need to check if the user can add a discussion to all participants.
            promise = AddonModForum.instance.canAddDiscussionToAll(this.forumId, { cmId: this.cmId }).then((response) => {
                this.canPin = !!response.canpindiscussions;
                this.canCreateAttachments = !!response.cancreateattachment;

                return response.status;
            }).catch(() =>
                // The call failed, let's assume he can't.
                false);
        } else {
            // No need to check, assume the user can.
            promise = Promise.resolve(true);
        }

        return promise.then((canAdd) => {
            if (canAdd) {
                groups.unshift({
                    courseid: this.courseId,
                    id: AddonModForumProvider.ALL_PARTICIPANTS,
                    name: Translate.instant('core.allparticipants'),
                });
            }

            return groups;
        });
    }

    /**
     * Pull to refresh.
     *
     * @param refresher Refresher.
     */
    refreshGroups(refresher?: IonRefresher): void {
        const promises = [
            CoreGroups.instance.invalidateActivityGroupMode(this.cmId),
            CoreGroups.instance.invalidateActivityAllowedGroups(this.cmId),
            AddonModForum.instance.invalidateCanAddDiscussion(this.forumId),
        ];

        Promise.all(promises).finally(() => {
            this.fetchDiscussionData(true).finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Convenience function to update or return to discussions depending on device.
     *
     * @param discussionIds Ids of the new discussions.
     * @param discTimecreated The time created of the discussion (if offline).
     */
    protected returnToDiscussions(discussionIds?: number[] | null, discTimecreated?: number): void {
        const data: any = {
            forumId: this.forumId,
            cmId: this.cmId,
            discussionIds: discussionIds,
            discTimecreated: discTimecreated,
        };
        CoreEvents.trigger(AddonModForumProvider.NEW_DISCUSSION_EVENT, data, CoreSites.instance.getCurrentSiteId());

        // Delete the local files from the tmp folder.
        CoreFileUploader.instance.clearTmpFiles(this.newDiscussion.files);
    }

    /**
     * Message changed.
     *
     * @param text The new text.
     */
    onMessageChange(text: string): void {
        this.newDiscussion.message = text;
    }

    /**
     * Add a new discussion.
     */
    async add(): Promise<void> {
        const forumName = this.forum.name;
        const subject = this.newDiscussion.subject;
        let  message = this.newDiscussion.message || '';
        const pin = this.newDiscussion.pin;
        const attachments = this.newDiscussion.files;
        const discTimecreated = this.timeCreated || Date.now();
        const options: AddonModForumDiscussionOptions = {
            discussionsubscribe: !!this.newDiscussion.subscribe,
        };

        if (!subject) {
            CoreDomUtils.instance.showErrorModal('addon.mod_forum.erroremptysubject', true);

            return;
        }
        if (!message) {
            CoreDomUtils.instance.showErrorModal('addon.mod_forum.erroremptymessage', true);

            return;
        }

        const modal = await CoreDomUtils.instance.showModalLoading('core.sending', true);

        // Add some HTML to the message if needed.
        message = CoreTextUtils.instance.formatHtmlLines(message);

        if (pin) {
            options.discussionpinned = true;
        }

        const groupIds = this.newDiscussion.postToAllGroups ? this.groupIds : [this.newDiscussion.groupId];

        try {
            const discussionIds = await AddonModForumHelper.instance.addNewDiscussion(
                this.forumId,
                forumName,
                this.courseId,
                subject,
                message,
                attachments,
                options,
                groupIds,
                discTimecreated,
            );

            if (discussionIds) {
                // Data sent to server, delete stored files (if any).
                AddonModForumHelper.instance.deleteNewDiscussionStoredFiles(this.forumId, discTimecreated);

                CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'forum' });
            }

            if (discussionIds && discussionIds.length < groupIds.length) {
                // Some discussions could not be created.
                CoreDomUtils.instance.showErrorModalDefault(null, 'addon.mod_forum.errorposttoallgroups', true);
            }

            CoreDomUtils.instance.triggerFormSubmittedEvent(
                this.formElement,
                !!discussionIds,
                CoreSites.instance.getCurrentSiteId(),
            );

            this.returnToDiscussions(discussionIds, discTimecreated);
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'addon.mod_forum.cannotcreatediscussion', true);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Discard an offline saved discussion.
     */
    async discard(): Promise<void> {
        try {
            await CoreDomUtils.instance.showConfirm(Translate.instant('core.areyousure'));

            const promises: Promise<unknown>[] = [];

            promises.push(AddonModForumOffline.instance.deleteNewDiscussion(this.forumId, this.timeCreated));
            promises.push(
                CoreUtils.instance.ignoreErrors(
                    AddonModForumHelper.instance.deleteNewDiscussionStoredFiles(this.forumId, this.timeCreated),
                ),
            );

            await Promise.all(promises);

            CoreDomUtils.instance.triggerFormCancelledEvent(this.formElement, CoreSites.instance.getCurrentSiteId());

            this.returnToDiscussions();
        } catch (error) {
            // Cancelled.
        }
    }

    /**
     * Show or hide advanced form fields.
     */
    toggleAdvanced(): void {
        this.advanced = !this.advanced;
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    async ionViewCanLeave(): Promise<void> {
        if (this.forceLeave) {
            return;
        }

        if (AddonModForumHelper.instance.hasPostDataChanged(this.newDiscussion, this.originalData)) {
            // Show confirmation if some data has been modified.
            await CoreDomUtils.instance.showConfirm(Translate.instant('core.confirmcanceledit'));
        }

        // Delete the local files from the tmp folder.
        CoreFileUploader.instance.clearTmpFiles(this.newDiscussion.files);

        if (this.formElement) {
            CoreDomUtils.instance.triggerFormCancelledEvent(this.formElement, CoreSites.instance.getCurrentSiteId());
        }
    }

    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.syncObserver && this.syncObserver.off();
        delete this.syncObserver;
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        if (this.syncId) {
            CoreSync.instance.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
        }
        this.isDestroyed = true;
    }

}
