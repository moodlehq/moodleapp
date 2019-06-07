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

import { Component, OnDestroy, Optional, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreRichTextEditorComponent } from '@components/rich-text-editor/rich-text-editor.ts';
import { AddonModForumProvider } from '../../providers/forum';
import { AddonModForumOfflineProvider } from '../../providers/offline';
import { AddonModForumHelperProvider } from '../../providers/helper';
import { AddonModForumSyncProvider } from '../../providers/sync';

/**
 * Page that displays the new discussion form.
 */
@IonicPage({ segment: 'addon-mod-forum-new-discussion' })
@Component({
    selector: 'page-addon-mod-forum-new-discussion',
    templateUrl: 'new-discussion.html',
})
export class AddonModForumNewDiscussionPage implements OnDestroy {

    @ViewChild(CoreRichTextEditorComponent) messageEditor: CoreRichTextEditorComponent;

    component = AddonModForumProvider.COMPONENT;
    messageControl = new FormControl();
    groupsLoaded = false;
    showGroups = false;
    hasOffline = false;
    canCreateAttachments = true; // Assume we can by default.
    canPin = false;
    forum: any;
    showForm = false;
    groups = [];
    groupIds = [];
    newDiscussion = {
        subject: '',
        message: null, // Null means empty or just white space.
        postToAllGroups: false,
        groupId: 0,
        subscribe: true,
        pin: false,
        files: []
    };
    advanced = false; // Display all form fields.
    accessInfo: any = {};

    protected courseId: number;
    protected cmId: number;
    protected forumId: number;
    protected timeCreated: number;
    protected syncId: string;
    protected syncObserver: any;
    protected isDestroyed = false;
    protected originalData: any;

    constructor(navParams: NavParams,
            private navCtrl: NavController,
            private translate: TranslateService,
            private domUtils: CoreDomUtilsProvider,
            private eventsProvider: CoreEventsProvider,
            private groupsProvider: CoreGroupsProvider,
            private sitesProvider: CoreSitesProvider,
            private syncProvider: CoreSyncProvider,
            private uploaderProvider: CoreFileUploaderProvider,
            private textUtils: CoreTextUtilsProvider,
            private utils: CoreUtilsProvider,
            private forumProvider: AddonModForumProvider,
            private forumOffline: AddonModForumOfflineProvider,
            private forumSync: AddonModForumSyncProvider,
            private forumHelper: AddonModForumHelperProvider,
            @Optional() private svComponent: CoreSplitViewComponent) {
        this.courseId = navParams.get('courseId');
        this.cmId = navParams.get('cmId');
        this.forumId = navParams.get('forumId');
        this.timeCreated = navParams.get('timeCreated');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchDiscussionData().finally(() => {
            this.groupsLoaded = true;
        });
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = this.eventsProvider.on(AddonModForumSyncProvider.AUTO_SYNCED, (data) => {
            if (data.forumId == this.forumId && data.userId == this.sitesProvider.getCurrentSiteUserId()) {
                this.domUtils.showAlertTranslated('core.notice', 'core.contenteditingsynced');
                this.returnToDiscussions();
            }
        }, this.sitesProvider.getCurrentSiteId());

        // Trigger view event, to highlight the current opened discussion in the split view.
        this.eventsProvider.trigger(AddonModForumProvider.VIEW_DISCUSSION_EVENT, {
            forumId: this.forumId,
            discussion: -this.timeCreated
        }, this.sitesProvider.getCurrentSiteId());
    }

