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
.factory('$mmaMessagesHandlers', function($log, $mmaMessages, $mmSite, $state, $mmUtil) {
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

        var self = {};

        self.isEnabled = function() {
            return $mmaMessages.isPluginEnabled();
        };

        self.isEnabledForUser = function(user, courseId) {
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
                        } else {
                            $scope.title = 'mma.messages.addcontact';
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
                            return $mmaMessages.removeContact(user.id);
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

        var self = {};

        self.isEnabled = function() {
            return $mmaMessages.isPluginEnabled();
        };

        self.isEnabledForUser = function(user, courseId) {
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
                        } else {
                            $scope.title = 'mma.messages.blockcontact';
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
                            return $mmaMessages.blockContact(user.id);
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

        var self = {};

        self.isEnabled = function() {
            return $mmaMessages.isPluginEnabled();
        };

        self.isEnabledForUser = function(user, courseId) {
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
                $scope.title = 'mma.messages.sendmessage';
                $scope.action = function($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $state.go('site.messages-discussion', {
                        userId: user.id,
                        userFullname: user.fullname
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
                $scope.icon = 'ion-chatbox';
                $scope.title = 'mma.messages.messages';
                $scope.state = 'site.messages';
            };
        };

        return self;
    };

    return self;
});
