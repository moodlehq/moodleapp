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
            $mmaModScormDataModel12, mmaModScormEventGoOffline, $mmaModScormSync, $mmSyncBlock, mmaModScormComponent) {

    var scorm = $stateParams.scorm || {},
        mode = $stateParams.mode || $mmaModScorm.MODENORMAL,
        newAttempt = $stateParams.newAttempt,
        organizationId = $stateParams.organizationId,
        currentSco,
        attempt,
        userData,
        apiInitialized = false,
        offline = false;

    // Block the SCORM so it cannot be synced.
    $mmSyncBlock.blockOperation(mmaModScormComponent, scorm.id, 'playerCtrl');

    $scope.title = scorm.name; // We use SCORM name at start, later we'll use the SCO title.
    $scope.scorm = scorm;
    $scope.loadingToc = true;

    if (scorm.popup) {
        // If we receive a value <= 100 we need to assume it's a percentage.
        if (scorm.width <= 100) {
            scorm.width = scorm.width + '%';
        }
        if (scorm.height <= 100) {
            scorm.height = scorm.height + '%';
        }
    }

    // Fetch data needed to play the SCORM.
    function fetchData() {
        // Wait for any ongoing sync to finish. We won't sync a SCORM while it's being played.
        return $mmaModScormSync.waitForSync(scorm.id).then(function() {
            // Get attempts data.
            return $mmaModScorm.getAttemptCount(scorm.id).then(function(attemptsData) {
                return determineAttemptAndMode(attemptsData).then(function() {
                    // Fetch TOC and get user data.
                    var promises = [];
                    promises.push(fetchToc());
                    promises.push($mmaModScorm.getScormUserData(scorm.id, attempt, offline).then(function(data) {
                        userData = data;
                    }));

                    return $q.all(promises);
                });
            }).catch(showError);
        });
    }

    // Determine the attempt to use, the mode (normal/preview) and if it's offline or online.
    function determineAttemptAndMode(attemptsData) {
        return $mmaModScormHelper.determineAttemptToContinue(scorm, attemptsData).then(function(data) {
            attempt = data.number;
            offline = data.offline;
            if (attempt != attemptsData.lastAttempt.number) {
                $scope.attemptToContinue = attempt;
            }

            // Check if current attempt is incomplete.
            var promise;
            if (attempt > 0) {
                promise = $mmaModScorm.isAttemptIncomplete(scorm.id, attempt, offline);
            } else {
                // User doesn't have attempts. Last attempt is not incomplete (since he doesn't have any).
                promise = $q.when(false);
            }

            return promise.then(function(incomplete) {
                // Determine mode and attempt to use.
                var result = $mmaModScorm.determineAttemptAndMode(scorm, mode, attempt, newAttempt, incomplete);

                if (result.attempt > attempt) {
                    // We're creating a new attempt.
                    if (offline) {
                        // Last attempt was offline, so we'll create a new offline attempt.
                        promise = $mmaModScormHelper.createOfflineAttempt(scorm, result.attempt, attemptsData.online.length);
                    } else {
                        // Last attempt was online, verify that we can create a new online attempt. We ignore cache.
                        promise = $mmaModScorm.getScormUserData(scorm.id, result.attempt, false, undefined, undefined, true)
                                    .catch(function() {
                            // Cannot communicate with the server, create an offline attempt.
                            offline = true;
                            return $mmaModScormHelper.createOfflineAttempt(scorm, result.attempt, attemptsData.online.length);
                        });
                    }
                } else {
                    promise = $q.when();
                }

                return promise.then(function() {
                    mode = result.mode;
                    newAttempt = result.newAttempt;
                    attempt = result.attempt;
                    $scope.isBrowse = mode === $mmaModScorm.MODEBROWSE;
                    $scope.isReview = mode === $mmaModScorm.MODEREVIEW;
                });
            });
        });
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
        return $mmaModScorm.isAttemptIncomplete(scorm.id, attempt, offline).then(function(incomplete) {
            scorm.incomplete = incomplete;

            // Get TOC.
            return $mmaModScorm.getOrganizationToc(scorm.id, organizationId, attempt, offline).then(function(toc) {
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
                    return $mmaModScormHelper.getFirstSco(scorm.id, $scope.toc, organizationId, attempt, offline)
                            .then(function(sco) {
                        if (sco) {
                            currentSco = sco;
                        } else {
                            // We couldn't find a SCO to load: they're all inactive or without launch URL.
                            $scope.errorMessage = 'mma.mod_scorm.errornovalidsco';
                        }
                    });
                }
            });
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
        // Setup API.
        if (!apiInitialized) {
            $mmaModScormDataModel12.initAPI(scorm, sco.id, attempt, userData, mode, offline);
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
            $mmaModScorm.saveTracks(sco.id, attempt, tracks, offline, scorm).catch(function() {
                // Error saving data. We'll go offline if we're online and the asset is not marked as completed already.
                if (!offline) {
                    return $mmaModScorm.getScormUserData(scorm.id, attempt, offline).then(function(data) {
                        if (!data[sco.id] || data[sco.id].userdata['cmi.core.lesson_status'] != 'completed') {
                            // Go offline.
                            return $mmaModScormHelper.convertAttemptToOffline(scorm, attempt).then(function() {
                                offline = true;
                                $mmaModScormDataModel12.setOffline(true);
                                return $mmaModScorm.saveTracks(sco.id, attempt, tracks, offline, scorm);
                            }).catch(showError);
                        }
                    });
                }
            }).then(function() {
                // Refresh TOC, some prerequisites might have changed.
                refreshToc();
            });
        }

        // Trigger SCO launch event.
        $mmaModScorm.logLaunchSco(scorm.id, sco.id);
    }

    // Refresh the TOC.
    function refreshToc() {
        $mmaModScorm.invalidateAllScormData(scorm.id).finally(function() {
            fetchToc().catch(showError);
        });
    }

    // Set SCORM start time.
    function setStartTime(scoId) {
        var tracks = [{
            element: 'x.start.time',
            value: $mmUtil.timestamp()
        }];
        return $mmaModScorm.saveTracks(scoId, attempt, tracks, offline, scorm).then(function() {
            if (!offline) {
                // New online attempt created, update cached data about online attempts.
                $mmaModScorm.getAttemptCount(scorm.id, undefined, undefined, false, true);
            }
        });
    }

    $scope.showToc = $mmaModScorm.displayTocInPlayer(scorm);
    if ($scope.showToc) {
        // Setup TOC popover.
        $ionicPopover.fromTemplateUrl('addons/mod/scorm/templates/toc.html', {
            scope: $scope,
        }).then(function(popover) {
            $scope.popover = popover;
        });
    }

    // Fetch the SCORM data.
    fetchData().then(function() {
        if (currentSco) {
            // Set start time if it's a new attempt.
            var promise = newAttempt ? setStartTime(currentSco.id) : $q.when();
            return promise.catch(showError).finally(function() {
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

    // Listen for events to update the TOC and navigate through SCOs.
    var tocObserver = $mmEvents.on(mmaModScormEventUpdateToc, function(data) {
        if (data.scormid === scorm.id) {
            if (offline) {
                // Wait a bit to make sure data is stored.
                $timeout(refreshToc, 100);
            } else {
                refreshToc();
            }
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

    var goOfflineObserver = $mmEvents.on(mmaModScormEventGoOffline, function(data) {
        if (data.scormid === scorm.id && !offline) {
            offline = true;
            $timeout(function() {
                // Wait a bit to prevent collisions between this store and SCORM API's store.
                $mmaModScormHelper.convertAttemptToOffline(scorm, attempt).catch(showError).finally(function() {
                    refreshToc();
                });
            }, 200);
        }
    });

    // Empty src when leaving the state so unload event is triggered in the iframe.
    $scope.$on('$ionicView.beforeLeave', function() {
        $scope.src = '';
    });

    $scope.$on('$destroy', function() {
        tocObserver && tocObserver.off && tocObserver.off();
        launchNextObserver && launchNextObserver.off && launchNextObserver.off();
        launchPrevObserver && launchPrevObserver.off && launchPrevObserver.off();
        goOfflineObserver && goOfflineObserver.off && goOfflineObserver.off();

        // Unblock the SCORM so it can be synced.
        $mmSyncBlock.unblockOperation(mmaModScormComponent, scorm.id, 'playerCtrl');
    });
});
