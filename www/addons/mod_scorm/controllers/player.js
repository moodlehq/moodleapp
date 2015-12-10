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

angular.module('mm.addons.mod_scorm')

/**
 * SCORM player controller.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc controller
 * @name mmaModScormPlayerCtrl
 */
.controller('mmaModScormPlayerCtrl', function($scope, $stateParams, $mmaModScorm, $mmUtil, $ionicPopover, $mmaModScormHelper) {

    var scorm = $stateParams.scorm || {},
        mode = $stateParams.mode || 'normal',
        newAttempt = $stateParams.newAttempt,
        organizationId = $stateParams.organizationId,
        currentSco,
        attempt;

    $scope.title = scorm.name; // We use SCORM name at start, later we'll use the SCO title.
    $scope.description = scorm.intro;
    $scope.scorm = scorm;

    // Fetch data needed to play the SCORM.
    function fetchData() {
        // Get current attempt number.
        return $mmaModScorm.getAttemptCount(scorm.id).then(function(numAttempts) {
            attempt = numAttempts;

            return $mmaModScorm.isScormIncomplete(scorm, attempt).then(function(incomplete) {
                scorm.incomplete = incomplete;

                // Get TOC.
                return $mmaModScorm.getOrganizationToc(scorm.id, organizationId, attempt).then(function(toc) {
                    $scope.toc = $mmaModScorm.formatTocToArray(toc);
                    // Get images for each SCO.
                    angular.forEach($scope.toc, function(sco) {
                        sco.image = $mmaModScorm.getScoStatusIcon(sco, scorm.incomplete);
                    });
                    // Get current SCO if param is set.
                    if ($stateParams.scoId > 0) {
                        currentSco = $mmaModScormHelper.getScoFromToc($scope.toc, $stateParams.scoId);
                    }
                });
            });
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('mma.mod_scorm.errorgetscorm', true);
            }
            return $q.reject();
        }).finally(function() {
            $scope.loadingToc = false;
        });
    }

    // Calculate the next and previous SCO.
    function calculateNextAndPreviousSco(scoId) {
        $scope.previousSco = $mmaModScormHelper.getPreviousScoFromToc($scope.toc, scoId);
        $scope.nextSco = $mmaModScormHelper.getNextScoFromToc($scope.toc, scoId);
    }

    // Load a SCO.
    function loadSco(sco) {
        currentSco = sco;
        $scope.title = sco.title || scorm.name; // Try to use SCO title.
        calculateNextAndPreviousSco(sco.id);
        $mmaModScorm.getScoSrc(scorm, sco).then(function(src) {
            if (src === $scope.src) {
                // Re-loading same page. Set it to empty and then re-set the src in the next digest so it detects it has changed.
                $scope.src = '';
                $timeout(function() {
                    $scope.src = src;
                });
            } else {
                $scope.src = src;
            }
        });
    }

    $scope.showToc = $mmaModScorm.displayTocInPlayer(scorm);
    if ($scope.showToc) {
        // Setup TOC popover.
        $ionicPopover.fromTemplateUrl('addons/mod_scorm/templates/toc.html', {
            scope: $scope,
        }).then(function(popover) {
            $scope.popover = popover;
        });
    }

    // Fetch the SCORM data.
    fetchData().then(function() {
        if (!currentSco) {
            currentSco = $scope.toc[0];
        }
        loadSco(currentSco);
    }).finally(function() {
        $scope.loaded = true;
    });

    $scope.loadSco = function(sco) {
        if (!sco.prereq || !sco.isvisible) {
            return;
        }

        $scope.popover.hide();
        loadSco(sco);
    };
});
