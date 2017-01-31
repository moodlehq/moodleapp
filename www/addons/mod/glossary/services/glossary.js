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

/**
 * Glossary service.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc service
 * @name $mmaModGlossary
 */
.factory('$mmaModGlossary', function($mmSite, $q, $mmSitesManager, $mmFilepool, mmaModGlossaryComponent, $mmaModGlossaryOffline,
        mmaModGlossaryLimitEntriesNum, $mmApp, $mmUtil, mmaModGlossaryLimitCategoriesNum, $mmText) {
    var self = {};

    /**
     * Get the course glossary cache key.
     *
     * @param  {Number} courseId
     * @return {String}
     * @protected
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#_getCourseGlossariesCacheKey
     */
    self._getCourseGlossariesCacheKey = function(courseId) {
        return 'mmaModGlossary:courseGlossaries:' + courseId;
    };

    /**
     * Get all the glossaries in a course.
     *
     * @param  {Number} courseId
     * @return {Promise} resolved with the glossaries
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#getCourseGlossaries
     */
    self.getCourseGlossaries = function(courseId) {
        var params = {
                courseids: [courseId]
            },
            preSets = {
                cacheKey: self._getCourseGlossariesCacheKey(courseId)
            };
        return $mmSite.read('mod_glossary_get_glossaries_by_courses', params, preSets).then(function(result) {
            return result.glossaries;
        });
    };

    /**
     * Invalidate all glossaries in a course.
     *
     * @param  {Number} courseId
     * @return {Promise}
     * @protected
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#invalidateCourseGlossaries
     */
    self.invalidateCourseGlossaries = function(courseId) {
        var key = self._getCourseGlossariesCacheKey(courseId);
        return $mmSite.invalidateWsCacheForKey(key);
    };

    /**
     * Get the entries by author cache key.
     *
     * @param  {Number} glossaryId
     * @param  {String} letter
     * @param  {String} field
     * @param  {String} sort
     * @return {String}
     * @protected
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#_getEntriesByAuthorCacheKey
     */
    self._getEntriesByAuthorCacheKey = function(glossaryId, letter, field, sort) {
        return 'mmaModGlossary:entriesByAuthor:' + glossaryId + ":" + letter + ":" + field + ":" + sort;
    };

    /**
     * Get entries by author.
     *
     * @param  {Number} glossaryId
     * @param  {String} letter
     * @param  {String} field
     * @param  {String} sort
     * @param  {Number} from
     * @param  {Number} limit
     * @param  {Boolean} forceCache     True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#getEntriesByAuthor
     */
    self.getEntriesByAuthor = function(glossaryId, letter, field, sort, from, limit, forceCache) {
        var params = {
                id: glossaryId,
                letter: letter,
                field: field,
                sort: sort,
                from: from,
                limit: limit
            },
            preSets = {
                cacheKey: self._getEntriesByAuthorCacheKey(glossaryId, letter, field, sort)
            };

        if (forceCache) {
            preSets.omitExpires = true;
        }

        return $mmSite.read('mod_glossary_get_entries_by_author', params, preSets);
    };

    /**
     * Invalidate cache of entries by author.
     *
     * @param  {Number} glossaryId
     * @param  {String} letter
     * @param  {String} field
     * @param  {String} sort
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#invalidateEntriesByAuthor
     */
    self.invalidateEntriesByAuthor = function(glossaryId, letter, field, sort) {
        var key = self._getEntriesByAuthorCacheKey(glossaryId, letter, field, sort);
        return $mmSite.invalidateWsCacheForKey(key);
    };

    /**
     * Get the entries by date cache key.
     *
     * @param  {Number} glossaryId
     * @param  {String} order
     * @param  {String} sort
     * @return {String}
     * @protected
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#_getEntriesByDateCacheKey
     */
    self._getEntriesByDateCacheKey = function(glossaryId, order, sort) {
        return 'mmaModGlossary:entriesByDate:' + glossaryId + ":" + order + ":" + sort;
    };

    /**
     * Get entries by date.
     *
     * @param  {Number} glossaryId
     * @param  {String} order
     * @param  {String} sort
     * @param  {Number} from
     * @param  {Number} limit
     * @param  {Boolean} forceCache     True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#getEntriesByDate
     */
    self.getEntriesByDate = function(glossaryId, order, sort, from, limit, forceCache) {
        var params = {
                id: glossaryId,
                order: order,
                sort: sort,
                from: from,
                limit: limit
            },
            preSets = {
                cacheKey: self._getEntriesByDateCacheKey(glossaryId, order, sort)
            };

        if (forceCache) {
            preSets.omitExpires = true;
        }

        return $mmSite.read('mod_glossary_get_entries_by_date', params, preSets);
    };

    /**
     * Invalidate cache of entries by date.
     *
     * @param  {Number} glossaryId
     * @param  {String} letter
     * @param  {String} field
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#invalidateEntriesByDate
     */
    self.invalidateEntriesByDate = function(glossaryId, order, sort) {
        var key = self._getEntriesByDateCacheKey(glossaryId, order, sort);
        return $mmSite.invalidateWsCacheForKey(key);
    };

    /**
     * Get the entries by letter cache key.
     *
     * @param  {Number} glossaryId
     * @param  {String} letter
     * @return {String}
     * @protected
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#_getEntriesByLetterCacheKey
     */
    self._getEntriesByLetterCacheKey = function(glossaryId, letter) {
        return 'mmaModGlossary:entriesByLetter:' + glossaryId + ":" + letter;
    };

    /**
     * Get entries by letter.
     *
     * @param  {Number} glossaryId
     * @param  {String} letter
     * @param  {Number} from
     * @param  {Number} limit
     * @param  {Boolean} forceCache     True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#getEntriesByLetter
     */
    self.getEntriesByLetter = function(glossaryId, letter, from, limit, forceCache) {
        var params = {
                id: glossaryId,
                letter: letter,
                from: from,
                limit: limit
            },
            preSets = {
                cacheKey: self._getEntriesByLetterCacheKey(glossaryId, letter)
            };

        if (forceCache) {
            preSets.omitExpires = true;
        }

        return $mmSite.read('mod_glossary_get_entries_by_letter', params, preSets);
    };

    /**
     * Invalidate cache of entries by letter.
     *
     * @param  {Number} glossaryId
     * @param  {String} letter
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#invalidateEntriesByLetter
     */
    self.invalidateEntriesByLetter = function(glossaryId, letter) {
        var key = self._getEntriesByLetterCacheKey(glossaryId, letter);
        return $mmSite.invalidateWsCacheForKey(key);
    };

    /**
     * Get the entries by search cache key.
     *
     * @param  {Number} glossaryId
     * @param  {String} query
     * @param  {Boolean} fullsearch
     * @param  {String} order
     * @param  {String} sort
     * @return {String}
     * @protected
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#_getEntriesBySearchCacheKey
     */
    self._getEntriesBySearchCacheKey = function(glossaryId, query, fullsearch, order, sort) {
        return 'mmaModGlossary:entriesBySearch:' + glossaryId + ":" + fullsearch + ":" + order + ":" + sort + ":" + query;
    };

    /**
     * Get entries by search.
     *
     * @param  {Number} glossaryId
     * @param  {String} query
     * @param  {Boolean} fullsearch
     * @param  {String} order
     * @param  {String} sort
     * @param  {Number} from
     * @param  {Number} limit
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#getEntriesBySearch
     */
    self.getEntriesBySearch = function(glossaryId, query, fullsearch, order, sort, from, limit) {
        var params = {
                id: glossaryId,
                query: query,
                fullsearch: fullsearch,
                order: order,
                sort: sort,
                from: from,
                limit: limit
            },
            preSets = {
                cacheKey: self._getEntriesBySearchCacheKey(glossaryId, query, fullsearch, order, sort)
            };

        return $mmSite.read('mod_glossary_get_entries_by_search', params, preSets);
    };

    /**
     * Invalidate cache of entries by search.
     *
     * @param  {Number} glossaryId
     * @param  {String} query
     * @param  {Boolean} fullsearch
     * @param  {String} order
     * @param  {String} sort
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#invalidateEntriesBySearch
     */
    self.invalidateEntriesBySearch = function(glossaryId, query, fullsearch, order, sort) {
        var key = self._getEntriesBySearchCacheKey(glossaryId, query, fullsearch, order, sort);
        return $mmSite.invalidateWsCacheForKey(key);
    };

    /**
     * Get the glossary categories cache key.
     *
     * @param  {Number} id      Glossary Id
     * @return {String}     The cache key
     */
    function getCategoriesCacheKey(id) {
        return 'mmaModGlossary:categories:' + id;
    }

    /**
     * Get all the categories related to the glossary.
     *
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#getAllCategories
     * @param  {Number} id          Glossary Id.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the categories.
     */
    self.getAllCategories = function(id, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return getCategories(id, 0, mmaModGlossaryLimitCategoriesNum, [], site);
        });
    };


    /**
     * Get the categories related to the glossary by sections. It's a recursive function see initial call values.
     *
     * @param  {Number} id          Glossary Id.
     * @param  {Number} from        Number of categories already fetched, so fetch will be done from this number.  Initial value 0.
     * @param  {Number} limit       Number of categories to fetch. Initial value mmaModGlossaryLimitCategoriesNum.
     * @param  {Array}  categories  Already fetched categories where to append the fetch. Initial value [].
     * @param  {Object} site        Site Object.
     * @return {Promise}            Promise resolved with the categories.
     */
    function getCategories(id, from, limit, categories, site) {
        var params = {
                id: id,
                from: from,
                limit: limit
            },
            preSets = {
                cacheKey: getCategoriesCacheKey(id)
            };

        return site.read('mod_glossary_get_categories', params, preSets).then(function(response) {
            categories = categories.concat(response.categories);
            canLoadMore = (from + limit) < response.count;
            if (canLoadMore) {
                from += limit;
                return getCategories(id, from, limit, categories, site);
            }
            return categories;
        });
    }

    /**
     * Invalidate cache of categories by glossary id.
     *
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#invalidateCategories
     * @param  {Number} id          Glossary Id
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when categories data has been invalidated,
     */
    self.invalidateCategories = function(id, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(self._getCategoriesCacheKey(id));
        });
    };

    /**
     * Get an entry by ID cache key.
     *
     * @param  {Number} id
     * @return {String}
     * @protected
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#_getEntryCacheKey
     */
    self._getEntryCacheKey = function(id) {
        return 'mmaModGlossary:getEntry:' + id;
    };

    /**
     * Get one entry by ID.
     *
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#getEntry
     * @param  {Number} id       Entry ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the entry.
     */
    self.getEntry = function(id, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    id: id
                },
                preSets = {
                    cacheKey: self._getEntryCacheKey(id)
                };

            return site.read('mod_glossary_get_entry_by_id', params, preSets).then(function(response) {
                if (response && response.entry) {
                    return response.entry;
                } else {
                    return $q.reject();
                }
            });
        });
    };

    /**
     * Performs the whole fetch of the entries using the propper function and arguments.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#fetchAllEntries
     * @param  {Function}   fetchFunction   Function to fetch.
     * @param  {Array}      fetchArguments  Arguments to call the fetching.
     * @param  {Boolean}    forceCache      True to always get the value from cache, false otherwise. Default false.
     * @param  {Array}      entries         Entries already fetch (just to concatenate them).
     * @param  {Number}     limitFrom       Number of entries already fetched, so fetch will be done from this number.
     * @return {Promise}    Promise resolved when done.
     */
    self.fetchAllEntries = function(fetchFunction, fetchArguments, forceCache, entries, limitFrom) {
        var limitNum = mmaModGlossaryLimitEntriesNum;

        if (typeof limitFrom == 'undefined' || typeof entries == 'undefined') {
            limitFrom = 0;
            entries = [];
        }

        var args = angular.extend([], fetchArguments);
        args.push(limitFrom);
        args.push(limitNum);

        return fetchFunction.apply(this, args).then(function(result) {
            entries = entries.concat(result.entries);
            canLoadMore = (limitFrom + limitNum) < result.count;
            if (canLoadMore) {
                limitFrom += limitNum;
                return self.fetchAllEntries(fetchFunction, fetchArguments, forceCache, entries, limitFrom);
            }
            return entries;
        });
    };

    /**
     * Invalidate cache of entry by ID.
     *
     * @param  {Number} id
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#invalidateEntry
     */
    self.invalidateEntry = function(id) {
        var key = self._getEntryCacheKey(id);
        return $mmSite.invalidateWsCacheForKey(key);
    };

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use $mmaModGlossary#invalidateFiles.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @return {Promise}        Promise resolved when data is invalidated.
     */
     self.invalidateContent = function(moduleId, courseId) {
        return self.getGlossary(courseId, moduleId).then(function(glossary) {
            return self.invalidateGlossaryEntries(glossary).finally(function() {
                var promises = [];
                promises.push(self.invalidateCourseGlossaries(courseId));
                promises.push(self.invalidateCategories(glossary.id));
                return $q.all(promises);
            });
        });
    };

    /**
     * Invalidate the prefetched content for a given glossary, except files.
     * To invalidate files, use $mmaModGlossary#invalidateFiles.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#invalidateGlossaryEntries
     * @param {Object} glossary The glossary object.
     * @return {Promise}        Promise resolved when data is invalidated.
     */
    self.invalidateGlossaryEntries = function(glossary) {
        return self.fetchAllEntries(self.getEntriesByLetter, [glossary.id, 'ALL'], true).then(function(entries) {
            var promises = [];

            angular.forEach(entries, function(entry) {
                promises.push(self.invalidateEntry(entry.id));
            });

            angular.forEach(glossary.browsemodes, function(mode) {
                switch(mode) {
                    case 'letter':
                        promises.push(self.invalidateEntriesByLetter(glossary.id, 'ALL'));
                        break;
                    case 'cat':
                        // Not implemented.
                        break;
                    case 'date':
                        promises.push(self.invalidateEntriesByDate(glossary.id, 'CREATION', 'DESC'));
                        promises.push(self.invalidateEntriesByDate(glossary.id, 'UPDATE', 'DESC'));
                        break;
                    case 'author':
                        promises.push(self.invalidateEntriesByAuthor(glossary.id, 'ALL', 'LASTNAME', 'ASC'));
                        break;
                }
            });

            return $q.all(promises);
        });
    };

    /**
     * Invalidate the prefetched files.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#invalidateFiles
     * @param {Number} moduleId The module ID.
     * @return {Promise}        Promise resolved when the files are invalidated.
     */
     self.invalidateFiles = function(moduleId) {
         return $mmFilepool.invalidateFilesByComponent($mmSite.getId(), mmaModGlossaryComponent, moduleId);
     };

    /**
     * Get one glossary by cmID.
     *
     * @param  {Number} courseId
     * @param  {Number} cmid
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#getGlossary
     */
    self.getGlossary = function(courseId, cmid) {
        return self.getCourseGlossaries(courseId).then(function(glossaries) {
            var result = $q.reject();
            angular.forEach(glossaries, function(glossary) {
                if (glossary.coursemodule == cmid) {
                    result = glossary;
                }
            });
            return result;
        });
    };

    /**
     * Get one glossary by glossary ID.
     *
     * @param  {Number} courseId
     * @param  {Number} id
     * @return {Promise}
     * @ngdoc  method
     * @module mm.addons.mod_glossary
     * @name   $mmaModGlossary#getGlossaryById
     */
    self.getGlossaryById = function(courseId, id) {
        return self.getCourseGlossaries(courseId).then(function(glossaries) {
            var result = $q.reject();
            angular.forEach(glossaries, function(glossary) {
                if (glossary.id == id) {
                    result = glossary;
                }
            });
            return result;
        });
    };

    /**
     * Create a new entry on a glossary
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#addEntry
     * @param  {Number} glossaryId Glossary ID.
     * @param  {String} concept    Glossary entry concept.
     * @param  {String} definition Glossary entry concept definition.
     * @param  {Number} courseId   Course ID of the glossary.
     * @param  {Array}  [options]  Array of options for the entry.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with entry ID if entry was created in server, false if stored in device.
     */
    self.addEntry = function(glossaryId, concept, definition, courseId, options, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!$mmApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // Discard stored content for this entry. If it exists it means the user is editing it.
        return $mmaModGlossaryOffline.deleteAddEntry(glossaryId, concept, siteId).then(function() {
            // Try to add it in online.
            return self.addEntryOnline(glossaryId, concept, definition, options, siteId).then(function(entryId) {
                return entryId;
            }).catch(function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means that responses cannot be deleted.
                    return $q.reject(error.error);
                } else {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                }
            });
        });

        // Convenience function to store a new page to be synchronized later.
        function storeOffline() {
            return $mmaModGlossaryOffline.saveAddEntry(glossaryId, concept, definition, courseId, options, siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Create a new entry on a glossary. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#addEntryOnline
     * @param  {Number} glossaryId Glossary ID.
     * @param  {String} concept    Glossary entry concept.
     * @param  {String} definition Glossary entry concept definition.
     * @param  {Array}  [options]  Array of options for the entry.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved if created, rejected otherwise. Reject param is an object with:
     *                                   - error: The error message.
     *                                   - wserror: True if it's an error returned by the WebService, false otherwise.
     */
    self.addEntryOnline = function(glossaryId, concept, definition, options, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    glossaryid: glossaryId,
                    concept: concept,
                    definition: definition,
                    definitionformat: 1
                };
            if (options) {
                params.options = $mmUtil.objectToArrayOfObjects(options, 'name', 'value');
            }

            return site.write('mod_glossary_add_entry', params).catch(function(error) {
                var wserror = $mmUtil.isWebServiceError(error);
                if (wserror && error == "Invalid parameter value detected") {
                    // Old PARAM_TEXT is used on definition, resend it cleaning html.
                    var definition = $mmText.cleanTags(params.definition);
                    if (definition != params.definition) {
                        return self.addEntryOnline(glossaryId, concept, definition, options, siteId);
                    }
                }
                return $q.reject({
                    error: error,
                    wserror: wserror
                });
            }).then(function(response) {
                if (response.entryid) {
                    return response.entryid;
                }
                return $q.reject({
                    wserror: true
                });
            });
        });
    };

    /**
     * Check if glossary plugin is enabled in a certain site.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            // This function was introduced along with all the other required ones.
            return site.wsAvailable('mod_glossary_get_glossaries_by_courses');
        });
    };

    /**
     * Return whether or not the plugin is enabled for editing in the current site. Plugin is enabled if the glossary WS are
     * available.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#isPluginEnabledForEditing
     * @return {Boolean}     Whether the glossary editing is available or not.
     */
    self.isPluginEnabledForEditing = function() {
        return  $mmSite.wsAvailable('mod_glossary_add_entry');
    };

    /**
     * Report a glossary as being viewed.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#logView
     * @param {Number} id Glossary ID.
     * @param {String} mode The mode in which the glossary was viewed.
     * @return {Promise} Promise resolved when the WS call is successful.
     */
    self.logView = function(id, mode) {
        var params = {
            id: id,
            mode: mode
        };
        return $mmSite.write('mod_glossary_view_glossary', params);
    };

    /**
     * Report a glossary entry as being viewed.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#logEntryView
     * @param {Number} id Entry ID.
     * @return {Promise} Promise resolved when the WS call is successful.
     */
    self.logEntryView = function(id) {
        var params = {
            id: id
        };
        return $mmSite.write('mod_glossary_view_entry', params);
    };

    return self;
});
