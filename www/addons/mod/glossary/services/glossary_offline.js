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

angular.module('mm.addons.mod_glossary')

.constant('mmaModGlossaryAddEntryStore', 'mma_mod_glossary_add_entry')

.config(function($mmSitesFactoryProvider, mmaModGlossaryAddEntryStore) {
    var stores = [
        {
            name: mmaModGlossaryAddEntryStore,
            keyPath: ['glossaryid', 'concept', 'timecreated'],
            indexes: [
                {
                    name: 'glossaryid'
                },
                {
                    name: 'concept'
                },
                {
                    name: 'userid'
                },
                {
                    name: 'glossaryAndConcept',
                    keyPath: ['glossaryid', 'concept']
                },
                {
                    name: 'glossaryAndUser',
                    keyPath: ['glossaryid', 'userid']
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Offline glossary factory.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc service
 * @name $mmaModGlossaryOffline
 */
.factory('$mmaModGlossaryOffline', function($mmSitesManager, $log, mmaModGlossaryAddEntryStore, $mmFS, $q, $mmUtil) {
    $log = $log.getInstance('$mmaModGlossaryOffline');

    var self = {};

    /**
     * Delete an add entry data.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#deleteAddEntry
     * @param  {Number} glossaryId   Glossary ID.
     * @param  {String} concept      Glossary entry concept.
     * @param  {Number} timecreated  Time to allow duplicated entries.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if deleted, rejected if failure.
     */
    self.deleteAddEntry = function(glossaryId, concept, timecreated, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModGlossaryAddEntryStore, [glossaryId, concept, timecreated]);
        });
    };

    /**
     * Get all the stored add entry data from all the glossaries.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#getAllAddEntries
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with entries.
     */
    self.getAllAddEntries = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModGlossaryAddEntryStore);
        });
    };

    /**
     * Get a stored add entry data.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#getAddEntry
     * @param  {Number} glossaryId  Glossary ID.
     * @param  {String} concept     Glossary entry concept.
     * @param  {Number} timecreated Time to allow duplicated entries.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with entry.
     */
    self.getAddEntry = function(glossaryId, concept, timecreated, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModGlossaryAddEntryStore, [glossaryId, concept, timecreated]);
        });
    };

    /**
     * Get all the stored add entry data from a certain glossary.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#getGlossaryAddEntries
     * @param  {Number} glossaryId Glossary ID.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @param  {Number} [userId]   User the entries belong to. If not defined, current user in site.
     * @return {Promise}           Promise resolved with entries.
     */
    self.getGlossaryAddEntries = function(glossaryId, siteId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().whereEqual(mmaModGlossaryAddEntryStore, 'glossaryAndUser', [glossaryId, userId]);
        });
    };

    /**
     * Check if a concept is used offline.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#isConceptUsed
     * @param  {Number} glossaryId      Glossary ID.
     * @param  {String} concept         Concept to check.
     * @param  {Number} [timecreated]   Timecreated to check that is not the timecreated we are editing.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with true if concept is found, false otherwise.
     */
    self.isConceptUsed = function(glossaryId, concept, timecreated, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModGlossaryAddEntryStore, 'glossaryAndConcept', [glossaryId, concept])
                    .then(function(entries) {
                if (!!entries.length) {
                    if (entries.length > 1 || !timecreated) {
                        return true;
                    }
                    // If there's only one entry, check that is not the one we are editing.
                    return $mmUtil.promiseFails(self.getAddEntry(glossaryId, concept, timecreated, siteId));
                }
                return false;
            });
        }).catch(function() {
            // No offline data found, return false.
            return false;
        });
    };


    /**
     * Save an add entry data to be sent later.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#saveAddEntry
     * @param  {Number} glossaryId      Glossary ID.
     * @param  {String} concept         Glossary entry concept.
     * @param  {String} definition      Glossary entry concept definition.
     * @param  {Number} courseId        Course ID of the glossary.
     * @param  {Array}  [options]       Array of options for the entry.
     * @param  {Object} [attach]        Result of $mmFileUploader#storeFilesToUpload for attachments.
     * @param  {Number} [timecreated]   The time the entry was created. If not defined, current time.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @param  {Number} [userId]        User the entry belong to. If not defined, current user in site.
     * @param  {Object} [discardEntry]  The entry provided will be discarded if found.
     * @return {Promise}                Promise resolved if stored, rejected if failure.
     */
    self.saveAddEntry = function(glossaryId, concept, definition, courseId, options, attach, timecreated, siteId, userId,
            discardEntry) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var entry = {
                    glossaryid: glossaryId,
                    courseid: courseId,
                    concept: concept,
                    definition: definition,
                    definitionformat: 'html',
                    options: options,
                    userid: userId,
                    timecreated: timecreated || new Date().getTime()
                };

            if (attach) {
                entry.attachments = attach;
            }

            // If editing an offline entry, delete previous first.
            var discardPromise = discardEntry ?
                self.deleteAddEntry(glossaryId, discardEntry.concept, discardEntry.timecreated, site.getId()) : $q.when();

            return discardPromise.then(function() {
                return site.getDb().insert(mmaModGlossaryAddEntryStore, entry);
            });
        });
    };

    /**
     * Get the path to the folder where to store files for offline attachments in a glossary.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#getGlossaryFolder
     * @param  {Number} glossaryId  Glossary ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the path.
     */
    self.getGlossaryFolder = function(glossaryId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {

            var siteFolderPath = $mmFS.getSiteFolder(site.getId()),
                folderPath = 'offlineglossary/' + glossaryId;

            return $mmFS.concatenatePaths(siteFolderPath, folderPath);
        });
    };

    /**
     * Get the path to the folder where to store files for a new offline entry.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#getEntryFolder
     * @param  {Number} glossaryId  Glossary ID.
     * @param  {Number} entryName   The name of the entry.
     * @param  {Number} timecreated Time to allow duplicated entries.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the path.
     */
    self.getEntryFolder = function(glossaryId, entryName, timecreated, siteId) {
        return self.getGlossaryFolder(glossaryId, siteId).then(function(folderPath) {
            return $mmFS.concatenatePaths(folderPath, 'newentry_' + entryName + '_' + timecreated);
        });
    };

    return self;
});