    /**
     * Fetch if forum uses groups and the groups it uses.
     *
     * @param  {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchDiscussionData(refresh?: boolean): Promise<any> {
        return this.groupsProvider.getActivityGroupMode(this.cmId).then((mode) => {
            const promises = [];

            if (mode === CoreGroupsProvider.SEPARATEGROUPS || mode === CoreGroupsProvider.VISIBLEGROUPS) {
                promises.push(this.groupsProvider.getActivityAllowedGroups(this.cmId).then((forumGroups) => {
                    let promise;
                    if (mode === CoreGroupsProvider.VISIBLEGROUPS) {
                        // We need to check which of the returned groups the user can post to.
                        promise = this.validateVisibleGroups(forumGroups);
                    } else {
                        // WS already filters groups, no need to do it ourselves. Add "All participants" if needed.
                        promise = this.addAllParticipantsOption(forumGroups, true);
                    }

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
                        } else {
                            const message = mode === CoreGroupsProvider.SEPARATEGROUPS ?
                                    'addon.mod_forum.cannotadddiscussionall' : 'addon.mod_forum.cannotadddiscussion';

                            return Promise.reject(this.translate.instant(message));
                        }
                    });
                }));
            } else {
                this.showGroups = false;
                this.newDiscussion.postToAllGroups = false;

                // Use the canAddDiscussion WS to check if the user can add attachments and pin discussions.
                promises.push(this.forumProvider.canAddDiscussionToAll(this.forumId).then((response) => {
                    this.canPin = !!response.canpindiscussions;
                    this.canCreateAttachments = !!response.cancreateattachment;
                }).catch(() => {
                    // Ignore errors, use default values.
                }));
            }

            // Get forum.
            promises.push(this.forumProvider.getForum(this.courseId, this.cmId).then((forum) => {
                this.forum = forum;
            }));

            // Get access information.
            promises.push(this.forumProvider.getAccessInformation(this.forumId).then((accessInfo) => {
                this.accessInfo = accessInfo;
            }));

            return Promise.all(promises);
        }).then(() => {
            // If editing a discussion, get offline data.
            if (this.timeCreated && !refresh) {
                this.syncId = this.forumSync.getForumSyncId(this.forumId);

                return this.forumSync.waitForSync(this.syncId).then(() => {
                    // Do not block if the scope is already destroyed.
                    if (!this.isDestroyed) {
                        this.syncProvider.blockOperation(AddonModForumProvider.COMPONENT, this.syncId);
                    }

                    return this.forumOffline.getNewDiscussion(this.forumId, this.timeCreated).then((discussion) => {
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
                        this.newDiscussion.subscribe = discussion.options.discussionsubscribe;
                        this.newDiscussion.pin = discussion.options.discussionpinned;
                        this.messageControl.setValue(discussion.message);

                        // Treat offline attachments if any.
                        let promise;
                        if (discussion.options.attachmentsid && discussion.options.attachmentsid.offline) {
                            promise = this.forumHelper.getNewDiscussionStoredFiles(this.forumId, this.timeCreated).then((files) => {
                                this.newDiscussion.files = files;
                            });
                        }

                        return Promise.resolve(promise).then(() => {
                            // Show advanced fields by default if any of them has not the default value.
                            if (!this.newDiscussion.subscribe || this.newDiscussion.pin || this.newDiscussion.files.length ||
                                    this.groups.length > 0 && this.newDiscussion.groupId != this.groups[0].id ||
                                    this.newDiscussion.postToAllGroups) {
                                this.advanced = true;
                            }
                        });
                    });
                });
            }
        }).then(() => {
            if (!this.originalData) {
                // Initialize original data.
                this.originalData = {
                    subject: this.newDiscussion.subject,
                    message: this.newDiscussion.message,
                    files: this.newDiscussion.files.slice(),
                };
            }
            this.showForm = true;
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'addon.mod_forum.errorgetgroups', true);
            this.showForm = false;
        });
    }

    /**
     * Validate which of the groups returned by getActivityAllowedGroups in visible groups should be shown to post to.
     *
     * @param  {any[]} forumGroups Forum groups.
     * @return {Promise<any[]>} Promise resolved with the list of groups.
     */
    protected validateVisibleGroups(forumGroups: any[]): Promise<any[]> {
        // We first check if the user can post to all the groups.
        return this.forumProvider.canAddDiscussionToAll(this.forumId).catch(() => {
            // The call failed, let's assume he can't.
            return {
                status: false,
                canpindiscussions: false,
                cancreateattachment: true
            };
        }).then((response) => {
            this.canPin = !!response.canpindiscussions;
            this.canCreateAttachments = !!response.cancreateattachment;

            if (response.status) {
                // The user can post to all groups, add the "All participants" option and return them all.
                return this.addAllParticipantsOption(forumGroups, false);
            } else {
                // The user can't post to all groups, let's check which groups he can post to.
                const promises = [];
                const filtered = [];

                forumGroups.forEach((group) => {
                    promises.push(this.forumProvider.canAddDiscussion(this.forumId, group.id).catch(() => {
                        /* The call failed, let's return true so the group is shown. If the user can't post to
                           it an error will be shown when he tries to add the discussion. */
                        return {
                            status: true
                        };
                    }).then((response) => {
                        if (response.status) {
                            filtered.push(group);
                        }
                    }));
                });

                return Promise.all(promises).then(() => {
                    return filtered;
                });
            }
        });
    }

