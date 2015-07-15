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

.constant('mmaMessagesDiscussionLoadedEvent', 'mma_messages_discussion_loaded')
.constant('mmaMessagesDiscussionLeftEvent', 'mma_messages_discussion_left')
.constant('mmaMessagesPollInterval', 5000)
.constant('mmaMessagesPriority', 600)
.constant('mmaMessagesSendMessagePriority', 1000)
.constant('mmaMessagesAddContactPriority', 800)
.constant('mmaMessagesBlockContactPriority', 600)
.constant('mmaMessagesNewMessageEvent', 'mma-messages_new_message')

.config(function($stateProvider, $mmUserDelegateProvider, mmaMessagesSendMessagePriority, mmaMessagesAddContactPriority,
            mmaMessagesBlockContactPriority) {

    $stateProvider

    .state('site.messages', {
        url: '/messages',
        views: {
            'site': {
                templateUrl: 'addons/messages/templates/index.html',
                controller: 'mmaMessagesIndexCtrl'
            }
        }
    })

    .state('site.messages-discussion', {
        url: '/messages-discussion',
        params: {
            userId: null,
            userFullname: null
        },
        views: {
            'site': {
                templateUrl: 'addons/messages/templates/discussion.html',
                controller: 'mmaMessagesDiscussionCtrl'
            }
        }
    });

    $mmUserDelegateProvider.registerProfileHandler('mmaMessages:sendMessage', '$mmaMessagesHandlers.sendMessage', mmaMessagesSendMessagePriority);
    $mmUserDelegateProvider.registerProfileHandler('mmaMessages:addContact', '$mmaMessagesHandlers.addContact', mmaMessagesAddContactPriority);
    $mmUserDelegateProvider.registerProfileHandler('mmaMessages:blockContact', '$mmaMessagesHandlers.blockContact', mmaMessagesBlockContactPriority);
})

.run(function($mmSideMenuDelegate, $mmaMessages, $mmEvents, $state, $mmAddonManager,
            $mmUtil, mmCoreEventLogin, mmaMessagesPriority) {

    $mmSideMenuDelegate.registerPlugin('mmaMessages', function() {

        return $mmaMessages.isPluginEnabled().then(function() {
            return {
                icon: 'ion-chatbox',
                state: 'site.messages',
                title: 'mma.messages.messages'
            };
        });

    }, mmaMessagesPriority);

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
                    $mmaMessages.invalidateDiscussionsCache().finally(function() {
                        $state.go('redirect', {siteid: notification.site, state: 'site.messages'});
                    });
                });
                return true;
            }
        });
    }

});
