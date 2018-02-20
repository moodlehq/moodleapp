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

angular.module('mm.addons.mod_page')

/**
 * Mod page prefetch handler.
 *
 * @module mm.addons.mod_page
 * @ngdoc service
 * @name $mmaModPagePrefetchHandler
 */
.factory('$mmaModPagePrefetchHandler', function($mmPrefetchFactory, mmaModPageComponent, $mmaModPage, $mmCourse, $q) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModPageComponent, true);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$/;

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPagePrefetchHandler#download
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

        if ($mmaModPage.isGetPageWSAvailable()) {
            promises.push($mmaModPage.getPageData(courseId, module.id));
        }

        return $q.all(promises);
    }

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPagePrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return downloadOrPrefetch(module, courseId, true);
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPagePrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModPage.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPagePrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        var promises = [];

        promises.push($mmaModPage.invalidatePageData(courseId));
        promises.push($mmCourse.invalidateModule(module.id));

        return $q.all(promises);
    };


    return self;
});
