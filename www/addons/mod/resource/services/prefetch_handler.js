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

angular.module('mm.addons.mod_resource')

/**
 * Mod resource prefetch handler.
 *
 * @module mm.addons.mod_resource
 * @ngdoc service
 * @name $mmaModResourcePrefetchHandler
 */
.factory('$mmaModResourcePrefetchHandler', function($mmaModResource, $mmSite, $mmFilepool, $mmPrefetchFactory, $q,
            mmaModResourceComponent) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModResourceComponent, true);

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourcePrefetchHandler#download
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
        var promise;

        if ($mmaModResource.isDisplayedInIframe(module)) {
            promise = $mmFilepool.getPackageDirPathByUrl($mmSite.getId(), module.url);
        } else {
            promise = $q.when();
        }

        return promise.then(function(dirPath) {
            return self.downloadOrPrefetch(module, courseId, prefetch, dirPath);
        });
    }

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourcePrefetchHandler#prefetch
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
