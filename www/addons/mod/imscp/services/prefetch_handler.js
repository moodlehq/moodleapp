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

angular.module('mm.addons.mod_imscp')

/**
 * Mod imscp prefetch handler.
 *
 * @module mm.addons.mod_imscp
 * @ngdoc service
 * @name $mmaModImscpPrefetchHandler
 */
.factory('$mmaModImscpPrefetchHandler', function($mmaModImscp, $mmSite, $mmFilepool, $mmPrefetchFactory, mmaModImscpComponent,
            $mmCourse, $q) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModImscpComponent, true);

    /**
     * Download the module.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId, single) {
        return downloadOrPrefetch(module, courseId, true);
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
        return $mmFilepool.getPackageDirPathByUrl($mmSite.getId(), module.url).then(function(dirPath) {
            return self.downloadOrPrefetch(module, courseId, prefetch, dirPath);
        });
    }

    /**
     * Returns imscp intro files.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpPrefetchHandler#getIntroFiles
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID.
     * @return {Promise}         Promise resolved with list of intro files.
     */
    self.getIntroFiles = function(module, courseId) {
        return $mmaModImscp.getImscp(courseId, module.id).catch(function() {
            // Not found, return undefined so module description is used.
        }).then(function(imscp) {
            return self.getIntroFilesFromInstance(module, imscp);
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModImscp.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        var promises = [];

        promises.push($mmaModImscp.invalidateImscpData(courseId));
        promises.push($mmCourse.invalidateModule(module.id));

        return $q.all(promises);
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        if (!$mmSite.canDownloadFiles()) {
            return false;
        }

        return $mmaModImscp.isPluginEnabled();
    };

    /**
     * Check if a file is downloadable. The file param must have 'type' and 'filename' attributes
     * like in core_course_get_contents response.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscp#isFileDownloadable
     * @param {Object} file File to check.
     * @return {Boolean}    True if downloadable, false otherwise.
     */
    self.isFileDownloadable = function(file) {
        return $mmaModImscp.isFileDownloadable(file);
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return downloadOrPrefetch(module, courseId, true);
    };

    return self;
});
