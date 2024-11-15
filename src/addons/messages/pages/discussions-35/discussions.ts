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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import {
    AddonMessages,
    AddonMessagesDiscussion,
    AddonMessagesMessageAreaContact,
} from '../../services/messages';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { ActivatedRoute, Params } from '@angular/router';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { Subscription } from 'rxjs';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { CorePlatform } from '@services/platform';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreKeyboard } from '@singletons/keyboard';
import { ADDON_MESSAGES_NEW_MESSAGE_EVENT, ADDON_MESSAGES_READ_CHANGED_EVENT } from '@addons/messages/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Page that displays the list of discussions.
 */
@Component({
    selector: 'addon-messages-discussions',
    templateUrl: 'discussions.html',
    styleUrl: '../../messages-common.scss',
})
export class AddonMessagesDiscussions35Page implements OnInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    protected newMessagesObserver: CoreEventObserver;
    protected readChangedObserver: CoreEventObserver;
    protected appResumeSubscription: Subscription;
    protected pushObserver: Subscription;
    protected loadingMessages: string;
    protected siteId: string;

    loaded = false;
    loadingMessage = '';
    discussions: AddonMessagesDiscussion[] = [];
    discussionUserId?: number;

    search = {
        showResults: false,
        results: <AddonMessagesMessageAreaContact[]> [],
        loading: '',
        text: '',
    };

    constructor(
        protected route: ActivatedRoute,
    ) {

        this.search.loading = Translate.instant('core.searching');
        this.loadingMessages = Translate.instant('core.loading');
        this.siteId = CoreSites.getCurrentSiteId();

        // Update discussions when new message is received.
        this.newMessagesObserver = CoreEvents.on(
            ADDON_MESSAGES_NEW_MESSAGE_EVENT,
            (data) => {
                if (data.userId && this.discussions) {
                    const discussion = this.discussions.find((disc) => disc.message?.user === data.userId);

                    if (discussion === undefined) {
                        this.loaded = false;
                        this.refreshData().finally(() => {
                            this.loaded = true;
                        });
                    } else if (discussion.message) {
                        // An existing discussion has a new message, update the last message.
                        discussion.message.message = data.message ?? '';
                        discussion.message.timecreated = data.timecreated;
                    }
                }
            },
            this.siteId,
        );

        // Update discussions when a message is read.
        this.readChangedObserver = CoreEvents.on(
            ADDON_MESSAGES_READ_CHANGED_EVENT,
            (data) => {
                if (data.userId && this.discussions) {
                    const discussion = this.discussions.find((disc) => disc.message?.user === data.userId);

                    if (discussion !== undefined) {
                        // A discussion has been read reset counter.
                        discussion.unread = false;

                        // Conversations changed, invalidate them and refresh unread counts.
                        AddonMessages.invalidateConversations(this.siteId);
                        AddonMessages.refreshUnreadConversationCounts(this.siteId);
                    }
                }
            },
            this.siteId,
        );

        // Refresh the view when the app is resumed.
        this.appResumeSubscription = CorePlatform.resume.subscribe(() => {
            if (!this.loaded) {
                return;
            }
            this.loaded = false;
            this.refreshData();
        });

        // If a message push notification is received, refresh the view.
        this.pushObserver = CorePushNotificationsDelegate.on<CorePushNotificationsNotificationBasicData>('receive')
            .subscribe((notification) => {
                // New message received. If it's from current site, refresh the data.
                if (CoreUtils.isFalseOrZero(notification.notif) && notification.site == this.siteId) {
                // Don't refresh unread counts, it's refreshed from the main menu handler in this case.
                    this.refreshData(undefined, false);
                }
            });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.route.queryParams.subscribe(async (params) => {
            // When a child page loads this callback is triggered too.
            this.discussionUserId = CoreNavigator.getRouteNumberParam('userId', { params }) ?? this.discussionUserId;
        });

        await this.fetchData();

        if (!this.discussionUserId && this.discussions.length > 0 && CoreScreen.isTablet && this.discussions[0].message) {
            // Take first and load it.
            await this.gotoDiscussion(this.discussions[0].message.user);
        }

        // Mark login navigation finished now that the conversation route has been loaded if needed.
        CoreSites.loginNavigationFinished();
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param refreshUnreadCounts Whteher to refresh unread counts.
     * @returns Promise resolved when done.
     */
    async refreshData(refresher?: HTMLIonRefresherElement, refreshUnreadCounts: boolean = true): Promise<void> {
        const promises: Promise<void>[] = [];
        promises.push(AddonMessages.invalidateDiscussionsCache(this.siteId));

        if (refreshUnreadCounts) {
            promises.push(AddonMessages.invalidateUnreadConversationCounts(this.siteId));
        }

        await CorePromiseUtils.allPromises(promises).finally(() => this.fetchData().finally(() => {
            if (refresher) {
                refresher?.complete();
            }
        }));
    }

    /**
     * Fetch discussions.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        this.loadingMessage = this.loadingMessages;

        const promises: Promise<unknown>[] = [];

        promises.push(AddonMessages.getDiscussions(this.siteId).then((discussions) => {
            // Convert to an array for sorting.
            const discussionsSorted: AddonMessagesDiscussion[] = [];
            for (const userId in discussions) {
                discussions[userId].unread = !!discussions[userId].unread;

                discussionsSorted.push(discussions[userId]);
            }

            this.discussions = discussionsSorted.sort((a, b) => (b.message?.timecreated || 0) - (a.message?.timecreated || 0));

            return;
        }));

        promises.push(AddonMessages.getUnreadConversationCounts(this.siteId));

        try {
            await Promise.all(promises);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingdiscussions', true);
        }

        this.loaded = true;
    }

    /**
     * Clear search and show discussions again.
     */
    clearSearch(): void {
        this.loaded = false;
        this.search.showResults = false;
        this.search.text = ''; // Reset searched string.
        this.fetchData().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Search messages cotaining text.
     *
     * @param query Text to search for.
     * @returns Resolved when done.
     */
    async searchMessage(query: string): Promise<void> {
        CoreKeyboard.close();
        this.loaded = false;
        this.loadingMessage = this.search.loading;

        try {
            const searchResults = await AddonMessages.searchMessages(query, undefined, undefined, undefined, this.siteId);
            this.search.showResults = true;
            this.search.results = searchResults.messages;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
        }

        this.loaded = true;
    }

    /**
     * Navigate to a particular discussion.
     *
     * @param discussionUserId Discussion Id to load.
     * @param messageId Message to scroll after loading the discussion. Used when searching.
     */
    async gotoDiscussion(discussionUserId: number, messageId?: number): Promise<void> {
        this.discussionUserId = discussionUserId;

        const params: Params = {};

        if (messageId) {
            params.message = messageId;
        }

        const path = CoreNavigator.getRelativePathToParent('/messages/index') + `discussion/user/${discussionUserId}`;

        await CoreNavigator.navigate(path, {
            params,
            reset: CoreScreen.isTablet && !!this.splitView && !this.splitView.isNested,
        });
    }

    /**
     * Navigate to contacts view.
     */
    gotoContacts(): void {
        const params: Params = {};

        if (CoreScreen.isTablet && this.discussionUserId) {
            params.discussionUserId = this.discussionUserId;
        }

        CoreNavigator.navigateToSitePath('contacts-35', { params });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.newMessagesObserver?.off();
        this.readChangedObserver?.off();
        this.appResumeSubscription?.unsubscribe();
        this.pushObserver?.unsubscribe();
    }

}
