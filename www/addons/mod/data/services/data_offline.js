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

angular.module('mm.addons.mod_data')

.constant('mmaModDataEntriesStore', 'mma_mod_data_entry')

.config(function($mmSitesFactoryProvider, mmaModDataEntriesStore) {
    var stores = [
        {
            name: mmaModDataEntriesStore,
            keyPath: ['dataid', 'entryid', 'action'],
            indexes: [
                {
                    name: 'dataid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'groupid'
                },
                {
                    name: 'action'
                },
                {
                    name: 'entryid'
                },
                {
                    name: 'timemodified'
                },
                {
                    name: 'dataAndEntry',
                    keyPath: ['dataid', 'entryid']
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Offline data factory.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataOffline
 */
.factory('$mmaModDataOffline', function($mmSitesManager, $log, $mmFS, mmaModDataEntriesStore) {
    $log = $log.getInstance('$mmaModDataOffline');

    var self = {};

    /**
     * Delete all the actions of an entry.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataOffline#deleteAllEntryActions
     * @param  {Number} dataId   Database ID.
     * @param  {Number} entryId  Database entry ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if deleted, rejected if failure.
     */
    self.deleteAllEntryActions = function(dataId, entryId, siteId) {
        return self.getEntryActions(dataId, entryId, siteId).then(function(actions) {
            var promises = [];
            angular.forEach(actions, function(action) {
                promises.push(self.deleteEntry(dataId, entryId, action.action, siteId));
            });
            return $q.all(promises);
        });
    };

    /**
     * Delete an stored entry.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataOffline#deleteEntry
     * @param  {Number} dataId       Database ID.
     * @param  {String} entryId      Database entry Id.
     * @param  {String} action       Action to be done
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if deleted, rejected if failure.
     */
    self.deleteEntry = function(dataId, entryId, action, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModDataEntriesStore, [dataId, entryId, action]);
        });
    };

    /**
     * Get all the stored entry data from all the databases.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataOffline#getAllEntries
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with entries.
     */
    self.getAllEntries = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModDataEntriesStore);
        });
    };

    /**
     * Get an stored entry data.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataOffline#getEntry
     * @param  {Number} dataId      Database ID.
     * @param  {String} entryId     Database entry Id.
     * @param  {String} action       Action to be done
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with entry.
     */
    self.getEntry = function(dataId, entryId, action, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModDataEntriesStore, [dataId, entryId, action]);
        });
    };

    /**
     * Get an all stored entry actions data.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataOffline#getEntryActions
     * @param  {Number} dataId      Database ID.
     * @param  {String} entryId     Database entry Id.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with entry actions.
     */
    self.getEntryActions = function(dataId, entryId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModDataEntriesStore, 'dataAndEntry', [dataId, entryId]);
        });
    };

    /**
     * Get all the stored entry data from a certain database.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataOffline#getDatabaseEntries
     * @param  {Number} dataId     Database ID.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with entries.
     */
    self.getDatabaseEntries = function(dataId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModDataEntriesStore, 'dataid', dataId);
        });
    };

    /**
     * Check if there are offline entries to send.
     *
     * @module mm.addons.method
     * @ngdoc method
     * @name $mmaModDataOffline#hasOfflineData
     * @param  {Number} dataId    Database ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    self.hasOfflineData = function(dataId, siteId) {
        return self.getDatabaseEntries(dataId, siteId).then(function(entries) {
            return !!entries.length;
        }).catch(function() {
            // No offline data found, return false.
            return false;
        });
    };

    /**
     * Save an entry data to be sent later.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataOffline#saveEntry
     * @param  {Number} dataId          Database ID.
     * @param  {String} entryId         Database entry Id. If action is add entryId should be 0 and -timemodified will be used.
     * @param  {String} action          Action to be done to the entry: [add, edit, delete, approve, disapprove]
     * @param  {Number} courseId        Course ID of the database.
     * @param  {Number} [groupId]       Group ID. ONly provided when adding.
     * @param  {Array}  [fields]        Array of field data of the entry if needed.
     * @param  {Number} [timemodified]  The time the entry was modified. If not defined, current time.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved if stored, rejected if failure.
     */
    self.saveEntry = function(dataId, entryId, action, courseId, groupId, fields, timemodified, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            timemodified = timemodified || new Date().getTime();
            entryId = typeof entryId == "undefined" || entryId === false ? -timemodified : entryId;
            var entry = {
                    dataid: dataId,
                    courseid: courseId,
                    groupid: groupId,
                    action: action,
                    entryid: entryId,
                    fields: fields,
                    timemodified: timemodified
                };
            return site.getDb().insert(mmaModDataEntriesStore, entry);
        });
    };

    /**
     * Get the path to the folder where to store files for offline files in a database.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataOffline#getDatabaseFolder
     * @param  {Number} dataId      Database ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the path.
     */
    self.getDatabaseFolder = function(dataId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {

            var siteFolderPath = $mmFS.getSiteFolder(site.getId()),
                folderPath = 'offlinedatabase/' + dataId;

            return $mmFS.concatenatePaths(siteFolderPath, folderPath);
        });
    };

    /**
     * Get the path to the folder where to store files for a new offline entry.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataOffline#getEntryFieldFolder
     * @param  {Number} dataId      Database ID.
     * @param  {Number} entryId     The ID of the entry.
     * @param  {Number} fieldId     Field ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the path.
     */
    self.getEntryFieldFolder = function(dataId, entryId, fieldId ,siteId) {
        return self.getDatabaseFolder(dataId, siteId).then(function(folderPath) {
            return $mmFS.concatenatePaths(folderPath, entryId + '_' + fieldId);
        });
    };

    return self;
});