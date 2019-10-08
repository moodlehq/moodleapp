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

import { Component, OnDestroy } from '@angular/core';
import { Platform, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { AddonMessagesProvider } from '../../providers/messages';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreAppProvider } from '@providers/app';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';

/**
 * Component that displays the list of discussions.
 */
@Component({
    selector: 'addon-messages-discussions',
    templateUrl: 'addon-messages-discussions.html',
})
export class AddonMessagesDiscussionsComponent implements OnDestroy {
    protected newMessagesObserver: any;
    protected readChangedObserver: any;
    protected cronObserver: any;
    protected appResumeSubscription: any;
    protected loadingMessages: string;
    protected siteId: string;

    loaded = false;
    loadingMessage: string;
    discussions: any;
    discussionUserId: number;
    pushObserver: any;
    search = {
        enabled: false,
        showResults: false,
        results: [],
        loading: '',
        text: ''
    };

    constructor(private eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider, translate: TranslateService,
            private messagesProvider: AddonMessagesProvider, private domUtils: CoreDomUtilsProvider, navParams: NavParams,
            private appProvider: CoreAppProvider, platform: Platform, private utils: CoreUtilsProvider,
            pushNotificationsDelegate: CorePushNotificationsDelegate) {

        this.search.loading =  translate.instant('core.searching');
        this.loadingMessages = translate.instant('core.loading');
        this.siteId = sitesProvider.getCurrentSiteId();

        // Update discussions when new message is received.
        this.newMessagesObserver = eventsProvider.on(AddonMessagesProvider.NEW_MESSAGE_EVENT, (data) => {
            if (data.userId && this.discussions) {
                const discussion = this.discussions.find((disc) => {
                    return disc.message.user == data.userId;
                });

                if (typeof discussion == 'undefined') {
                    this.loaded = false;
                    this.refreshData().finally(() => {
                        this.loaded = true;
                    });
                } else {
                    // An existing discussion has a new message, update the last message.
                    discussion.message.message = data.message;
                    discussion.message.timecreated = data.timecreated;
                }
            }
        }, this.siteId);

        // Update discussions when a message is read.
        this.readChangedObserver = eventsProvider.on(AddonMessagesProvider.READ_CHANGED_EVENT, (data) => {
            if (data.userId && this.discussions) {
                const discussion = this.discussions.find((disc) => {
                    return disc.message.user == data.userId;
                });

                if (typeof discussion != 'undefined') {
                    // A discussion has been read reset counter.
                    discussion.unread = false;

                    // Conversations changed, invalidate them and refresh unread counts.
                    this.messagesProvider.invalidateConversations(this.siteId);
                    this.messagesProvider.refreshUnreadConversationCounts(this.siteId);
                }
            }
        }, this.siteId);

        // Refresh the view when the app is resumed.
        this.appResumeSubscription = platform.resume.subscribe(() => {
            if (!this.loaded) {
                return;
            }
            this.loaded = false;
            this.refreshData();
        });

        this.discussionUserId = navParams.get('discussionUserId') || false;

        // If a message push notification is received, refresh the view.
        this.pushObserver = pushNotificationsDelegate.on('receive').subscribe((notification) => {
            // New message received. If it's from current site, refresh the data.
            if (utils.isFalseOrZero(notification.notif) && notification.site == this.siteId) {
                // Don't refresh unread counts, it's refreshed from the main menu handler in this case.
                this.refreshData(null, false);
            }
        });
    }

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        if (this.discussionUserId) {
            // There is a discussion to load, open the discussion in a new state.
            this.gotoDiscussion(this.discussionUserId);
        }

        this.fetchData().then(() => {
            if (!this.discussionUserId && this.discussions.length > 0) {
                // Take first and load it.
                this.gotoDiscussion(this.discussions[0].message.user, undefined, true);
            }
        });
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param refreshUnreadCounts Whteher to refresh unread counts.
     * @return Promise resolved when done.
     */
    refreshData(refresher?: any, refreshUnreadCounts: boolean = true): Promise<any> {
        const promises = [];
        promises.push(this.messagesProvider.invalidateDiscussionsCache(this.siteId));

        if (refreshUnreadCounts) {
            promises.push(this.messagesProvider.invalidateUnreadConversationCounts(this.siteId));
        }

        return this.utils.allPromises(promises).finally(() => {
            return this.fetchData().finally(() => {
                if (refresher) {
                    refresher.complete();
                }
            });
        });
    }

    /**
     * Fetch discussions.
     *
     * @return Promise resolved when done.
     */
    protected fetchData(): Promise<any> {
        this.loadingMessage = this.loadingMessages;
        this.search.enabled = this.messagesProvider.isSearchMessagesEnabled();

        const promises = [];

        promises.push(this.messagesProvider.getDiscussions(this.siteId).then((discussions) => {
            // Convert to an array for sorting.
            const discussionsSorted = [];
            for (const userId in discussions) {
                discussions[userId].unread = !!discussions[userId].unread;
                discussionsSorted.push(discussions[userId]);
            }

            this.discussions = discussionsSorted.sort((a, b) => {
                return b.message.timecreated - a.message.timecreated;
            });
        }));

        promises.push(this.messagesProvider.getUnreadConversationCounts(this.siteId));

        return Promise.all(promises).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingdiscussions', true);
        }).finally(() => {
            this.loaded = true;
        });
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
     * @return Resolved when done.
     */
    searchMessage(query: string): Promise<any> {
        this.appProvider.closeKeyboard();
        this.loaded = false;
        this.loadingMessage = this.search.loading;

        return this.messagesProvider.searchMessages(query, undefined, undefined, undefined, this.siteId).then((searchResults) => {
            this.search.showResults = true;
            this.search.results = searchResults.messages;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Navigate to a particular discussion.
     *
     * @param discussionUserId Discussion Id to load.
     * @param messageId Message to scroll after loading the discussion. Used when searching.
     * @param onlyWithSplitView Only go to Discussion if split view is on.
     */
    gotoDiscussion(discussionUserId: number, messageId?: number, onlyWithSplitView: boolean = false): void {
        this.discussionUserId = discussionUserId;

        const params = {
            discussion: discussionUserId,
            onlyWithSplitView: onlyWithSplitView
        };
        if (messageId) {
            params['message'] = messageId;
        }
        this.eventsProvider.trigger(AddonMessagesProvider.SPLIT_VIEW_LOAD_EVENT, params, this.siteId);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.newMessagesObserver && this.newMessagesObserver.off();
        this.readChangedObserver && this.readChangedObserver.off();
        this.cronObserver && this.cronObserver.off();
        this.appResumeSubscription && this.appResumeSubscription.unsubscribe();
        this.pushObserver && this.pushObserver.unsubscribe();
    }
}
