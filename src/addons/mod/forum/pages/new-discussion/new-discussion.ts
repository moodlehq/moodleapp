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

import { Component, OnDestroy, ElementRef, OnInit, inject, viewChild } from '@angular/core';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { FormControl } from '@angular/forms';
import { CoreEvents, CoreEventObserver } from '@static/events';
import { CoreGroup, CoreGroups, CoreGroupsProvider } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import {
    AddonModForum,
    AddonModForumAccessInformation,
    AddonModForumCanAddDiscussion,
    AddonModForumData,
} from '@addons/mod/forum/services/forum';
import { CoreEditorRichTextEditorComponent } from '@features/editor/components/rich-text-editor/rich-text-editor';
import { AddonModForumSync } from '@addons/mod/forum/services/forum-sync';
import { CoreSites } from '@services/sites';
import { Translate } from '@singletons';
import { CoreSync } from '@services/sync';
import { AddonModForumDiscussionOptions, AddonModForumOffline } from '@addons/mod/forum/services/forum-offline';
import { CoreUtils } from '@static/utils';
import { AddonModForumHelper } from '@addons/mod/forum/services/forum-helper';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreText } from '@static/text';
import { CanLeave } from '@guards/can-leave';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreForms } from '@static/form';
import { AddonModForumDiscussionsSwipeManager } from '../../classes/forum-discussions-swipe-manager';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AddonModForumDiscussionsSource } from '../../classes/forum-discussions-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreTime } from '@static/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_FORUM_ALL_GROUPS,
    ADDON_MOD_FORUM_ALL_PARTICIPANTS,
    ADDON_MOD_FORUM_AUTO_SYNCED,
    ADDON_MOD_FORUM_COMPONENT,
    ADDON_MOD_FORUM_COMPONENT_LEGACY,
    ADDON_MOD_FORUM_NEW_DISCUSSION_EVENT,
} from '../../constants';
import CoreCourseContentsPage from '@features/course/pages/contents/contents';
import { CoreLoadings } from '@services/overlays/loadings';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

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
    styleUrl: 'new-discussion.scss',
    imports: [
        CoreSharedModule,
        CoreEditorRichTextEditorComponent,
    ],
})
export default class AddonModForumNewDiscussionPage implements OnInit, OnDestroy, CanLeave {

    readonly formElement = viewChild<ElementRef>('newDiscFormEl');
    readonly messageEditor = viewChild(CoreEditorRichTextEditorComponent);

    component = ADDON_MOD_FORUM_COMPONENT_LEGACY;
    messageControl = new FormControl<string | null>(null);
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
    courseId!: number;
    postInGroupMessage?: string;

    discussions?: AddonModForumNewDiscussionDiscussionsSwipeManager;

    protected cmId!: number;
    protected forumId!: number;
    protected timeCreated!: number;
    protected syncId!: string;
    protected syncObserver?: CoreEventObserver;
    protected isDestroyed = false;
    protected originalData?: Partial<NewDiscussionData>;
    protected forceLeave = false;
    protected initialGroupId?: number;
    protected logView: () => void;
    protected route = inject(ActivatedRoute);
    protected splitView = inject(CoreSplitViewComponent, { optional: true });
    protected courseContentsPage = inject(CoreCourseContentsPage, { optional: true });

