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

angular.module('mm.addons.messages', ['mm.core'])

.constant('mmaMessagesComponent', 'mmaMessages')
.constant('mmaMessagesLimitMessages', 50)
.constant('mmaMessagesDiscussionLoadedEvent', 'mma_messages_discussion_loaded')
.constant('mmaMessagesDiscussionLeftEvent', 'mma_messages_discussion_left')
.constant('mmaMessagesPollInterval', 10000)
.constant('mmaMessagesPriority', 600)
.constant('mmaMessagesSendMessagePriority', 1000)
.constant('mmaMessagesAddContactPriority', 800)
.constant('mmaMessagesBlockContactPriority', 600)
.constant('mmaMessagesPreferencesPriority', 600)
.constant('mmaMessagesNewMessageEvent', 'mma-messages_new_message')
.constant('mmaMessagesReadChangedEvent', 'mma-messages_read_changed')
.constant('mmaMessagesReadCronEvent', 'mma-messages_read_cron')
.constant('mmaMessagesAutomSyncedEvent', 'mma_messages_autom_synced')

.config(function($stateProvider, $mmUserDelegateProvider, $mmSideMenuDelegateProvider, mmaMessagesSendMessagePriority,
            mmaMessagesAddContactPriority, mmaMessagesBlockContactPriority, mmaMessagesPriority, $mmContentLinksDelegateProvider,
            $mmSettingsDelegateProvider, mmaMessagesPreferencesPriority) {

    $stateProvider

    .state('site.messages', {
        url: '/messages',
        views: {
            'site': {
                templateUrl: 'addons/messages/templates/index.html'
            }
        }
    })

    .state('site.messages-discussion', {
        url: '/messages-discussion',
        params: {
            userId: null,
            showKeyboard: false,
        },
        views: {
            'site': {
                templateUrl: 'addons/messages/templates/discussion.html',
                controller: 'mmaMessagesDiscussionCtrl'
            }
        }
    })

    .state('site.messages-preferences', {
        url: '/messages-preferences',
        views: {
            'site': {
                controller: 'mmaMessagesPreferencesCtrl',
                templateUrl: 'addons/messages/templates/preferences.html'
            }
        }
    });

    // Register side menu addon.
    $mmSideMenuDelegateProvider.registerNavHandler('mmaMessages', '$mmaMessagesHandlers.sideMenuNav', mmaMessagesPriority);

    // Register user profile addons.
    $mmUserDelegateProvider.registerProfileHandler('mmaMessages:sendMessage', '$mmaMessagesHandlers.sendMessage', mmaMessagesSendMessagePriority);
    $mmUserDelegateProvider.registerProfileHandler('mmaMessages:addContact', '$mmaMessagesHandlers.addContact', mmaMessagesAddContactPriority);
    $mmUserDelegateProvider.registerProfileHandler('mmaMessages:blockContact', '$mmaMessagesHandlers.blockContact', mmaMessagesBlockContactPriority);

    // Register content links handler.
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaMessages:index', '$mmaMessagesHandlers.indexLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaMessages:discussion', '$mmaMessagesHandlers.discussionLinksHandler');

    // Register settings handler.
    $mmSettingsDelegateProvider.registerHandler('mmaMessages:preferences',
            '$mmaMessagesHandlers.preferences', mmaMessagesPreferencesPriority);
})

.run(function($mmaMessages, $mmEvents, $state, $mmAddonManager, $mmUtil, mmCoreEventLogin, $mmCronDelegate, $mmaMessagesSync,
            mmCoreEventOnlineStatusChanged, $mmSitesManager) {

    // Invalidate messaging enabled WS calls.
    $mmEvents.on(mmCoreEventLogin, function() {
        $mmaMessages.invalidateEnabledCache();
    });

    // Register push notification clicks.
    var $mmPushNotificationsDelegate = $mmAddonManager.get('$mmPushNotificationsDelegate');
    if ($mmPushNotificationsDelegate) {
        $mmPushNotificationsDelegate.registerHandler('mmaMessages', function(notification) {
            if ($mmUtil.isFalseOrZero(notification.notif)) {
                $mmaMessages.isMessagingEnabledForSite(notification.site).then(function() {
                    $mmSitesManager.isFeatureDisabled('$mmSideMenuDelegate_mmaMessages', notification.site).then(function(disabled) {
                        if (disabled) {
                            // Messages are disabled, stop.
                            return;
                        }

                        $mmaMessages.invalidateDiscussionsCache().finally(function() {
                            $state.go('redirect', {siteid: notification.site, state: 'site.messages'});
                        });
                    });
                });
                return true;
            }
        });
    }

    // Register sync process.
    $mmCronDelegate.register('mmaMessagesSync', '$mmaMessagesHandlers.syncHandler');
    $mmCronDelegate.register('mmaMessagesMenu', '$mmaMessagesHandlers.sideMenuNav');

    // Sync some discussions when device goes online.
    $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        if (online) {
            $mmaMessagesSync.syncAllDiscussions(undefined, true);
        }
    });
});
