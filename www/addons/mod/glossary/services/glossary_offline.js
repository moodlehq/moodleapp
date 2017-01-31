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
            keyPath: ['glossaryid', 'concept'],
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
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'glossaryAndUser',
                    generator: function(obj) {
                        return [obj.glossaryid, obj.userid];
                    }
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
.factory('$mmaModGlossaryOffline', function($mmSitesManager, $log, mmaModGlossaryAddEntryStore) {
    $log = $log.getInstance('$mmaModGlossaryOffline');

    var self = {};

    /**
     * Delete an add entry data.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#deleteAddEntry
     * @param  {Number} glossaryId Glossary ID.
     * @param  {String} concept    Glossary entry concept.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved if deleted, rejected if failure.
     */
    self.deleteAddEntry = function(glossaryId, concept, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModGlossaryAddEntryStore, [glossaryId, concept]);
        });
    };

    /**
     * Get all the stored add entry data from all the glossaries.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#getAllAddEntries
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with pages.
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
     * @param  {Number} glossaryId Glossary ID.
     * @param  {String} concept    Glossary entry concept.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with page.
     */
    self.getAddEntry = function(glossaryId, concept, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModGlossaryAddEntryStore, [glossaryId, concept]);
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
     * @return {Promise}           Promise resolved with pages.
     */
    self.getGlossaryAddEntries = function(glossaryId, siteId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().whereEqual(mmaModGlossaryAddEntryStore, 'glossaryAndUser', [glossaryId, userId]);
        });
    };


    /**
     * Save an add entry data to be sent later.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryOffline#saveAddEntry
     * @param  {Number} glossaryId Glossary ID.
     * @param  {String} concept    Glossary entry concept.
     * @param  {String} definition Glossary entry concept definition.
     * @param  {Number} courseId   Course ID of the glossary.
     * @param  {Array}  [options]  Array of options for the entry.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @param  {Number} [userId]   User the entry belong to. If not defined, current user in site.
     * @return {Promise}           Promise resolved if stored, rejected if failure.
     */
    self.saveAddEntry = function(glossaryId, concept, definition, courseId, options, siteId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var now = new Date().getTime(),
                entry = {
                    glossaryid: glossaryId,
                    courseid: courseId,
                    concept: concept,
                    definition: definition,
                    definitionformat: 'html',
                    options: options,
                    userid: userId,
                    timecreated: now,
                    timemodified: now
                };

            return site.getDb().insert(mmaModGlossaryAddEntryStore, entry);
        });
    };

    return self;
});
