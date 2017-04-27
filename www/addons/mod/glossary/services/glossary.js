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
        mmaModGlossaryLimitEntriesNum, $mmApp, $mmUtil, mmaModGlossaryLimitCategoriesNum, $mmText, $mmLang,
        mmaModGlossaryShowAllCategories) {
    var self = {};

    /**
     * Get the course glossary cache key.
     *
     * @protected
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#_getCourseGlossariesCacheKey
     * @param  {Number} courseId    Course Id.
     * @return {String}             Cache key.
     */
    self._getCourseGlossariesCacheKey = function(courseId) {
        return 'mmaModGlossary:courseGlossaries:' + courseId;
    };

    /**
     * Get all the glossaries in a course.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#getCourseGlossaries
     * @param  {Number} courseId     Course Id.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Resolved with the glossaries.
     */
    self.getCourseGlossaries = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: self._getCourseGlossariesCacheKey(courseId)
                };
            return site.read('mod_glossary_get_glossaries_by_courses', params, preSets).then(function(result) {
                return result.glossaries;
            });
        });
    };

    /**
     * Invalidate all glossaries in a course.
     *
     * @protected
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#invalidateCourseGlossaries
     * @param  {Number} courseId     Course Id.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Resolved when data is invalidated.
     */
    self.invalidateCourseGlossaries = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var key = self._getCourseGlossariesCacheKey(courseId);
            return site.invalidateWsCacheForKey(key);
        });
    };

    /**
     * Get the entries by author cache key.
     *
     * @protected
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#_getEntriesByAuthorCacheKey
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {String} letter      First letter of firstname or lastname, or either keywords: ALL or SPECIAL.
     * @param  {String} field       Search and order using: FIRSTNAME or LASTNAME
     * @param  {String} sort        The direction of the order: ASC or DESC
     * @return {String}             Cache key.
     */
    self._getEntriesByAuthorCacheKey = function(glossaryId, letter, field, sort) {
        return 'mmaModGlossary:entriesByAuthor:' + glossaryId + ":" + letter + ":" + field + ":" + sort;
    };

    /**
     * Get entries by author.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#getEntriesByAuthor
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {String} letter      First letter of firstname or lastname, or either keywords: ALL or SPECIAL.
     * @param  {String} field       Search and order using: FIRSTNAME or LASTNAME
     * @param  {String} sort        The direction of the order: ASC or DESC
     * @param  {Number} from        Start returning records from here.
     * @param  {Number} limit       Number of records to return.
     * @param  {Boolean} forceCache True to always get the value from cache, false otherwise. Default false.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Resolved with the entries.
     */
    self.getEntriesByAuthor = function(glossaryId, letter, field, sort, from, limit, forceCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
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

            return site.read('mod_glossary_get_entries_by_author', params, preSets);
        });
    };

    /**
     * Invalidate cache of entries by author.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#invalidateEntriesByAuthor
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {String} letter      First letter of firstname or lastname, or either keywords: ALL or SPECIAL.
     * @param  {String} field       Search and order using: FIRSTNAME or LASTNAME
     * @param  {String} sort        The direction of the order: ASC or DESC
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Resolved when data is invalidated.
     */
    self.invalidateEntriesByAuthor = function(glossaryId, letter, field, sort, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var key = self._getEntriesByAuthorCacheKey(glossaryId, letter, field, sort);
            return site.invalidateWsCacheForKey(key);
        });
    };

    /**
     * Get entries by category.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#getEntriesByCategory
     * @param  {Number} glossaryId      Glossary Id.
     * @param  {String} categoryId      The category ID. Use mmaModGlossaryShowAllCategories for all  categories, or
     *                                  mmaModGlossaryShowNotCategorised for uncategorised entries.
     * @param  {Number} from            Start returning records from here.
     * @param  {Number} limit           Number of records to return.
     * @param  {Boolean} forceCache     True to always get the value from cache, false otherwise. Default false.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.getEntriesByCategory = function(glossaryId, categoryId, from, limit, forceCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    id: glossaryId,
                    categoryid: categoryId,
                    from: from,
                    limit: limit
                },
                preSets = {
                    cacheKey: self._getEntriesByCategoryCacheKey(glossaryId, categoryId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_glossary_get_entries_by_category', params, preSets);
        });
    };

    /**
     * Invalidate cache of entries by category.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#invalidateEntriesByCategory
     * @param  {Number} glossaryId      Glossary Id.
     * @param  {String} categoryId      The category ID. Use mmaModGlossaryShowAllCategories for all  categories, or
     *                                  mmaModGlossaryShowNotCategorised for uncategorised entries.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}                Resolved when data is invalidated.
     */
    self.invalidateEntriesByCategory = function(glossaryId, categoryId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var key = self._getEntriesByCategoryCacheKey(glossaryId, categoryId);
            return site.invalidateWsCacheForKey(key);
        });
    };

    /**
     * Get the entries by category cache key.
     *
     * @protected
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#_getEntriesByCategoryCacheKey
     * @param  {Number} glossaryId      Glossary Id.
     * @param  {String} categoryId      The category ID. Use mmaModGlossaryShowAllCategories for all  categories, or
     *                                  mmaModGlossaryShowNotCategorised for uncategorised entries.
     * @return {String}                 Cache key.
     */
    self._getEntriesByCategoryCacheKey = function(glossaryId, categoryId) {
        return 'mmaModGlossary:entriesByCategory:' + glossaryId + ":" + categoryId;
    };

    /**
     * Get the entries by date cache key.
     *
     * @protected
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#_getEntriesByDateCacheKey
     * @param  {Number} glossaryId   Glossary Id.
     * @param  {String} order        The way to order the records.
     * @param  {String} sort         The direction of the order.
     * @return {String}              Cache key.
     */
    self._getEntriesByDateCacheKey = function(glossaryId, order, sort) {
        return 'mmaModGlossary:entriesByDate:' + glossaryId + ":" + order + ":" + sort;
    };

    /**
     * Get entries by date.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#getEntriesByDate
     * @param  {Number} glossaryId   Glossary Id.
     * @param  {String} order        The way to order the records.
     * @param  {String} sort         The direction of the order.
     * @param  {Number} from         Start returning records from here.
     * @param  {Number} limit        Number of records to return.
     * @param  {Boolean} forceCache  True to always get the value from cache, false otherwise. Default false.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Resolved with the entries.
     */
    self.getEntriesByDate = function(glossaryId, order, sort, from, limit, forceCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
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

            return site.read('mod_glossary_get_entries_by_date', params, preSets);
        });
    };

    /**
     * Invalidate cache of entries by date.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#invalidateEntriesByDate
     * @param  {Number} glossaryId   Glossary Id.
     * @param  {String} order        The way to order the records.
     * @param  {String} sort         The direction of the order.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Resolved when data is invalidated.
     */
    self.invalidateEntriesByDate = function(glossaryId, order, sort, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var key = self._getEntriesByDateCacheKey(glossaryId, order, sort);
            return site.invalidateWsCacheForKey(key);
        });
    };

    /**
     * Get the entries by letter cache key.
     *
     * @protected
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#_getEntriesByLetterCacheKey
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {String} letter      A letter, or a special keyword.
     * @return {String}             Cache key.
     */
    self._getEntriesByLetterCacheKey = function(glossaryId, letter) {
        return 'mmaModGlossary:entriesByLetter:' + glossaryId + ":" + letter;
    };

    /**
     * Get entries by letter.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#getEntriesByLetter
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {String} letter      A letter, or a special keyword.
     * @param  {Number} from        Start returning records from here.
     * @param  {Number} limit       Number of records to return.
     * @param  {Boolean} forceCache True to always get the value from cache, false otherwise. Default false.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Resolved with the entries.
     */
    self.getEntriesByLetter = function(glossaryId, letter, from, limit, forceCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
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

            return site.read('mod_glossary_get_entries_by_letter', params, preSets);
        });
    };

    /**
     * Invalidate cache of entries by letter.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#invalidateEntriesByLetter
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {String} letter      A letter, or a special keyword.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Resolved when data is invalidated.
     */
    self.invalidateEntriesByLetter = function(glossaryId, letter, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var key = self._getEntriesByLetterCacheKey(glossaryId, letter);
            return site.invalidateWsCacheForKey(key);
        });
    };

    /**
     * Get the entries by search cache key.
     *
     * @protected
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#_getEntriesBySearchCacheKey
     * @param  {Number} glossaryId      Glossary Id.
     * @param  {String} query           The search query.
     * @param  {Boolean} fullsearch     Whether or not full search is required.
     * @param  {String} order           The way to order the results.
     * @param  {String} sort            The direction of the order.
     * @return {String}                 Cache key.
     */
    self._getEntriesBySearchCacheKey = function(glossaryId, query, fullsearch, order, sort) {
        return 'mmaModGlossary:entriesBySearch:' + glossaryId + ":" + fullsearch + ":" + order + ":" + sort + ":" + query;
    };

    /**
     * Get entries by search.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#getEntriesBySearch
     * @param  {Number} glossaryId      Glossary Id.
     * @param  {String} query           The search query.
     * @param  {Boolean} fullsearch     Whether or not full search is required.
     * @param  {String} order           The way to order the results.
     * @param  {String} sort            The direction of the order.
     * @param  {Number} from            Start returning records from here.
     * @param  {Number} limit           Number of records to return.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Resolved with the entries.
     */
    self.getEntriesBySearch = function(glossaryId, query, fullsearch, order, sort, from, limit, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
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

            return site.read('mod_glossary_get_entries_by_search', params, preSets);
        });
    };

    /**
     * Invalidate cache of entries by search.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#invalidateEntriesBySearch
     * @param  {Number} glossaryId      Glossary Id.
     * @param  {String} query           The search query.
     * @param  {Boolean} fullsearch     Whether or not full search is required.
     * @param  {String} order           The way to order the results.
     * @param  {String} sort            The direction of the order.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Resolved when data is invalidated.
     */
    self.invalidateEntriesBySearch = function(glossaryId, query, fullsearch, order, sort, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var key = self._getEntriesBySearchCacheKey(glossaryId, query, fullsearch, order, sort);
            return site.invalidateWsCacheForKey(key);
        });
    };

    /**
     * Get the glossary categories cache key.
     *
     * @param  {Number} glossaryId  Glossary Id.
     * @return {String}             The cache key.
     */
    function getCategoriesCacheKey(glossaryId) {
        return 'mmaModGlossary:categories:' + glossaryId;
    }

    /**
     * Get all the categories related to the glossary.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#getAllCategories
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the categories if supported or empty array if not.
     */
    self.getAllCategories = function(glossaryId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return getCategories(glossaryId, 0, mmaModGlossaryLimitCategoriesNum, [], site);
        });
    };

    /**
     * Get the categories related to the glossary by sections. It's a recursive function see initial call values.
     *
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {Number} from        Number of categories already fetched, so fetch will be done from this number.  Initial value 0.
     * @param  {Number} limit       Number of categories to fetch. Initial value mmaModGlossaryLimitCategoriesNum.
     * @param  {Array}  categories  Already fetched categories where to append the fetch. Initial value [].
     * @param  {Object} site        Site Object.
     * @return {Promise}            Promise resolved with the categories.
     */
    function getCategories(glossaryId, from, limit, categories, site) {
        var params = {
                id: glossaryId,
                from: from,
                limit: limit
            },
            preSets = {
                cacheKey: getCategoriesCacheKey(glossaryId)
            };

        return site.read('mod_glossary_get_categories', params, preSets).then(function(response) {
            categories = categories.concat(response.categories);
            canLoadMore = (from + limit) < response.count;
            if (canLoadMore) {
                from += limit;
                return getCategories(glossaryId, from, limit, categories, site);
            }
            return categories;
        });
    }

    /**
     * Invalidate cache of categories by glossary id.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#invalidateCategories
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when categories data has been invalidated,
     */
    self.invalidateCategories = function(glossaryId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCategoriesCacheKey(glossaryId));
        });
    };

    /**
     * Get an entry by ID cache key.
     *
     * @protected
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#_getEntryCacheKey
     * @param  {Number} entryId  Entry Id.
     * @return {String}          Cache key.
     */
    self._getEntryCacheKey = function(entryId) {
        return 'mmaModGlossary:getEntry:' + entryId;
    };

    /**
     * Get one entry by ID.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc  method
     * @name   $mmaModGlossary#getEntry
     * @param  {Number} entryId  Entry ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the entry.
     */
    self.getEntry = function(entryId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    id: entryId
                },
                preSets = {
                    cacheKey: self._getEntryCacheKey(entryId)
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
     * @param  {String}     [siteId] Site ID. If not defined, current site.
     * @return {Promise}    Promise resolved when done.
     */
    self.fetchAllEntries = function(fetchFunction, fetchArguments, forceCache, entries, limitFrom, siteId) {
        var limitNum = mmaModGlossaryLimitEntriesNum;

        siteId = siteId || $mmSite.getId();

        if (typeof limitFrom == 'undefined' || typeof entries == 'undefined') {
            limitFrom = 0;
            entries = [];
        }

        var args = angular.extend([], fetchArguments);
        args.push(limitFrom);
        args.push(limitNum);
        args.push(siteId);

        return fetchFunction.apply(this, args).then(function(result) {
            entries = entries.concat(result.entries);
            canLoadMore = (limitFrom + limitNum) < result.count;
            if (canLoadMore) {
                limitFrom += limitNum;
                return self.fetchAllEntries(fetchFunction, fetchArguments, forceCache, entries, limitFrom, siteId);
            }
            return entries;
        });
    };

    /**
     * Invalidate cache of entry by ID.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#invalidateEntry
     * @param  {Number} entryId         Entry Id.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Resolved when data is invalidated.
     */
    self.invalidateEntry = function(entryId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(self._getEntryCacheKey(entryId));
        });
    };

    /**
     * Invalidate cache of all entries in the array.
     *
     * @param  {Array}  entries         Entry objects to invalidate.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Resolved when data is invalidated.
     */
    function invalidateEntries(entries, siteId) {
        var keys = [];
        angular.forEach(entries, function(entry) {
            keys.push(self._getEntryCacheKey(entry.id));
        });

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateMultipleWsCacheForKey(keys);
        });
    }

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
     * @param {Object} glossary         The glossary object.
     * @param {Object} onlyEntriesList  If true, entries won't be invalidated.
     * @return {Promise}                Promise resolved when data is invalidated.
     */
    self.invalidateGlossaryEntries = function(glossary, onlyEntriesList) {
        var promises = [];

        if (!onlyEntriesList) {
            promises.push(self.fetchAllEntries(self.getEntriesByLetter, [glossary.id, 'ALL'], true).then(function(entries) {
                return invalidateEntries(entries);
            }));
        }

        angular.forEach(glossary.browsemodes, function(mode) {
            switch(mode) {
                case 'letter':
                    promises.push(self.invalidateEntriesByLetter(glossary.id, 'ALL'));
                    break;
                case 'cat':
                    promises.push(self.invalidateEntriesByCategory(glossary.id, mmaModGlossaryShowAllCategories));
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
    };

    /**
     * Invalidate the prefetched files.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#invalidateFiles
     * @param {Number}  moduleId    The module ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the files are invalidated.
     */
     self.invalidateFiles = function(moduleId, siteId) {
         return $mmFilepool.invalidateFilesByComponent(siteId, mmaModGlossaryComponent, moduleId);
     };

    /**
     * Get one glossary by cmID.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#getGlossary
     * @param  {Number} courseId    Course Id.
     * @param  {Number} cmId        Course Module Id.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.getGlossary = function(courseId, cmId, siteId) {
        return self.getCourseGlossaries(courseId, siteId).then(function(glossaries) {
            var result = $q.reject();
            angular.forEach(glossaries, function(glossary) {
                if (glossary.coursemodule == cmId) {
                    result = glossary;
                }
            });
            return result;
        });
    };

    /**
     * Get one glossary by glossary ID.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name   $mmaModGlossary#getGlossaryById
     * @param  {Number} courseId    Course Id.
     * @param  {Number} glossaryId  Glossary Id.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.getGlossaryById = function(courseId, glossaryId, siteId) {
        return self.getCourseGlossaries(courseId, siteId).then(function(glossaries) {
            var result = $q.reject();
            angular.forEach(glossaries, function(glossary) {
                if (glossary.id == glossaryId) {
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
     * @param  {Number}  glossaryId        Glossary ID.
     * @param  {String}  concept           Glossary entry concept.
     * @param  {String}  definition        Glossary entry concept definition.
     * @param  {Number}  courseId          Course ID of the glossary.
     * @param  {Array}   [options]         Array of options for the entry.
     * @param  {Mixed}   [attach]          Attachments ID if sending online, result of $mmFileUploader#storeFilesToUpload otherwise.
     * @param  {Number}  [timecreated]     The time the entry was created. If not defined, current time.
     * @param  {String}  [siteId]          Site ID. If not defined, current site.
     * @param  {Object}  [discardEntry]    The entry provided will be discarded if found.
     * @param  {Boolean} allowOffline      True if it can be stored in offline, false otherwise.
     * @param  {Boolean} [checkDuplicates] Check for duplicates before storing offline. Only used if allowOffline is true.
     * @return {Promise}          Promise resolved with entry ID if entry was created in server, false if stored in device.
     */
    self.addEntry = function(glossaryId, concept, definition, courseId, options, attach, timecreated, siteId, discardEntry,
            allowOffline, checkDuplicates) {
        siteId = siteId || $mmSite.getId();

        if (!$mmApp.isOnline() && allowOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If we are editing an offline entry, discard previous first.
        var discardPromise = discardEntry ?
            $mmaModGlossaryOffline.deleteAddEntry(glossaryId, discardEntry.concept, discardEntry.timecreated, siteId) : $q.when();

        return discardPromise.then(function() {
            // Try to add it in online.
            return self.addEntryOnline(glossaryId, concept, definition, options, attach, siteId).then(function(entryId) {
                return entryId;
            }).catch(function(error) {
                if (allowOffline && error && !error.wserror) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error or offline not supported, reject.
                    return $q.reject(error.error);
                }
            });
        });

        // Convenience function to store a new entry to be synchronized later.
        function storeOffline() {
            var discardTime = discardEntry && discardEntry.timecreated,
                duplicatesPromise = checkDuplicates ? self.isConceptUsed(glossaryId, concept, discardTime, siteId) : $q.when(false);
            // Check if the entry is duplicated in online or offline mode.
            return duplicatesPromise.then(function(used) {
                if (used) {
                    return $mmLang.translateAndReject('mma.mod_glossary.errconceptalreadyexists');
                }

                return $mmaModGlossaryOffline.saveAddEntry(glossaryId, concept, definition, courseId, options, attach, timecreated,
                        siteId, undefined, discardEntry).then(function() {
                    return false;
                });
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
     * @param  {Number} [attachId] Attachments ID (if any attachment).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved if created, rejected otherwise. Reject param is an object with:
     *                                   - error: The error message.
     *                                   - wserror: True if it's an error returned by the WebService, false otherwise.
     */
    self.addEntryOnline = function(glossaryId, concept, definition, options, attachId, siteId) {
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

            if (attachId) {
                params.options.push({
                    name: 'attachmentsid',
                    value: attachId
                });
            }

            return addEntryOnline(site, params).then(function(response) {
                if (response.entryid) {
                    return response.entryid;
                }
                return $q.reject({
                    wserror: true
                });
            });
        });

        function addEntryOnline(site, params) {
            return site.write('mod_glossary_add_entry', params).catch(function(error) {
                var wserror = $mmUtil.isWebServiceError(error);
                if (wserror && error == "Invalid parameter value detected") {
                    // Old PARAM_TEXT is used on definition, resend it cleaning html.
                    var definition = $mmText.cleanTags(params.definition);
                    if (definition != params.definition) {
                        params.definition = definition;
                        return addEntryOnline(site, params);
                    }
                }
                return $q.reject({
                    error: error,
                    wserror: wserror
                });
            });
        }
    };

    /**
     * Check if a entry concept is already used.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossary#isConceptUsed
     * @param  {Number} glossaryId      Glossary ID.
     * @param  {String} concept         Concept to check.
     * @param  {Number} [timecreated]   Timecreated to check that is not the timecreated we are editing.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with true if used, resolved with false if not used or error.
     */
    self.isConceptUsed = function(glossaryId, concept, timecreated, siteId) {
        // Check offline first.
        return $mmaModGlossaryOffline.isConceptUsed(glossaryId, concept, timecreated, siteId).then(function(exists) {
            if (exists) {
                return true;
            }

            // If we get here, there's no offline entry with this name, check online.
            // Get entries from the cache.
            return self.fetchAllEntries(self.getEntriesByLetter, [glossaryId, 'ALL'], true, undefined, undefined, siteId)
                    .then(function(entries) {
                // Check if there's any entry with the same concept.
                for (var i = 0, len = entries.length; i < len; i++) {
                    if (entries[i].concept == concept) {
                        return true;
                    }
                }
                return false;
            });
        }).catch(function() {
            // Error, assume not used.
            return false;
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
     * @param {Number} glossaryId   Glossary ID.
     * @param {String} mode         The mode in which the glossary was viewed.
     * @return {Promise}            Promise resolved when the WS call is successful.
     */
    self.logView = function(glossaryId, mode) {
        var params = {
            id: glossaryId,
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
     * @param {Number} entryId  Entry ID.
     * @return {Promise}        Promise resolved when the WS call is successful.
     */
    self.logEntryView = function(entryId) {
        var params = {
            id: entryId
        };
        return $mmSite.write('mod_glossary_view_entry', params);
    };

    return self;
});
