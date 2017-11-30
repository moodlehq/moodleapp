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

angular.module('mm.addons.mod_book')

/**
 * Mod book prefetch handler.
 *
 * @module mm.addons.mod_book
 * @ngdoc service
 * @name $mmaModBookPrefetchHandler
 */
.factory('$mmaModBookPrefetchHandler', function($mmaModBook, $mmSite, $mmPrefetchFactory, $q, mmCoreDownloaded, mmCoreOutdated,
            mmaModBookComponent, $mmCourse) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModBookComponent, true);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$|^entries$/;

    /**
     * Determine the status of a module based on the current status detected.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookPrefetchHandler#determineStatus
     * @param {String} status     Current status.
     * @param  {Boolean} canCheck True if updates can be checked using core_course_check_updates.
     * @return {String}           Status to show.
     */
    self.determineStatus = function(status, canCheck) {
        if (!canCheck && status === mmCoreDownloaded) {
            // Books are always treated as outdated since revision and timemodified aren't reliable.
            return mmCoreOutdated;
        } else {
            return status;
        }
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId, single) {
        return downloadOrPrefetch(module, courseId, false);
    };

    /**
     * Download or prefetch the module.
     *
     * @param  {Object} module    The module object returned by WS.
     * @param  {Number} courseId  Course ID the module belongs to.
     * @param  {Boolean} prefetch True to prefetch, false to download right away.
     * @return {Promise}          Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    function downloadOrPrefetch(module, courseId, prefetch) {
        var promises = [];

        promises.push(self.downloadOrPrefetch(module, courseId, prefetch));
        promises.push($mmaModBook.getBook(courseId, module.id));

        return $q.all(promises);
    }

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return downloadOrPrefetch(module, courseId, true);
    };

    /**
     * Returns book intro files.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookPrefetchHandler#getIntroFiles
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID.
     * @return {Promise}         Promise resolved with list of intro files.
     */
    self.getIntroFiles = function(module, courseId) {
        return $mmaModBook.getBook(courseId, module.id).catch(function() {
            // Not found, return undefined so module description is used.
        }).then(function(book) {
            return self.getIntroFilesFromInstance(module, book);
        });
    };

    /**
     * Returns module revision and timemodified. Right now we'll always show it outdated, so we return fake values.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookPrefetchHandler#getRevisionAndTimemodified
     * @param  {Object} module         The module object returned by WS.
     * @param  {Number} courseId       Course ID.
     * @param  {Object[]} [introFiles] List of intro files. If undefined, they will be calculated.
     * @return {Promise}               Promise resolved with revision and timemodified.
     */
    self.getRevisionAndTimemodified = function(module, courseId, introFiles) {
        return $q.when({
            timemod: 0,
            revision: "0"
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModBook.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        var promises = [];

        promises.push($mmaModBook.invalidateBookData(courseId));
        promises.push($mmCourse.invalidateModule(module.id));

        return $q.all(promises);
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        if (!$mmSite.canDownloadFiles()) {
            return false;
        }

        return $mmaModBook.isPluginEnabled();
    };

    return self;
});
