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

.constant('mmaMessagesOfflineMessagesStore', 'mma_messages_offline_messages')

.config(function($mmSitesFactoryProvider, mmaMessagesOfflineMessagesStore) {
    var stores = [
        {
            name: mmaMessagesOfflineMessagesStore,
            keyPath: ['touserid', 'smallmessage', 'timecreated'],
            indexes: [
                {
                    name: 'touserid'
                },
                {
                    name: 'useridfrom'
                },
                {
                    name: 'smallmessage'
                },
                {
                    name: 'timecreated'
                },
                {
                    name: 'deviceoffline' // If message was stored because device was offline.
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Offline messages factory.
 *
 * @module mm.addons.messages
 * @ngdoc service
 * @name $mmaMessagesOffline
 */
.factory('$mmaMessagesOffline', function($mmSitesManager, $log, $mmSite, $mmApp, $q, mmaMessagesOfflineMessagesStore) {
    $log = $log.getInstance('$mmaMessagesOffline');

    var self = {};

    /**
     * Delete a message.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesOffline#deleteMessage
     * @param  {Number} to          User ID to send the message to.
     * @param  {String} message     The message.
     * @param  {Number} timecreated The time the message was created.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if stored, rejected if failure.
     */
    self.deleteMessage = function(to, message, timecreated, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaMessagesOfflineMessagesStore, [to, message, timecreated]);
        });
    };

    /**
     * Get all messages where deviceoffline is set to 1.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesOffline#getAllDeviceOfflineMessages
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with messages.
     */
    self.getAllDeviceOfflineMessages = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaMessagesOfflineMessagesStore, 'deviceoffline', 1);
        });
    };

    /**
     * Get all offline messages.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesOffline#getAllMessages
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with messages.
     */
    self.getAllMessages = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaMessagesOfflineMessagesStore);
        });
    };

    /**
     * Get offline messages to send to a certain user.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesOffline#getMessages
     * @param  {Number} to       User ID to get messages to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with messages.
     */
    self.getMessages = function(to, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaMessagesOfflineMessagesStore, 'touserid', to);
        });
    };

    /**
     * Get an offline message.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesOffline#getMessage
     * @param  {Number} to          User ID to send the message to.
     * @param  {String} message     The message.
     * @param  {Number} timecreated The time the message was created.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the message.
     */
    self.getMessage = function(to, message, timecreated, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaMessagesOfflineMessagesStore, [to, message, timecreated]);
        });
    };

    /**
     * Check if there are offline messages to send to a certain user.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesOffline#hasMessages
     * @param  {Number} to       User ID to check.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean: true if has offline messages, false otherwise.
     */
    self.hasMessages = function(to, siteId) {
        return self.getMessages(to, siteId).then(function(messages) {
            return !!messages.length;
        });
    };

    /**
     * Save a message to be sent later.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesOffline#saveMessage
     * @param  {Number} to       User ID to send the message to.
     * @param  {String} message  The message to send.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if stored, rejected if failure.
     */
    self.saveMessage = function(to, message, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                entry = {
                    touserid: to,
                    useridfrom: site.getUserId(),
                    smallmessage: message,
                    textformat: 1,
                    timecreated: new Date().getTime(),
                    deviceoffline: $mmApp.isOnline() ? 0 : 1
                };

            return db.insert(mmaMessagesOfflineMessagesStore, entry);
        });
    };

    /**
     * Set deviceoffline in a message.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesOffline#setMessageDeviceOffline
     * @param  {Number} to          User ID to send the message to.
     * @param  {String} message     The message.
     * @param  {Number} timecreated The time the message was created.
     * @param  {Boolean} value      Value to set.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if stored, rejected if failure.
     */
    self.setMessageDeviceOffline = function(to, message, timecreated, value, siteId) {
        siteId = siteId || $mmSite.getId();
        value = value ? 1 : 0;

        // Get the message.
        return self.getMessage(to, message, timecreated, siteId).then(function(entry) {
            // Update entry and store it.
            entry.deviceoffline = value;
            return $mmSitesManager.getSite(siteId).then(function(site) {
                return site.getDb().insert(mmaMessagesOfflineMessagesStore, entry);
            });
        });
    };

    /**
     * Set deviceoffline for a group of messages.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesOffline#setMessageDeviceOffline
     * @param  {Object} messages Messages to update. Should be the same entry as retrieved from the DB.
     * @param  {Boolean} value   Value to set.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if stored, rejected if failure.
     */
    self.setMessagesDeviceOffline = function(messages, value, siteId) {
        siteId = siteId || $mmSite.getId();
        value = value ? 1 : 0;

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                promises = [];

            angular.forEach(messages, function(message) {
                message.deviceoffline = value;
                promises.push(db.insert(mmaMessagesOfflineMessagesStore, message));
            });

            return $q.all(promises);
        });
    };

    return self;
});
