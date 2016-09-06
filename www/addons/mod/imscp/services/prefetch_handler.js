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
.factory('$mmaModImscpPrefetchHandler', function($mmaModImscp, $mmSite, $mmFilepool, mmaModImscpComponent) {

    var self = {};

    self.component = mmaModImscpComponent;

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpPrefetchHandler#getDownloadSize
     * @param  {Object} module Module to get the size.
     * @return {Object}        With the file size and a boolean to indicate if it is the total size or only partial.
     */
    self.getDownloadSize = function(module) {
        var size = 0;
        angular.forEach(module.contents, function(content) {
            if ($mmaModImscp.isFileDownloadable(content) && content.filesize) {
                size = size + content.filesize;
            }
        });
        return {size: size, total: true};
    };

    /**
     * Get the downloaded size of a module.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpPrefetchHandler#getDownloadedSize
     * @param {Object} module   Module to get the downloaded size.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the size.
     */
    self.getDownloadedSize = function(module, courseId) {
        return $mmFilepool.getFilesSizeByComponent($mmSite.getId(), self.component, module.id);
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
        return $mmaModImscp.isPluginEnabled();
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
        return $mmaModImscp.prefetchContent(module);
    };

    /**
     * Remove module downloaded files.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpPrefetchHandler#removeFiles
     * @param {Object} module   Module to remove the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved when done.
     */
    self.removeFiles = function(module, courseId) {
        return $mmFilepool.removeFilesByComponent($mmSite.getId(), self.component, module.id);
    };

    return self;
});
