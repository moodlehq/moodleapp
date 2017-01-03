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

angular.module('mm.addons.mod_wiki')

/**
 * Mod wiki prefetch handler.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc service
 * @name $mmaModWikiPrefetchHandler
 */
.factory('$mmaModWikiPrefetchHandler', function($mmaModWiki, mmaModWikiComponent, $mmSite, $mmFilepool, $q, $mmGroups, $mmUtil,
        $mmCourseHelper, $mmCourse, $mmPrefetchFactory) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModWikiComponent);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^.*files$|^pages$/;

    /**
     * Download the module.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Wikis cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
    };

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiPrefetchHandler#getDownloadSize
     * @param  {Object} module    Module to get the size.
     * @param  {Number} courseId  Course ID the module belongs to.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          With the file size and a boolean to indicate if it is the total size or only partial.
     */
    self.getDownloadSize = function(module, courseId, siteId) {
        var promises = [];
        siteId = siteId || $mmSite.getId();

        promises.push(self.getFiles(module, courseId, siteId).then(function(files) {
            return $mmUtil.sumFileSizes(files);
        }));

        promises.push(getAllPages(module, courseId, siteId).then(function(pages) {
            var size = 0;
            angular.forEach(pages, function(page) {
                if (page.contentsize) {
                    size = size + page.contentsize;
                }
            });
            return {size: size, total: true};
        }));

        return $q.all(promises).then(function(sizes) {
            // Sum values in the array.
            return sizes.reduce(function(a, b) {
                return {size: a.size + b.size, total: a.total && b.total};
            }, {size: 0, total: true});
        });
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiPrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         List of files.
     */
    self.getFiles = function(module, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmaModWiki.getWiki(courseId, module.id, 'coursemodule', siteId).then(function(wiki) {
            var introFiles = self.getIntroFilesFromInstance(module, wiki);
            return $mmaModWiki.getWikiFileList(wiki, siteId).then(function(files) {
                return introFiles.concat(files);
            });
        }).catch(function() {
            // Wiki not found, return empty list.
            return [];
        });
    };

    /**
     * Returns a list of pages that can be downloaded.
     *
     * @param {Object} module The module object returned by WS.
     * @param {Number} courseId The course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}     List of pages.
     */
    function getAllPages(module, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmaModWiki.getWiki(courseId, module.id, 'coursemodule', siteId).then(function(wiki) {
            return $mmaModWiki.getWikiPageList(wiki, siteId);
        }).catch(function() {
            // Wiki not found, return empty list.
            return [];
        });
    }

    /**
     * Get timemodified of a Wiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiPrefetchHandler#getTimemodified
     * @param {Object} module   Module to get the timemodified.
     * @param {Number} courseId Course ID the module belongs to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Timemodified.
     */
    self.getTimemodified = function(module, courseId, siteId) {
        var promises = [];
        siteId = siteId || $mmSite.getId();

        promises.push(self.getFiles(module, courseId, siteId).then(function(files) {
            return $mmFilepool.getTimemodifiedFromFileList(files);
        }));

        promises.push(getAllPages(module, courseId, siteId).then(function(pages) {
            return getTimemodifiedFromPages(pages);
        }));

        return $q.all(promises).then(function(lastmodifiedTimes) {
            // Get the maximum value in the array.
            return Math.max.apply(null, lastmodifiedTimes);
        });
    };

    /**
     * Get timemodified from a pages list.
     *
     * @param {Object[]} pages   Pages to get the latest timemodified.
     * @return {Number}         Timemodified.
     */
    function getTimemodifiedFromPages(pages) {
        var lastmodified = 0;
        angular.forEach(pages, function(page) {
            if (page.timemodified > lastmodified) {
                lastmodified = page.timemodified;
            }
        });
        return lastmodified;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModWiki.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModWiki.getWiki(courseId, module.id, 'coursemodule').then(function(wiki) {
            var promises = [];

            promises.push($mmaModWiki.invalidateWikiData(courseId));
            promises.push($mmaModWiki.invalidateSubwikis(wiki.id));
            promises.push($mmaModWiki.invalidateSubwikiFiles(wiki.id));
            promises.push($mmaModWiki.invalidateSubwikiPages(wiki.id));

            return $q.all(promises);
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        if ($mmaModWiki.isPluginEnabled()) {
            return  $mmSite.wsAvailable('mod_wiki_get_subwiki_files');
        }
        return false;
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return self.prefetchPackage(module, courseId, single, prefetchWiki);
    };

    /**
     * Prefetch a wiki.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchWiki(module, courseId, single, siteId) {
        var userId = $mmSite.getUserId(),
            revision,
            timemod;

        return $mmFilepool.getPackageTimemodified(siteId, self.component, module.id).then(function(packageModified) {
            // Get Page list to be retrieved. getWiki and getSubwikis done in getAllPages.
            return getAllPages(module, courseId, siteId).then(function(pages) {
                var promises = [];

                angular.forEach(pages, function(page) {
                    // Check if page has to be fetched, and invalidate it first.
                    if (page.timemodified > packageModified) {
                        promises.push($mmaModWiki.invalidatePage(page.id, siteId).finally(function() {
                            return $mmaModWiki.getPageContents(page.id, siteId);
                        }));
                    }
                });

                // Fetch group data.
                promises.push($mmGroups.getActivityGroupMode(module.id, siteId).then(function(groupmode) {
                    if (groupmode === $mmGroups.SEPARATEGROUPS || groupmode === $mmGroups.VISIBLEGROUPS) {
                        // Get the groups available for the user.
                        return $mmGroups.getActivityAllowedGroups(module.id, userId, siteId);
                    }
                    return $q.when();
                }));

                // Fetch info to provide wiki links.
                promises.push($mmaModWiki.getWiki(courseId, module.id, 'coursemodule', siteId).then(function(wiki) {
                    return $mmCourseHelper.getModuleCourseIdByInstance(wiki.id, 'wiki', siteId);
                }));
                promises.push($mmCourse.getModuleBasicInfo(module.id, siteId));

                // Get related page files and fetch them.
                promises.push(self.getFiles(module, courseId, siteId).then(function (files) {
                    var filePromises = [];

                    revision = $mmFilepool.getRevisionFromFileList(files);

                    angular.forEach(files, function(file) {
                        var url = file.fileurl;
                        filePromises.push($mmFilepool.addToQueueByUrl(siteId, url, self.component, module.id, file.timemodified));
                    });

                    return $q.all(filePromises);
                }));

                // Get timemodified.
                promises.push(self.getTimemodified(module, courseId, siteId).then(function(timemodified) {
                    timemod = timemodified;
                }));

                return $q.all(promises);
            });
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
