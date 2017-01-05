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

angular.module('mm.addons.competency')

/**
 * Controller to handle a competency summary.
 *
 * @module mm.addons.competency
 * @ngdoc controller
 * @name mmaCompetencySummaryCtrl
 */
.controller('mmaCompetencySummaryCtrl', function($scope, $stateParams, $mmaCompetency, $mmUtil, $q) {

    var competencyId = parseInt($stateParams.competencyid);

    // Convenience function that fetches the event and updates the scope.
    function fetchCompetency() {
        return $mmaCompetency.getCompetencySummary(competencyId).then(function(competency) {
            $scope.competency = competency;
        }, function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting competency summary data.');
            }
            return $q.reject();
        });
    }

    // Convenience function to refresh all the data.
    function refreshAllData() {
        return $mmaCompetency.invalidateCompetencySummary(competencyId).finally(function() {
            return fetchCompetency();
        });
    }

    fetchCompetency().then(function() {
        $mmaCompetency.logCompetencyView(competencyId);
    }).finally(function() {
        $scope.competencyLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshCompetency = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