    /**
     * Filter forum groups, returning only those that are inside user groups.
     *
     * @param  {any[]} forumGroups Forum groups.
     * @param  {any[]} userGroups User groups.
     * @return {any[]} Filtered groups.
     */
    protected filterGroups(forumGroups: any[], userGroups: any[]): any[] {
        const filtered = [];
        const userGroupsIds = userGroups.map((g) => g.id);

        forumGroups.forEach((fg) => {
            if (userGroupsIds.indexOf(fg.id) > -1) {
                filtered.push(fg);
            }
        });

        return filtered;
    }

    /**
     * Add the "All participants" option to a list of groups if the user can add a discussion to all participants.
     *
     * @param  {any[]}   groups Groups.
     * @param  {boolean} check  True to check if the user can add a discussion to all participants.
     * @return {Promise<any[]>} Promise resolved with the list of groups.
     */
    protected addAllParticipantsOption(groups: any[], check: boolean): Promise<any[]> {
        if (!this.forumProvider.isAllParticipantsFixed()) {
            // All participants has a bug, don't add it.
            return Promise.resolve(groups);
        }

        let promise;

        if (check) {
            // We need to check if the user can add a discussion to all participants.
            promise = this.forumProvider.canAddDiscussionToAll(this.forumId).then((response) => {
                this.canPin = !!response.canpindiscussions;
                this.canCreateAttachments = !!response.cancreateattachment;

                return response.status;
            }).catch(() => {
                // The call failed, let's assume he can't.
                return false;
            });
        } else {
            // No need to check, assume the user can.
            promise = Promise.resolve(true);
        }

        return promise.then((canAdd) => {
            if (canAdd) {
                groups.unshift({
                    courseid: this.courseId,
                    id: AddonModForumProvider.ALL_PARTICIPANTS,
                    name: this.translate.instant('core.allparticipants')
                });
            }

            return groups;
        });
    }

