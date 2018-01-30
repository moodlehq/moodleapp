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
 * LTI index controller.
 *
 * @module mm.addons.mod_lti
 * @ngdoc controller
 * @name mmaModLtiIndexCtrl
 */
.controller('mmaModLtiIndexCtrl', function($scope, $stateParams, $mmaModLti, $mmUtil, $q, $mmCourse, $mmText, $translate,
            mmaModLtiComponent) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        lti;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.courseid = courseid;
    $scope.refreshIcon = 'ion-refresh';
    $scope.component = mmaModLtiComponent;
    $scope.componentId = module.id;

    // Convenience function to get LTI data.
    function fetchLTI(refresh) {
        return $mmaModLti.getLti(courseid, module.id).then(function(ltidata) {
            lti = ltidata;

            return $mmaModLti.getLtiLaunchData(lti.id).then(function(launchdata) {
                lti.launchdata = launchdata;
                $scope.title = lti.name || $scope.title;
                $scope.description = lti.intro || $scope.description;
                if (!$mmUtil.isValidURL(launchdata.endpoint)) {
                    return $q.reject($translate.instant('mma.mod_lti.errorinvalidlaunchurl'));
                }
            });
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData();
            }

            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('mma.mod_lti.errorgetlti', true);
            }
            return $q.reject();
        });
    }

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var p1 = $mmaModLti.invalidateLti(courseid),
            p2 = lti ? $mmaModLti.invalidateLtiLaunchData(lti.id) : $q.when();

        return $q.all([p1, p2]).finally(function() {
            return fetchLTI(true);
        });
    }

    // Pull to refresh.
    $scope.doRefresh = function() {
        $scope.refreshIcon = 'spinner';
        return refreshAllData().finally(function() {
            $scope.refreshIcon = 'ion-refresh';
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Launch the LTI.
    $scope.launch = function() {
        // Launch LTI.
        fetchLTI().then(function() {
            $mmaModLti.launch(lti.launchdata.endpoint, lti.launchdata.parameters).catch(function(message) {
                if (message) {
                    $mmUtil.showErrorModal(message);
                }
            });
        }).finally(function() {
            // "View" LTI.
            $mmaModLti.logView(lti.id).then(function() {
                $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
            });
        });
    };

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModLtiComponent, module.id);
    };
});
