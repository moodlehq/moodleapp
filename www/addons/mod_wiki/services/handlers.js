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
 * Mod wiki handlers.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc service
 * @name $mmaModWikiHandlers
 */
.factory('$mmaModWikiHandlers', function($mmCourse, $mmaModWiki, $state, $mmContentLinksHelper, $mmCourseHelper, $mmUtil, $q) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModWiki.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @param {Object} module The module info.
         * @param {Number} courseId The course ID.
         * @return {Function}
         */
        self.getController = function(module, courseId) {
            return function($scope) {
                $scope.title = module.name;
                $scope.icon = $mmCourse.getModuleIconSrc('wiki');
                $scope.action = function(e) {
                    $state.go('site.mod_wiki', {module: module, moduleid: module.id, courseid: courseId});
                };
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {},
            patterns = ['/mod/wiki/view.php', '/mod/wiki/map.php'];

        /**
         * Whether or not the handler is enabled for a certain site.
         *
         * @param  {String} siteId     Site ID.
         * @param  {Number} [courseId] Course ID related to the URL.
         * @return {Promise}           Promise resolved with true if enabled.
         */
        function isEnabled(siteId, courseId) {
            return $mmaModWiki.isPluginEnabled(siteId).then(function(enabled) {
                if (!enabled) {
                    return false;
                }
                return courseId || $mmCourse.canGetModuleWithoutCourseId(siteId);
            });
        }

        /**
         * Retrieves page contents
         * @param  {Number} pageId Page ID to be retrieved
         * @param  {String} siteId Site ID page belongs to.
         * @return {Promise}        Promise resolved with the page retrieved.
         */
        function getPageContents(pageId, siteId) {
            return $mmaModWiki.getPageContents(pageId, siteId).then(function(page) {
                return page;
            }).catch(function(error) {
                if (error) {
                    $mmUtil.showErrorModal(error);
                } else {
                    $mmUtil.showErrorModal('mma.mod_wiki.errorloadingpage', true);
                }
                return $q.reject();
            });
        }

        /**
         * Treat a Wiki page with action link.
         *
         * @param {String[]} siteIds  Site IDs the URL belongs to.
         * @param {String} url        URL to treat.
         * @param {String} action     The action (tab) to go.
         * @param {Number} [courseId] Course ID related to the URL.
         * @return {Promise}          Promise resolved with the list of actions.
         */
        function treatActionLink(siteIds, url, action, courseId) {
            var params = $mmUtil.extractUrlParams(url);
            // Pass false because all sites should have the same siteurl.
            return $mmContentLinksHelper.filterSupportedSites(siteIds, isEnabled, false, courseId).then(function(ids) {
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
                        return getPageContents(parseInt(params.pageid, 10), siteId).then(function(page) {
                            var promise;
                            if (courseId) {
                                promise = $q.when(courseId);
                            } else {
                                promise = $mmCourseHelper.getModuleCourseIdByInstance(page.wikiid, 'wiki', siteId);
                            }
                            return promise.then(function(courseId) {
                                var stateParams = {
                                    module: null,
                                    moduleid: null,
                                    courseid: courseId,
                                    pageid: page.id,
                                    pagetitle: page.title,
                                    wikiid: page.wikiid,
                                    subwikiid: page.subwikiid,
                                    action: action
                                };
                                return $mmContentLinksHelper.goInSite('site.mod_wiki', stateParams, siteIds);
                            });
                        }).finally(function() {
                            modal.dismiss();
                        });
                    }
                }];
            });
        }

        /**
         * Treat a Wiki page or index link.
         *
         * @param {String[]} siteIds  Site IDs the URL belongs to.
         * @param {String} url        URL to treat.
         * @param {Number} [courseId] Course ID related to the URL.
         * @return {Promise}          Promise resolved with the list of actions.
         */
        function treatPageLink(siteIds, url, courseId) {
            // Wiki page or index.
            var params = $mmUtil.extractUrlParams(url);
            if (typeof params.pageid != 'undefined') {
                return treatActionLink(siteIds, url, 'page', courseId);
            } else {
                return $mmContentLinksHelper.treatModuleIndexUrl(siteIds, url, isEnabled, courseId);
            }
        }

        /**
         * Treat a Wiki map link.
         *
         * @param {String[]} siteIds  Site IDs the URL belongs to.
         * @param {String} url        URL to treat.
         * @param {Number} [courseId] Course ID related to the URL.
         * @return {Promise}          Promise resolved with the list of actions.
         */
        function treatMapLink(siteIds, url, courseId) {
            // Map links.
            var params = $mmUtil.extractUrlParams(url);
            if (typeof params.pageid != 'undefined' && (typeof params.option == 'undefined' || params.option == 5)) {
                return treatActionLink(siteIds, url, 'map', courseId);
            } else {
                return $q.when([]);
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
            if (url.indexOf(patterns[0]) > -1) {
                // Check it's a wiki URL.
                return treatPageLink(siteIds, url, courseId);
            } else if (url.indexOf(patterns[1]) > -1) {
                // Map URL.
                return treatMapLink(siteIds, url, courseId);
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
