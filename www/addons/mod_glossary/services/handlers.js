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
 * Mod glossary handlers.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc service
 * @name $mmaModGlossaryHandlers
 */
.factory('$mmaModGlossaryHandlers', function($mmCourse, $mmaModGlossary, $state, $q, $mmContentLinksHelper, $mmUtil,
            $mmCourseHelper) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModGlossary.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @param {Object} module The module info.
         * @param {Number} courseid The course ID.
         * @return {Function}
         */
        self.getController = function(module, courseid) {
            return function($scope) {
                $scope.icon = $mmCourse.getModuleIconSrc('glossary');
                $scope.title = module.name;
                $scope.class = 'mma-mod_glossary-handler';
                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_glossary', {module: module, courseid: courseid});
                };
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {},
            patterns = ['/mod/glossary/view.php', '/mod/glossary/showentry.php'];

        /**
         * Whether or not the handler is enabled to see glossary index for a certain site.
         *
         * @param  {String} siteId     Site ID.
         * @param  {Number} [courseId] Course ID related to the URL.
         * @return {Promise}           Promise resolved with true if enabled.
         */
        function isIndexEnabled(siteId, courseId) {
            return $mmaModGlossary.isPluginEnabled(siteId).then(function(enabled) {
                if (!enabled) {
                    return false;
                }
                return courseId || $mmCourse.canGetModuleWithoutCourseId(siteId);
            });
        }

        /**
         * Whether or not the handler is enabled to see glossary entry for a certain site.
         *
         * @param  {String} siteId     Site ID.
         * @param  {Number} [courseId] Course ID related to the URL.
         * @return {Promise}           Promise resolved with true if enabled.
         */
        function isEntryEnabled(siteId, courseId) {
            return $mmaModGlossary.isPluginEnabled(siteId).then(function(enabled) {
                if (!enabled) {
                    return false;
                }
                return courseId || $mmCourse.canGetModuleByInstance(siteId);
            });
        }

        function getEntry(entryId, siteId) {
            return $mmaModGlossary.getEntry(entryId, siteId).then(function(result) {
                return result.entry;
            }).catch(function(error) {
                if (error) {
                    $mmUtil.showErrorModal(error);
                } else {
                    $mmUtil.showErrorModal('mma.mod_glossary.errorloadingentry', true);
                }
                return $q.reject();
            });
        }

        /**
         * Treat a glossary entry link.
         *
         * @param {String[]} siteIds  Site IDs the URL belongs to.
         * @param {String} url        URL to treat.
         * @param {Number} [courseId] Course ID related to the URL.
         * @return {Promise}          Promise resolved with the list of actions.
         */
        function treatEntryLink(siteIds, url, courseId) {
            var params = $mmUtil.extractUrlParams(url);
            if (params.eid != 'undefined') {
                // If courseId is not set we check if it's set in the URL as a param.
                courseId = courseId || params.courseid || params.cid;

                // Pass false because all sites should have the same siteurl.
                return $mmContentLinksHelper.filterSupportedSites(siteIds, isEntryEnabled, false, courseId).then(function(ids) {
                    if (!ids.length) {
                        return [];
                    }

                    // Return actions.
                    return [{
                        message: 'mm.core.view',
                        icon: 'ion-eye',
                        sites: ids,
                        action: function(siteId) {
                            var modal = $mmUtil.showModalLoading();
                            return getEntry(parseInt(params.eid, 10), siteId).then(function(entry) {
                                var promise;
                                if (courseId) {
                                    promise = $q.when(courseId);
                                } else {
                                    promise = $mmCourseHelper.getModuleCourseIdByInstance(entry.glossaryid, 'glossary', siteId);
                                }
                                return promise.then(function(courseId) {
                                    var stateParams = {
                                        entry: entry,
                                        entryid: entry.id,
                                        cid: courseId
                                    };
                                    $mmContentLinksHelper.goInSite('site.mod_glossary-entry', stateParams, siteId);
                                });
                            }).finally(function() {
                                modal.dismiss();
                            });
                        }
                    }];
                });
            }
        }

        /**
         * Get actions to perform with the link.
         *
         * @param {String[]} siteIds  Site IDs the URL belongs to.
         * @param {String} url        URL to treat.
         * @param {Number} [courseId] Course ID related to the URL.
         * @return {Promise}          Promise resolved with the list of actions.
         *                            See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(siteIds, url, courseId) {
            // Check it's a glossary URL.
            if (url.indexOf(patterns[0]) > -1) {
                // Glossary index.
                return $mmContentLinksHelper.treatModuleIndexUrl(siteIds, url, isIndexEnabled, courseId);
            } else if (url.indexOf(patterns[1]) > -1) {
                // Glossary entry.
                return treatEntryLink(siteIds, url, courseId);
            }
            return $q.when([]);
        };

        /**
         * Check if the URL is handled by this handler. If so, returns the URL of the site.
         *
         * @param  {String} url URL to check.
         * @return {String}     Site URL. Undefined if the URL doesn't belong to this handler.
         */
        self.handles = function(url) {
            for (var i = 0; i < patterns.length; i++) {
                var position = url.indexOf(patterns[i]);
                if (position > -1) {
                    return url.substr(0, position);
                }
            }
        };

        return self;
    };

    return self;
});
