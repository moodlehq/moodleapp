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

angular.module('mm.addons.mod_lti')

/**
 * Mod LTI handler.
 *
 * @module mm.addons.mod_lti
 * @ngdoc service
 * @name $mmaModLtiHandlers
 */
.factory('$mmaModLtiHandlers', function($mmCourse, $mmaModLti, $state, $mmSite, $mmFilepool, $mmApp, $mmUtil,
            mmaModLtiComponent, $mmContentLinksHelper, $q) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLtiHandlers#courseContent
     */
    self.courseContent = function() {
        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModLti.isPluginEnabled();
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
                $scope.title = module.name;
                $scope.icon = $mmCourse.getModuleIconSrc('lti'); // Get LTI default icon for now.
                $scope.action = function() {
                    $state.go('site.mod_lti', {module: module, courseid: courseid});
                };

                // Get LTI data.
                var promise = $mmaModLti.getLti(courseid, module.id);

                // Handle custom icons.
                promise.then(function(ltidata) {
                    var icon = ltidata.secureicon || ltidata.icon;
                    if (icon) {
                        $mmFilepool.downloadUrl($mmSite.getId(), icon, false, mmaModLtiComponent, module.id).then(function(url) {
                            $scope.icon = url;
                        }).catch(function() {
                            // Error downloading. If we're online we'll set the online url.
                            if ($mmApp.isOnline()) {
                                $scope.icon = icon;
                            }
                        });
                    }
                });

                // Button to launch the LTI.
                $scope.buttons = [{
                    icon: 'ion-link',
                    label: 'mma.mod_lti.launchactivity',
                    action: function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var modal = $mmUtil.showModalLoading('mm.core.loading', true);
                        // Get LTI and launch data.
                        promise.then(function(ltidata) {
                            return $mmaModLti.getLtiLaunchData(ltidata.id).then(function(launchdata) {
                                // "View" LTI.
                                $mmaModLti.logView(ltidata.id).then(function() {
                                    $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
                                });

                                // Launch LTI.
                                return $mmaModLti.launch(launchdata.endpoint, launchdata.parameters);
                            });
                        }).catch(function(message) {
                            if (message) {
                                $mmUtil.showErrorModal(message);
                            } else {
                                $mmUtil.showErrorModal('mma.mod_lti.errorgetlti', true);
                            }
                        }).finally(function() {
                            modal.dismiss();
                        });
                    }
                }];
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLtiHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {};

        /**
         * Whether or not the handler is enabled for a certain site.
         *
         * @param  {String} siteId     Site ID.
         * @param  {Number} [courseId] Course ID related to the URL.
         * @return {Promise}           Promise resolved with true if enabled.
         */
        function isEnabled(siteId, courseId) {
            return $mmaModLti.isPluginEnabled(siteId).then(function(enabled) {
                if (!enabled) {
                    return false;
                }
                return courseId || $mmCourse.canGetModuleWithoutCourseId(siteId);
            });
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
            // Check it's a LTI URL.
            if (typeof self.handles(url) != 'undefined') {
                return $mmContentLinksHelper.treatModuleIndexUrl(siteIds, url, isEnabled, courseId);
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
            var position = url.indexOf('/mod/lti/view.php');
            if (position > -1) {
                return url.substr(0, position);
            }
        };

        return self;
    };

    return self;
});
