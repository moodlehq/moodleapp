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
.controller('mmaModScormPlayerCtrl', function($scope, $stateParams, $mmaModScorm, $mmUtil, $ionicPopover, $mmaModScormHelper,
            $mmEvents, $timeout, $q, mmaModScormEventUpdateToc, mmaModScormEventLaunchNextSco, mmaModScormEventLaunchPrevSco,
            $mmaModScormDataModel12) {

    var scorm = $stateParams.scorm || {},
        mode = $stateParams.mode || $mmaModScorm.MODENORMAL,
        newAttempt = $stateParams.newAttempt,
        organizationId = $stateParams.organizationId,
        currentSco,
        attempt,
        userData,
        apiInitialized = false;

    $scope.title = scorm.name; // We use SCORM name at start, later we'll use the SCO title.
    $scope.description = scorm.intro;
    $scope.scorm = scorm;
    $scope.loadingToc = true;

    // Fetch data needed to play the SCORM.
    function fetchData() {
        // Get current attempt number.
        return $mmaModScorm.getAttemptCount(scorm.id).then(function(numAttempts) {
            attempt = numAttempts;
            // Check if current attempt is incomplete.
            return $mmaModScorm.isAttemptIncomplete(scorm, attempt).then(function(incomplete) {
                // Determine mode and attempt to use.
                var result = $mmaModScorm.determineAttemptAndMode(scorm, mode, attempt, newAttempt, incomplete);
                mode = result.mode;
                newAttempt = result.newAttempt;
                attempt = result.attempt;

                $scope.isBrowse = mode === $mmaModScorm.MODEBROWSE;
                $scope.isReview = mode === $mmaModScorm.MODEREVIEW;

                // Fetch TOC and get user data.
                var promises = [];
                promises.push(fetchToc());
                promises.push($mmaModScorm.getScormUserData(scorm.id, attempt).then(function(data) {
                    userData = data;
                }));

                return $q.all(promises);
            });
        }, showError);
    }

    // Show error and reject.
    function showError(message) {
        if (message) {
            $mmUtil.showErrorModal(message);
        } else {
            $mmUtil.showErrorModal('mma.mod_scorm.errorgetscorm', true);
        }
        return $q.reject();
    }

    // Fetch TOC.
    function fetchToc() {
        $scope.loadingToc = true;
        // We need to check incomplete again: attempt number might have changed in determineAttemptAndMode,
        // or attempt status might have changed due to an action in the current SCO.
        return $mmaModScorm.isAttemptIncomplete(scorm, attempt).then(function(incomplete) {
            scorm.incomplete = incomplete;

            // Get TOC.
            return $mmaModScorm.getOrganizationToc(scorm.id, organizationId, attempt).then(function(toc) {
                $scope.toc = $mmaModScorm.formatTocToArray(toc);
                // Get images for each SCO.
                angular.forEach($scope.toc, function(sco) {
                    sco.image = $mmaModScorm.getScoStatusIcon(sco, scorm.incomplete);
                });
                // Determine current SCO if param is set.
                if ($stateParams.scoId > 0) {
                    // SCO set by parameter, get it from TOC.
                    currentSco = $mmaModScormHelper.getScoFromToc($scope.toc, $stateParams.scoId);
                }

                if (!currentSco) {
                    // No SCO defined. Get the first valid one.
                    return $mmaModScormHelper.getFirstSco(scorm.id, $scope.toc, organizationId, attempt).then(function(sco) {
                        if (sco) {
                            currentSco = sco;
                        } else {
                            // We couldn't find a SCO to load: they're all inactive or without launch URL.
                            $scope.errorMessage = 'mma.mod_scorm.errornovalidsco';
                        }
                    });
                }
            });
        }).catch(showError)
        .finally(function() {
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
        // Setup API.
        if (!apiInitialized) {
            $mmaModScormDataModel12.initAPI(scorm, sco.id, attempt, userData, mode);
            apiInitialized = true;
        } else {
            $mmaModScormDataModel12.loadSco(sco.id);
        }

        currentSco = sco;
        $scope.title = sco.title || scorm.name; // Try to use SCO title.
        calculateNextAndPreviousSco(sco.id);
        $mmaModScorm.getScoSrc(scorm, sco).then(function(src) {
            if ($scope.src && src.toString() == $scope.src.toString()) {
                // Re-loading same page. Set it to empty and then re-set the src in the next digest so it detects it has changed.
                $scope.src = '';
                $timeout(function() {
                    $scope.src = src;
                });
            } else {
                $scope.src = src;
            }
        });

        if (sco.scormtype == 'asset') {
            // Mark the asset as completed.
            var tracks = [{
                element: 'cmi.core.lesson_status',
                value: 'completed'
            }];
            $mmaModScorm.saveTracks(sco.id, attempt, tracks).then(function() {
                // Refresh TOC, some prerequisites might have changed.
                refreshToc();
            });
        }
    }

    // Refresh the TOC.
    function refreshToc() {
        $mmaModScorm.invalidateAllScormData(scorm.id).finally(function() {
            fetchToc();
        });
    }

    // Set SCORM start time.
    function setStartTime(scoId) {
        var tracks = [{
            element: 'x.start.time',
            value: $mmUtil.timestamp()
        }];
        return $mmaModScorm.saveTracks(scoId, attempt, tracks);
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
        if (currentSco) {
            // Set start time.
            return setStartTime(currentSco.id).catch(showError).finally(function() {
                // Load SCO.
                loadSco(currentSco);
            });
        }
    }).finally(function() {
        $scope.loaded = true;
    });

    $scope.loadSco = function(sco) {
        if (!sco.prereq || !sco.isvisible || !sco.launch) {
            return;
        }

        $scope.popover.hide();
        loadSco(sco);
    };

    // Listen for events to update the TOC and navigate through SCOes.
    var tocObserver = $mmEvents.on(mmaModScormEventUpdateToc, function(data) {
        if (data.scormid === scorm.id) {
            refreshToc();
        }
    });

    var launchNextObserver = $mmEvents.on(mmaModScormEventLaunchNextSco, function(data) {
        if (data.scormid === scorm.id && $scope.nextSco) {
            loadSco($scope.nextSco);
        }
    });

    var launchPrevObserver = $mmEvents.on(mmaModScormEventLaunchPrevSco, function(data) {
        if (data.scormid === scorm.id && $scope.previousSco) {
            loadSco($scope.previousSco);
        }
    });

    $scope.$on('$destroy', function() {
        tocObserver && tocObserver.off && tocObserver.off();
        launchNextObserver && launchNextObserver.off && launchNextObserver.off();
        launchPrevObserver && launchPrevObserver.off && launchPrevObserver.off();
    });
});
