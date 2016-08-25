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
                    name: 'timemodified'
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
.factory('$mmaMessagesOffline', function($mmSitesManager, $log, $mmSite, mmaMessagesOfflineMessagesStore) {
    $log = $log.getInstance('$mmaMessagesOffline');

    var self = {};

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
                    timemodified: new Date().getTime()
                };

            return db.insert(mmaMessagesOfflineMessagesStore, entry);
        });
    };

    return self;
});