    constructor() {
        this.logView = CoreTime.once(() => {
            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_forum_add_discussion',
                name: Translate.instant('addon.mod_forum.addanewdiscussion'),
                data: { id: this.forumId, category: 'forum' },
                url: '/mod/forum/post.php',
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            const routeData = CoreNavigator.getRouteData(this.route);
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.forumId = CoreNavigator.getRequiredRouteNumberParam('forumId');
            this.timeCreated = CoreNavigator.getRequiredRouteNumberParam('timeCreated');
            this.initialGroupId = CoreNavigator.getRouteNumberParam('groupId');

            // Discussion list uses 0 for all participants, but this page WebServices use a different value. Convert it.
            this.initialGroupId = this.initialGroupId === 0 ? ADDON_MOD_FORUM_ALL_PARTICIPANTS : this.initialGroupId;

            if (this.timeCreated !== 0 && (routeData.swipeEnabled ?? true)) {
                const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                    AddonModForumDiscussionsSource,
                    [this.courseId, this.cmId, routeData.discussionsPathPrefix ?? ''],
                );

                this.discussions = new AddonModForumNewDiscussionDiscussionsSwipeManager(source);

                await this.discussions.start();
            }
        } catch (error) {
            CoreAlerts.showError(error);

            this.goBack();

            return;
        }

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
        this.syncObserver = CoreEvents.on(ADDON_MOD_FORUM_AUTO_SYNCED, data => {
            if (data.forumId == this.forumId && data.userId == CoreSites.getCurrentSiteUserId()) {
                CoreAlerts.show({
                    header: Translate.instant('core.notice'),
                    message: Translate.instant('core.contenteditingsynced'),
                });
                this.returnToDiscussions();
            }
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * Fetch if forum uses groups and the groups it uses.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Promise resolved when done.
     */
    protected async fetchDiscussionData(refresh?: boolean): Promise<void> {
        try {
            const mode = await CoreGroups.getActivityGroupMode(this.cmId);
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
                            return promise.then(async (forumGroups) => {
                                if (forumGroups.length > 0) {
                                    this.groups = forumGroups;
                                    this.groupIds = forumGroups.map((group) => group.id).filter((id) => id > 0);
                                    // Do not override group id.
                                    this.newDiscussion.groupId = this.newDiscussion.groupId || this.getInitialGroupId();
                                    this.showGroups = true;
                                    await this.calculateGroupName();
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
                    CorePromiseUtils.ignoreErrors(
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
            promises.push(AddonModForum.getForum(this.courseId, this.cmId).then((forum) => this.forum = forum));

            // Get access information.
            promises.push(
                AddonModForum.instance
                    .getAccessInformation(this.forumId, { cmId: this.cmId })
                    .then((accessInfo) => this.accessInfo = accessInfo),
            );

            await Promise.all(promises);

            // If editing a discussion, get offline data.
            if (this.timeCreated && !refresh) {
                this.syncId = AddonModForumSync.getForumSyncId(this.forumId);

                await AddonModForumSync.waitForSync(this.syncId).then(() => {
                    // Do not block if the scope is already destroyed.
                    if (!this.isDestroyed) {
                        CoreSync.blockOperation(ADDON_MOD_FORUM_COMPONENT, this.syncId);
                    }

                    return AddonModForumOffline.instance
                        .getNewDiscussion(this.forumId, this.timeCreated)
                        .then(async (discussion) => {
                            this.hasOffline = true;
                            discussion.options = discussion.options || {};
                            if (discussion.groupid == ADDON_MOD_FORUM_ALL_GROUPS) {
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
                            await this.calculateGroupName();

                            // Treat offline attachments if any.
                            if (typeof discussion.options.attachmentsid === 'object' && discussion.options.attachmentsid.offline) {
                                const files = await AddonModForumHelper.getNewDiscussionStoredFiles(
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

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_forum.errorgetgroups') });

            this.showForm = false;
        }
    }

    /**
     * Validate which of the groups returned by getActivityAllowedGroups in visible groups should be shown to post to.
     *
     * @param forumGroups Forum groups.
     * @returns Promise resolved with the list of groups.
     */
    protected async validateVisibleGroups(forumGroups: CoreGroup[]): Promise<CoreGroup[]> {
        let response: AddonModForumCanAddDiscussion;

        // We first check if the user can post to all the groups.
        try {
            response = await AddonModForum.canAddDiscussionToAll(this.forumId, { cmId: this.cmId });
        } catch {
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
     * @returns Filtered groups.
     */
    protected filterGroups(forumGroups: CoreGroup[], userGroups: CoreGroup[]): CoreGroup[] {
        const userGroupsIds = userGroups.map(group => group.id);

        return forumGroups.filter(forumGroup => userGroupsIds.indexOf(forumGroup.id) > -1);
    }

    /**
     * Get the initial group ID.
     *
     * @returns Initial group ID.
     */
    protected getInitialGroupId(): number {
        return (this.initialGroupId && this.groups.find(group => group.id === this.initialGroupId)) ?
            this.initialGroupId : this.groups[0].id;
    }

    /**
     * Add the "All participants" option to a list of groups if the user can add a discussion to all participants.
     *
     * @param groups Groups.
     * @param check True to check if the user can add a discussion to all participants.
     * @returns Promise resolved with the list of groups.
     */
    protected addAllParticipantsOption(groups: CoreGroup[], check: boolean): Promise<CoreGroup[]> {
        let promise: Promise<boolean>;

        if (check) {
            // We need to check if the user can add a discussion to all participants.
            promise = AddonModForum.canAddDiscussionToAll(this.forumId, { cmId: this.cmId }).then((response) => {
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
                    id: ADDON_MOD_FORUM_ALL_PARTICIPANTS,
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
    refreshGroups(refresher?: HTMLIonRefresherElement): void {
        const promises = [
            CoreGroups.invalidateActivityGroupMode(this.cmId),
            CoreGroups.invalidateActivityAllowedGroups(this.cmId),
            AddonModForum.invalidateCanAddDiscussion(this.forumId),
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
        this.forceLeave = true;

        // Delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(this.newDiscussion.files);

        CoreEvents.trigger(
            ADDON_MOD_FORUM_NEW_DISCUSSION_EVENT,
            {
                forumId: this.forumId,
                cmId: this.cmId,
                discussionIds: discussionIds,
                discTimecreated: discTimecreated,
                groupId: this.showGroups && !this.newDiscussion.postToAllGroups ? this.newDiscussion.groupId : undefined,
            },
            CoreSites.getCurrentSiteId(),
        );

        if (this.splitView?.outletActivated) {
            // Empty form.
            this.hasOffline = false;
            this.newDiscussion.subject = '';
            this.newDiscussion.message = null;
            this.newDiscussion.files = [];
            this.newDiscussion.postToAllGroups = false;
            this.messageEditor()?.clearText();
            this.originalData = CoreUtils.clone(this.newDiscussion);
        } else {
            CoreNavigator.back();
        }
    }

    /**
     * Message changed.
     *
     * @param text The new text.
     */
    onMessageChange(text?: string | null): void {
        this.newDiscussion.message = text ?? null;
    }

    /**
     * Add a new discussion.
     */
    async add(): Promise<void> {
        const forumName = this.forum.name;
        const subject = this.newDiscussion.subject;
        let message = this.newDiscussion.message || '';
        const pin = this.newDiscussion.pin;
        const attachments = this.newDiscussion.files;
        const discTimecreated = this.timeCreated || Date.now();
        const options: AddonModForumDiscussionOptions = {
            discussionsubscribe: !!this.newDiscussion.subscribe,
        };

        if (!subject) {
            CoreAlerts.showError(Translate.instant('addon.mod_forum.erroremptysubject'));

            return;
        }
        if (!message) {
            CoreAlerts.showError(Translate.instant('addon.mod_forum.erroremptymessage'));

            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        // Add some HTML to the message if needed.
        message = CoreText.formatHtmlLines(message);

        if (pin) {
            options.discussionpinned = true;
        }

        const groupIds = this.newDiscussion.postToAllGroups ? this.groupIds : [this.newDiscussion.groupId];

        try {
            const discussionIds = await AddonModForumHelper.addNewDiscussion(
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
                AddonModForumHelper.deleteNewDiscussionStoredFiles(this.forumId, discTimecreated);

                CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'forum' });
            }

            if (discussionIds && discussionIds.length < groupIds.length) {
                // Some discussions could not be created.
                CoreAlerts.showError(Translate.instant('addon.mod_forum.errorposttoallgroups'));
            }

            CoreForms.triggerFormSubmittedEvent(
                this.formElement(),
                !!discussionIds,
                CoreSites.getCurrentSiteId(),
            );

            this.returnToDiscussions(discussionIds, discTimecreated);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_forum.cannotcreatediscussion') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Discard an offline saved discussion.
     */
    async discard(): Promise<void> {
        try {
            await CoreAlerts.confirm(Translate.instant('core.areyousure'));

            const promises: Promise<unknown>[] = [];

            promises.push(AddonModForumOffline.deleteNewDiscussion(this.forumId, this.timeCreated));
            promises.push(
                CorePromiseUtils.ignoreErrors(
                    AddonModForumHelper.deleteNewDiscussionStoredFiles(this.forumId, this.timeCreated),
                ),
            );

            await Promise.all(promises);

            CoreForms.triggerFormCancelledEvent(this.formElement(), CoreSites.getCurrentSiteId());

            this.returnToDiscussions();
        } catch {
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
     * Calculate current group's name.
     */
    async calculateGroupName(): Promise<void> {
        if (this.newDiscussion.groupId <= 0) {
            this.postInGroupMessage = undefined;
        } else {
            const groupName = this.groups.find(group => group.id === this.newDiscussion.groupId)?.name;

            this.postInGroupMessage = groupName && Translate.instant('addon.mod_forum.postingroup', { groupname: groupName });
        }
    }

    /**
     * Check if we can leave the page or not.
     *
     * @returns Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (this.forceLeave) {
            return true;
        }

        if (AddonModForumHelper.hasPostDataChanged(this.newDiscussion, this.originalData)) {
            // Show confirmation if some data has been modified.
            await CoreAlerts.confirmLeaveWithChanges();
        }

        // Delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(this.newDiscussion.files);

        const formElement = this.formElement();
        if (formElement) {
            CoreForms.triggerFormCancelledEvent(formElement, CoreSites.getCurrentSiteId());
        }

        return true;
    }

    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.syncObserver && this.syncObserver.off();
        delete this.syncObserver;
    }

    /**
     * Helper function to go back.
     */
    protected goBack(): void {
        if (this.splitView?.outletActivated) {
            CoreNavigator.navigate((this.courseContentsPage ? '../' : '') + '../../');
        } else {
            CoreNavigator.back();
        }
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        if (this.syncId) {
            CoreSync.unblockOperation(ADDON_MOD_FORUM_COMPONENT, this.syncId);
        }
        this.isDestroyed = true;
        this.discussions?.destroy();
    }

}

/**
 * Helper to manage swiping within a collection of discussions.
 */
class AddonModForumNewDiscussionDiscussionsSwipeManager extends AddonModForumDiscussionsSwipeManager {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        const params = CoreNavigator.getRouteParams(route);

        return `${this.getSource().discussionsPathPrefix}new/${params.timeCreated}`;
    }

}
