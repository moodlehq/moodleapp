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
// limitations under the License

angular.module('mm.addons.mod_scorm')

/**
 * Scorm service.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc controller
 * @name $mmaModScorm
 */
.factory('$mmaModScorm',function($q, $mmSite, $mmUtil){
	var self = {};

	 /**
     * Get cache key for scorm data WS calls.
     *
     * @param {Number} courseid Course ID.
     * @return {String}         Cache key.
     */
    function getScormDataCacheKey(courseid) {
        return 'mmaModScorm:scorm:' + courseid;
    }

     /**
     * Return whether or not the plugin is enabled. Plugin is enabled if the forum WS are available.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#isPluginEnabled
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        return  $mmSite.wsAvailable('mod_scorm_get_scorms_by_courses');
    };

     /**
     * Get a scorm.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScorm#getScorm
     * @param {Number} courseid Course ID.
     * @param {Number} cmid     Course module ID.
     * @return {Promise}        Promise resolved when the scorm is retrieved.
     */
    self.getScorm = function(courseid, cmid) {
        var params = {
                courseids: [courseid]
            },
            preSets = {
                cacheKey: getScormDataCacheKey(courseid)
            };

        return $mmSite.read('mod_scorm_get_scorms_by_courses', params, preSets).then(function(scorms) {
            var currentScorm;
            angular.forEach(scorms, function(scorm) {
                if (scorm.cmid == cmid) {
                    currentScorm = scorm;
                }
            });
            return currentScorm;
        });
    };

    return self;

});