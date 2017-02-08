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

angular.module('mm.addons.messages')

/**
 * Messages handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.messages
 * @ngdoc service
 * @name $mmaMessagesHandlers
 */
.factory('$mmaMessagesHandlers', function($log, $mmaMessages, $mmSite, $state, $mmUtil, $mmContentLinksHelper, $mmaMessagesSync,
            $mmSitesManager, mmUserProfileHandlersTypeCommunication, mmUserProfileHandlersTypeAction, $translate,
            mmaMessagesReadChangedEvent, $mmEvents, mmaMessagesReadCronEvent, $mmAddonManager, $mmContentLinkHandlerFactory) {
    $log = $log.getInstance('$mmaMessagesHandlers');

    var self = {};

    /**
     * Add contact handler.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesHandlers#addContact
     */
    self.addContact = function() {

        var self = {
            type: mmUserProfileHandlersTypeAction
        };

        self.isEnabled = function() {
            return $mmaMessages.isPluginEnabled();
        };

        /**
         * Check if handler is enabled for this user in this context.
         *
         * @param {Object} user     User to check.
         * @param {Number} courseId Course ID.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Promise}        Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
         */
        self.isEnabledForUser = function(user, courseId, navOptions, admOptions) {
            return user.id != $mmSite.getUserId();
        };

        /**
         * Add contact handler controller.
         *
         * @module mm.addons.messages
         * @ngdoc controller
         * @name $mmaMessagesHandlers#blockContact:controller
         */
        self.getController = function(user, courseid) {

            return function($scope, $rootScope) {
                var disabled = false;

                function updateTitle() {
                    return $mmaMessages.isContact(user.id).then(function(isContact) {
                        if (isContact) {
                            $scope.title = 'mma.messages.removecontact';
                            $scope.class = 'mma-messages-removecontact-handler';
                            $scope.icon = 'ion-minus-round';
                        } else {
                            $scope.title = 'mma.messages.addcontact';
                            $scope.class = 'mma-messages-addcontact-handler';
                            $scope.icon = 'ion-plus-round';
                        }
                    }).catch(function() {
                        // This fails for some reason, let's just hide the button.
                        $scope.hidden = true;
                    });
                }

                $scope.title = '';
                $scope.spinner = false;
                $scope.action = function($event) {
                    if (disabled) {
                        return;
                    }
                    disabled = true;
                    $scope.spinner = true;
                    $mmaMessages.isContact(user.id).then(function(isContact) {
                        if (isContact) {
                            var template = $translate.instant('mma.messages.removecontactconfirm'),
                                title = $translate.instant('mma.messages.removecontact');
                            return $mmUtil.showConfirm(template, title, {okText: title}).then(function() {
                                return $mmaMessages.removeContact(user.id);
                            }).catch(function() {
                                // Ignore on cancel.
                            });
                        } else {
                            return $mmaMessages.addContact(user.id);
                        }
                    }).catch(function(error) {
                        $mmUtil.showErrorModal(error);
                    }).finally(function() {
                        $rootScope.$broadcast('mmaMessagesHandlers:addUpdated');
                        updateTitle().finally(function() {
                            disabled = false;
                            $scope.spinner = false;
                        });
                    });
                };

                $scope.$on('mmaMessagesHandlers:blockUpdated', function() {
                    updateTitle();
                });

                updateTitle();

            };

        };

        return self;
    };

    /**
     * Block contact handler.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesHandlers#blockContact
     */
    self.blockContact = function() {

        var self = {
            type: mmUserProfileHandlersTypeAction
        };

        self.isEnabled = function() {
            return $mmaMessages.isPluginEnabled();
        };

        /**
         * Check if handler is enabled for this user in this context.
         *
         * @param {Object} user     User to check.
         * @param {Number} courseId Course ID.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Promise}        Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
         */
        self.isEnabledForUser = function(user, courseId, navOptions, admOptions) {
            return user.id != $mmSite.getUserId();
        };

        self.getController = function(user, courseid) {

            /**
             * Block contact handler controller.
             *
             * @module mm.addons.messages
             * @ngdoc controller
             * @name $mmaMessagesHandlers#blockContact:controller
             */
            return function($scope, $rootScope) {
                var disabled = false;

                function updateTitle() {
                    return $mmaMessages.isBlocked(user.id).then(function(isBlocked) {
                        if (isBlocked) {
                            $scope.title = 'mma.messages.unblockcontact';
                            $scope.class = 'mma-messages-unblockcontact-handler';
                            $scope.icon = 'ion-checkmark-circled';
                        } else {
                            $scope.title = 'mma.messages.blockcontact';
                            $scope.class = 'mma-messages-blockcontact-handler';
                            $scope.icon = 'ion-close-circled';
                        }
                    }).catch(function() {
                        // This fails for some reason, let's just hide the button.
                        $scope.hidden = true;
                    });
                }

                $scope.title = '';
                $scope.spinner = false;
                $scope.action = function($event) {
                    if (disabled) {
                        return;
                    }
                    disabled = true;
                    $scope.spinner = true;
                    $mmaMessages.isBlocked(user.id).then(function(isBlocked) {
                        if (isBlocked) {
                            return $mmaMessages.unblockContact(user.id);
                        } else {
                            var template = $translate.instant('mma.messages.blockcontactconfirm'),
                                title = $translate.instant('mma.messages.blockcontact');
                            return $mmUtil.showConfirm(template, title, {okText: title}).then(function() {
                                return $mmaMessages.blockContact(user.id);
                            }).catch(function() {
                                // Ignore on cancel.
                            });
                        }
                    }).catch(function(error) {
                        $mmUtil.showErrorModal(error);
                    }).finally(function() {
                        $rootScope.$broadcast('mmaMessagesHandlers:blockUpdated');
                        updateTitle().finally(function() {
                            disabled = false;
                            $scope.spinner = false;
                        });
                    });
                };

                $scope.$on('mmaMessagesHandlers:addUpdated', function() {
                    updateTitle();
                });

                updateTitle();

            };

        };

        return self;
    };

    /**
     * Send message handler.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesHandlers#blockContact
     */
    self.sendMessage = function() {

        var self = {
            type: mmUserProfileHandlersTypeCommunication
        };

        self.isEnabled = function() {
            return $mmaMessages.isPluginEnabled();
        };

        /**
         * Check if handler is enabled for this user in this context.
         *
         * @param {Object} user     User to check.
         * @param {Number} courseId Course ID.
         * @param  {Object} [navOptions] Course navigation options for current user. See $mmCourses#getUserNavigationOptions.
         * @param  {Object} [admOptions] Course admin options for current user. See $mmCourses#getUserAdministrationOptions.
         * @return {Promise}        Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
         */
        self.isEnabledForUser = function(user, courseId, navOptions, admOptions) {
            return user.id != $mmSite.getUserId();
        };

        self.getController = function(user, courseid) {

            /**
             * Send message handler controller.
             *
             * @module mm.addons.messages
             * @ngdoc controller
             * @name $mmaMessagesHandlers#sendMessage:controller
             */
            return function($scope) {
                $scope.title = 'mma.messages.message';
                $scope.class = 'mma-messages-sendmessage-handler';
                $scope.icon = 'ion-chatbubble';
                $scope.action = function($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.messages-discussion', {
                        userId: user.id,
                        showKeyboard: true
                    });
                };
            };

        };

        return self;
    };

    /**
     * Side menu nav handler.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesHandlers#sideMenuNav
     */
    self.sideMenuNav = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaMessages.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @return {Object} Controller.
         */
        self.getController = function() {

            /**
             * Side menu nav handler controller.
             *
             * @module mm.addons.messages
             * @ngdoc controller
             * @name $mmaMessagesHandlers#sideMenuNav:controller
             */
            return function($scope) {
                var $mmPushNotificationsDelegate = $mmAddonManager.get('$mmPushNotificationsDelegate'),
                    $mmaPushNotifications = $mmAddonManager.get('$mmaPushNotifications'),
                    readChangedObserver, cronObserver;

                $scope.icon = 'ion-chatbox';
                $scope.title = 'mma.messages.messages';
                $scope.state = 'site.messages';
                $scope.class = 'mma-messages-handler';

                if ($mmaMessages.isMessageCountEnabled(true)) {
                    $scope.loading = true;

                    updateUnreadConversationsCount().finally(function() {
                        $scope.loading = false;
                    });

                    readChangedObserver = $mmEvents.on(mmaMessagesReadChangedEvent, function(data) {
                        if (data && $mmSitesManager.isCurrentSite(data.siteid)) {
                            updateUnreadConversationsCount(data.siteid);
                        }
                    });

                    cronObserver = $mmEvents.on(mmaMessagesReadCronEvent, function(data) {
                        if (data && $mmSitesManager.isCurrentSite(data.siteid)) {
                            updateUnreadConversationsCount(data.siteid);
                        }
                    });

                    // If a message push notification is received, refresh the count.
                    if ($mmPushNotificationsDelegate) {
                        $mmPushNotificationsDelegate.registerReceiveHandler('mmaMessages:sidemenu', function(notification) {
                            // New message received. If it's from current site, refresh the data.
                            if ($mmUtil.isFalseOrZero(notification.notif) && $mmSitesManager.isCurrentSite(notification.site)) {
                                updateUnreadConversationsCount(notification.site);
                            }
                        });

                        // Register Badge counter.
                        $mmPushNotificationsDelegate.registerCounterHandler('mmaMessages');
                    }

                    function updateUnreadConversationsCount(siteId) {
                        return $mmaMessages.getUnreadConversationsCount().then(function(unread) {
                            // Leave badge enter if there is a 0+ or a 0.
                            $scope.badge = parseInt(unread, 10) > 0 ? unread : '';
                            // Update badge.
                            if ($mmaPushNotifications) {
                                $mmaPushNotifications.updateAddonCounter(siteId, 'mmaMessages', unread);
                            }
                        });
                    }
                }

                $scope.$on('$destroy', function() {
                    readChangedObserver && readChangedObserver.off && readChangedObserver.off();
                    cronObserver && cronObserver.off && cronObserver.off();

                    if ($mmPushNotificationsDelegate) {
                        $mmPushNotificationsDelegate.unregisterReceiveHandler('mmaMessages:sidemenu');
                    }
                });
            };
        };

        /**
         * Execute the process.
         * Receives the ID of the site affected, undefined for all sites.
         *
         * @param  {String} [siteId] ID of the site affected, undefined for all sites.
         * @return {Promise}         Promise resolved when done, rejected if failure.
         */
        self.execute = function(siteId) {
            if ($mmSitesManager.isCurrentSite(siteId) && $mmaMessages.isMessageCountEnabled(true)) {
                $mmEvents.trigger(mmaMessagesReadCronEvent, {
                    siteid: siteId
                });
            }
        };

        /**
         * Get the time between consecutive executions.
         *
         * @return {Number} Time between consecutive executions (in ms).
         */
        self.getInterval = function() {
            return 600000; // 10 minutes.
        };

        /**
         * Whether it's a synchronization process or not.
         *
         * @return {Boolean} True if is a sync process, false otherwise.
         */
        self.isSync = function() {
            // This is done to use only wifi if using the fallback function
            return !$mmaMessages.isMessageCountEnabled();
        };

        /**
         * Whether the process should be executed during a manual sync.
         *
         * @return {Boolean} True if is a manual sync process, false otherwise.
         */
        self.canManualSync = function() {
            return true;
        };

        /**
         * Whether the process uses network or not.
         *
         * @return {Boolean} True if uses network, false otherwise.
         */
        self.usesNetwork = function() {
            return true;
        };

        return self;
    };

    /**
     * Content links handler for messaging index.
     * Match message index URL without params id, user1 or user2.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesHandlers#indexLinksHandler
     */
    self.indexLinksHandler = $mmContentLinkHandlerFactory.createChild(
            /\/message\/index\.php((?![\?\&](id|user1|user2)=\d+).)*$/, '$mmSideMenuDelegate_mmaMessages');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.indexLinksHandler.isEnabled = $mmaMessages.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.indexLinksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                // Always use redirect to make it the new history root (to avoid "loops" in history).
                $state.go('redirect', {
                    siteid: siteId,
                    state: 'site.messages',
                    params: {}
                });
            }
        }];
    };

    /**
     * Content links handler for a discussion.
     * Match message index URL with params id, user1 or user2.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesHandlers#discussionLinksHandler
     */
    self.discussionLinksHandler = $mmContentLinkHandlerFactory.createChild(
            /\/message\/index\.php.*([\?\&](id|user1|user2)=\d+)/, '$mmUserDelegate_mmaMessages:sendMessage');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.discussionLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        return $mmaMessages.isPluginEnabled(siteId).then(function(enabled) {
            if (!enabled) {
                return false;
            }

            if (typeof params.id == 'undefined' && typeof params.user2 == 'undefined') {
                // Other user not defined, cannot treat the URL.
                return false;
            }

            if (typeof params.user1 != 'undefined') {
                // Check if user1 is the current user, since the app only supports current user.
                return $mmSitesManager.getSite(siteId).then(function(site) {
                    return parseInt(params.user1, 10) == site.getUserId();
                });
            }

            return true;
        });
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.discussionLinksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                var stateParams = {
                    userId: parseInt(params.id || params.user2, 10)
                };
                $mmContentLinksHelper.goInSite('site.messages-discussion', stateParams, siteId);
            }
        }];
    };

    /**
     * Synchronization handler.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesHandlers#syncHandler
     */
    self.syncHandler = function() {

        var self = {};

        /**
         * Execute the process.
         * Receives the ID of the site affected, undefined for all sites.
         *
         * @param  {String} [siteId] ID of the site affected, undefined for all sites.
         * @return {Promise}         Promise resolved when done, rejected if failure.
         */
        self.execute = function(siteId) {
            return $mmaMessagesSync.syncAllDiscussions(siteId);
        };

        /**
         * Get the time between consecutive executions.
         *
         * @return {Number} Time between consecutive executions (in ms).
         */
        self.getInterval = function() {
            return 300000; // 5 minutes.
        };

        /**
         * Whether it's a synchronization process or not.
         *
         * @return {Boolean} True if is a sync process, false otherwise.
         */
        self.isSync = function() {
            return true;
        };

        /**
         * Whether the process uses network or not.
         *
         * @return {Boolean} True if uses network, false otherwise.
         */
        self.usesNetwork = function() {
            return true;
        };

        return self;
    };

    /**
     * Message preferences handler.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesHandlers#preferences
     */
    self.preferences = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaMessages.isMessagePreferencesEnabled();
        };

        /**
         * Get the controller.
         *
         * @return {Object} Controller.
         */
        self.getController = function() {
            return function($scope) {
                $scope.title = 'mma.messages.messagepreferences';
                $scope.class = 'mma-messages-messagepreferences-handler';
                $scope.state = 'site.messages-preferences';
            };
        };

        return self;
    };

    return self;
});
