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
 * Mod glossary prefetch handler.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc service
 * @name $mmaModGlossaryPrefetchHandler
 */
.factory('$mmaModGlossaryPrefetchHandler', function($mmaModGlossary, mmaModGlossaryComponent, $mmFilepool, $q, $mmUser,
            mmCoreDownloaded, mmCoreOutdated, $mmUtil, $mmPrefetchFactory) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModGlossaryComponent, false);

    /**
     * Determine the status of a module based on the current status detected.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#determineStatus
     * @param {String} status Current status.
     * @return {String}       Status to show.
     */
    self.determineStatus = function(status) {
        if (status === mmCoreDownloaded) {
            // Glossary are always marked as outdated because we can't tell if there's something new without
            // having to call all the WebServices. This will be improved in the future.
            return mmCoreOutdated;
        } else {
            return status;
        }
    };

    /**
     * Download the module.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Glossaries cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the list of files.
     */
    self.getFiles = function(module, courseId) {
        return $mmaModGlossary.getGlossary(courseId, module.id).then(function(glossary) {
            return $mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByLetter, [glossary.id, 'ALL'])
                    .then(function(entries) {
                return getFilesFromGlossaryAndEntries(module, glossary, entries);
            });
        }).catch(function() {
            // Glossary not found, return empty list.
            return [];
        });
    };

    /**
     * Get the list of downloadable files. It includes entry embedded files.
     *
     * @param  {Object} module   Module to get the files.
     * @param  {Object} glossary Glossary
     * @param  {Array}  entries  Entries of the Glossary.
     * @return {Array}           List of Files.
     */
    function getFilesFromGlossaryAndEntries(module, glossary, entries) {
        var files = self.getIntroFilesFromInstance(module, glossary);
        // Get entries files.
        angular.forEach(entries, function(entry) {
            files = files.concat($mmUtil.extractDownloadableFilesFromHtmlAsFakeFileObjects(entry.definition));
            files = files.concat(entry.attachments);
        });
        return files;
    }

    /**
     * Get revision of a glossary.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {String}         Revision.
     */
    self.getRevision = function(module, courseId) {
        // Right now glossaries are always shown as outdated because determining their status requires too many WS calls.
        // Return a fake revision since it won't be used. This will be improved in the future.
        return "0";
    };

    /**
     * Get timemodified of a glossary.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#getTimemodified
     * @param {Object} module   Module to get the timemodified.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Number}         Timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        // Right now glossaries are always shown as outdated because determining their status requires too many WS calls.
        // Return a fake timemodified since it won't be used. This will be improved in the future.
        return 0;
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModGlossary.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModGlossary.getGlossary(courseId, module.id).then(function(glossary) {
            var promises = [];

            promises.push($mmaModGlossary.invalidateEntriesByLetter(glossary.id, 'ALL'));
            promises.push($mmaModGlossary.invalidateCourseGlossaries(courseId));

            return $q.all(promises);
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModGlossary.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return self.prefetchPackage(module, courseId, single, prefetchGlossary);
    };

    /**
     * Prefetch a glossary.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchGlossary(module, courseId, single, siteId) {
        var revision,
            timemod;

        // Prefetch the glossary data.
        return $mmaModGlossary.getGlossary(courseId, module.id).then(function(glossary) {
            var promises = [];

            angular.forEach(glossary.browsemodes, function(mode) {
                switch(mode) {
                    case 'letter': // Always done. Look bellow.
                    case 'cat': // Not implemented.
                        break;
                    case 'date':
                        promises.push($mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByDate,
                            [glossary.id, 'CREATION', 'DESC']));
                        promises.push($mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByDate,
                            [glossary.id, 'UPDATE', 'DESC']));
                        break;
                    case 'author':
                        promises.push($mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByAuthor,
                            [glossary.id, 'ALL', 'LASTNAME', 'ASC']));
                        break;
                }
            });

            // Fetch all entries to get information from.
            promises.push($mmaModGlossary.fetchAllEntries($mmaModGlossary.getEntriesByLetter, [glossary.id, 'ALL'])
                    .then(function(entries) {
                var promises = [],
                    files = getFilesFromGlossaryAndEntries(module, glossary, entries),
                    userIds = [];

                // Fetch user avatars.
                angular.forEach(entries, function(entry) {
                    // Fetch individual entries.
                    promises.push($mmaModGlossary.getEntry(entry.id));

                    userIds.push(entry.userid);
                });

                // Prefetch user profiles.
                promises.push($mmUser.prefetchProfiles(userIds, courseId, siteId));

                angular.forEach(files, function(file) {
                    promises.push($mmFilepool.addToQueueByUrl(siteId, file.fileurl, self.component, module.id, file.timemodified));
                });

                return $q.all(promises);
            }));

            // Get revision and timemodified.
            revision = self.getRevision(module, courseId);
            timemod = self.getTimemodified(module, courseId);

            return $q.all(promises);
        }).then(function() {
            // Return revision and timemodified.
            return {
                revision: revision,
                timemod: timemod
            };
        });
    }

    return self;
});