    /**
     * Pull to refresh.
     *
     * @param {any} refresher Refresher.
     */
    refreshGroups(refresher: any): void {
        const promises = [
            this.groupsProvider.invalidateActivityGroupMode(this.cmId),
            this.groupsProvider.invalidateActivityAllowedGroups(this.cmId),
            this.forumProvider.invalidateCanAddDiscussion(this.forumId),
        ];

        Promise.all(promises).finally(() => {
            this.fetchDiscussionData(true).finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Convenience function to update or return to discussions depending on device.
     *
     * @param {number} [discussionIds] Ids of the new discussions.
     * @param {number} [discTimecreated] The time created of the discussion (if offline).
     */
    protected returnToDiscussions(discussionIds?: number[], discTimecreated?: number): void {
        const data: any = {
            forumId: this.forumId,
            cmId: this.cmId,
            discussionIds: discussionIds,
            discTimecreated: discTimecreated
        };
        this.eventsProvider.trigger(AddonModForumProvider.NEW_DISCUSSION_EVENT, data, this.sitesProvider.getCurrentSiteId());

        // Delete the local files from the tmp folder.
        this.uploaderProvider.clearTmpFiles(this.newDiscussion.files);

        if (this.svComponent && this.svComponent.isOn()) {
            // Empty form.
            this.hasOffline = false;
            this.newDiscussion.subject = '';
            this.newDiscussion.message = null;
            this.newDiscussion.files = [];
            this.newDiscussion.postToAllGroups = false;
            this.messageEditor.clearText();
            this.originalData = this.utils.clone(this.newDiscussion);

            // Trigger view event, to highlight the current opened discussion in the split view.
            this.eventsProvider.trigger(AddonModForumProvider.VIEW_DISCUSSION_EVENT, {
                forumId: this.forumId,
                discussion: 0
            }, this.sitesProvider.getCurrentSiteId());
        } else {
            this.originalData = null; // Avoid asking for confirmation.
            this.navCtrl.pop();
        }
    }

    /**
     * Message changed.
     *
     * @param {string} text The new text.
     */
    onMessageChange(text: string): void {
        this.newDiscussion.message = text;
    }

    /**
     * Add a new discussion.
     */
    add(): void {
        const forumName = this.forum.name;
        const subject = this.newDiscussion.subject;
        let  message = this.newDiscussion.message;
        const pin = this.newDiscussion.pin;
        const attachments = this.newDiscussion.files;
        const discTimecreated = this.timeCreated || Date.now();
        const options: any = {
            discussionsubscribe: !!this.newDiscussion.subscribe
        };

        if (!subject) {
            this.domUtils.showErrorModal('addon.mod_forum.erroremptysubject', true);

            return;
        }
        if (!message) {
            this.domUtils.showErrorModal('addon.mod_forum.erroremptymessage', true);

            return;
        }

        const modal = this.domUtils.showModalLoading('core.sending', true);

        // Add some HTML to the message if needed.
        message = this.textUtils.formatHtmlLines(message);

        if (pin) {
            options.discussionpinned = true;
        }

        const groupIds = this.newDiscussion.postToAllGroups ? this.groupIds : [this.newDiscussion.groupId];

        this.forumHelper.addNewDiscussion(this.forumId, forumName, this.courseId, subject, message, attachments, options, groupIds,
                discTimecreated).then((discussionIds) => {
            if (discussionIds) {
                // Data sent to server, delete stored files (if any).
                this.forumHelper.deleteNewDiscussionStoredFiles(this.forumId, discTimecreated);
            }

            if (discussionIds && discussionIds.length < groupIds.length) {
                // Some discussions could not be created.
                this.domUtils.showErrorModalDefault(null, 'addon.mod_forum.errorposttoallgroups', true);
            }

            this.returnToDiscussions(discussionIds, discTimecreated);
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'addon.mod_forum.cannotcreatediscussion', true);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Discard an offline saved discussion.
     */
    discard(): void {
        this.domUtils.showConfirm(this.translate.instant('core.areyousure')).then(() => {
            const promises = [];

            promises.push(this.forumOffline.deleteNewDiscussion(this.forumId, this.timeCreated));
            promises.push(this.forumHelper.deleteNewDiscussionStoredFiles(this.forumId, this.timeCreated).catch(() => {
                // Ignore errors, maybe there are no files.
            }));

            return Promise.all(promises).then(() => {
                this.returnToDiscussions();
            });
        }).catch(() => {
            // Cancelled.
        });
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
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        let promise: any;

        if (this.forumHelper.hasPostDataChanged(this.newDiscussion, this.originalData)) {
            // Show confirmation if some data has been modified.
            promise = this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            // Delete the local files from the tmp folder.
            this.uploaderProvider.clearTmpFiles(this.newDiscussion.files);
        });
    }

    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    ionViewWillLeave(): void {
        this.syncObserver && this.syncObserver.off();
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        if (this.syncId) {
            this.syncProvider.unblockOperation(AddonModForumProvider.COMPONENT, this.syncId);
        }
        this.isDestroyed = true;
    }
}
