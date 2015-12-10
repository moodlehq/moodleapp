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
 * SCORM index controller.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc controller
 * @name mmaModScormIndexCtrl
 */
.controller('mmaModScormIndexCtrl', function($scope, $stateParams, $mmaModScorm, $mmUtil, $q, $mmCourse, $ionicScrollDelegate,
            $mmCoursePrefetchDelegate, $mmaModScormHelper, $mmEvents, $mmSite, $state, mmCoreOutdated, mmCoreNotDownloaded,
            mmCoreDownloading, mmaModScormComponent, mmCoreEventPackageStatusChanged) {

    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        scorm,
        statusObserver,
        currentStatus;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.currentOrganization = {};
    $scope.scormOptions = {
        mode: 'normal'
    };

    // Function to filter attempts.
    $scope.filterAttempts = function(attempt) {
        return attempt && typeof attempt.grade != 'undefined';
    };

    // Convenience function to get SCORM data.
    function fetchScormData(refresh) {
        return $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scormData) {
            scorm = scormData;

            $scope.title = scorm.name || $scope.title;
            $scope.description = scorm.intro || $scope.description;
            $scope.scorm = scorm;

            var result = $mmaModScorm.isScormSupported(scorm);
            if (result === true) {
                $scope.errorMessage = '';
            } else {
                $scope.errorMessage = result;
            }

            if (scorm.warningmessage) {
                return; // SCORM is closed or not open yet, we can't get more data.
            }

            // Get the number of attempts and check if SCORM is incomplete.
            return $mmaModScorm.getAttemptCount(scorm.id).then(function(numAttempts) {
                return $mmaModScorm.isScormIncomplete(scorm, numAttempts).then(function(incomplete) {
                    var promises = [];

                    scorm.incomplete = incomplete;
                    scorm.numAttempts = numAttempts;
                    scorm.grademethodReadable = $mmaModScorm.getScormGradeMethod(scorm);
                    scorm.attemptsLeft = $mmaModScorm.countAttemptsLeft(scorm, numAttempts);
                    if (scorm.forceattempt && scorm.incomplete) {
                        $scope.scormOptions.newAttempt = true;
                    }

                    if (scorm.displayattemptstatus) {
                        promises.push(getReportedGrades());
                    }

                    promises.push(fetchStructure());

                    if (!scorm.packagesize && $scope.errorMessage === '') {
                        // SCORM is supported but we don't have package size. Try to calculate it.
                        promises.push($mmaModScorm.calculateScormSize(scorm).then(function(size) {
                            scorm.packagesize = size;
                        }));
                    }

                    // Handle status. We don't add getStatus to promises because it should be fast.
                    setStatusListener();
                    getStatus().then(showStatus);

                    return $q.all(promises);

                });
            }).catch(function(message) {
                return showError(message);
            });

        }, function(message) {
            if (!refresh) {
                // Get scorm failed, retry without using cache since it might be a new activity.
                return refreshData();
            }
            return showError(message);
        });
    }

    // Show error message and return a rejected promise.
    function showError(message) {
        if (message) {
            $mmUtil.showErrorModal(message);
        } else {
            $mmUtil.showErrorModal('mma.mod_scorm.errorgetscorm', true);
        }
        return $q.reject();
    }

    // Get the grades of each attempt and the grade of the SCORM.
    function getReportedGrades() {
        // Get the number of finished attempts.
        return $mmaModScorm.getAttemptCount(scorm.id, undefined, true).then(function(numAttempts) {
            var promises = [];
            scorm.attempts = [];
            // Calculate the grade for each attempt.
            for (var attempt = 1; attempt <= numAttempts; attempt++) {
                promises.push(getAttemptGrade(scorm, attempt));
            }

            return $q.all(promises).then(function() {

                // Calculate the grade of the whole SCORM.
                scorm.grade = $mmaModScorm.calculateScormGrade(scorm, scorm.attempts);

                // Now format the grades.
                angular.forEach(scorm.attempts, function(attempt) {
                    attempt.grade = $mmaModScorm.formatGrade(scorm, attempt.grade);
                });
                scorm.grade = $mmaModScorm.formatGrade(scorm, scorm.grade);
            });
        });
    }

    // Convenience function to get the grade of an attempt and add it to the scorm attempts list.
    function getAttemptGrade(scorm, attempt) {
        return $mmaModScorm.getAttemptGrade(scorm, attempt).then(function(grade) {
            scorm.attempts[attempt - 1] = {
                number: attempt,
                grade: grade
            };
        });
    }

    // Fetch the structure of the SCORM (TOC).
    function fetchStructure() {
        return $mmaModScorm.getOrganizations(scorm.id).then(function(organizations) {
            $scope.organizations = organizations;

            if (!$scope.currentOrganization.identifier) {
                // Load first organization.
                $scope.currentOrganization.identifier = organizations[0].identifier;
            }

            return loadOrganizationToc($scope.currentOrganization.identifier);
        });
    }

    // Load the TOC of a certain organization.
    function loadOrganizationToc(organizationId) {
        if (!scorm.displaycoursestructure) {
            // TOC is not displayed, no need to load it.
            return $q.when();
        }

        $scope.loadingToc = true;
        return $mmaModScorm.getOrganizationToc(scorm.id, organizationId, scorm.numAttempts).then(function(toc) {
            $scope.toc = $mmaModScorm.formatTocToArray(toc);
            // Get images for each SCO.
            angular.forEach($scope.toc, function(sco) {
                sco.image = $mmaModScorm.getScoStatusIcon(sco, scorm.incomplete);
            });
            // Search organization title.
            angular.forEach($scope.organizations, function(org) {
                if (org.identifier == organizationId) {
                    $scope.currentOrganization.title = org.title;
                }
            });
            // Resize scroll to prevent empty spaces if new TOC is shorter than previous TOC.
            $ionicScrollDelegate.resize();
        }).finally(function() {
            $scope.loadingToc = false;
        });
    }

    // Get status of the SCORM.
    function getStatus() {
        return $mmCoursePrefetchDelegate.getModuleStatus(module, courseid, scorm.sha1hash, 0);
    }

    // Set a listener to monitor changes on this SCORM status to show a message to the user.
    function setStatusListener() {
        if (typeof statusObserver !== 'undefined') {
            return; // Already set.
        }

        // Listen for changes on this module status to show a message to the user.
        statusObserver = $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
            if (data.siteid === $mmSite.getId() && data.componentId === scorm.coursemodule &&
                    data.component === mmaModScormComponent) {
                showStatus(data.status);
            }
        });
    }

    // Showing or hide a status message depending on the SCORM status.
    function showStatus(status) {
        currentStatus = status;

        if (status == mmCoreOutdated) {
            $scope.statusMessage = 'mma.mod_scorm.scormstatusoutdated';
        } else if (status == mmCoreNotDownloaded) {
            $scope.statusMessage = 'mma.mod_scorm.scormstatusnotdownloaded';
        } else if (status == mmCoreDownloading) {
            if (!$scope.downloading) {
                // It's being downloaded right now but the view isn't tracking it. "Restore" the download.
                downloadScormPackage(true);
            }
        } else {
            $scope.statusMessage = '';
        }
    }

    // Refreshes data.
    function refreshData() {
        var promises = [];
        promises.push($mmaModScorm.invalidateScormData(courseid));
        if (scorm) {
            promises.push($mmaModScorm.invalidateAllScormData(scorm.id));
        }

        return $q.all(promises).finally(function() {
            return fetchScormData(true);
        });
    }

    // Download a SCORM package or restores an ongoing download.
    function downloadScormPackage() {
        $scope.downloading = true;
        return $mmaModScorm.download(scorm).then(undefined, undefined, function(progress) {

            if (!progress) {
                return;
            }

            if (progress.packageDownload) { // Downloading package.
                if (scorm.packagesize) {
                    $scope.percentage = (parseFloat(progress.loaded / scorm.packagesize) * 100).toFixed(1);
                }
            } else if (progress.message) { // Show a message.
                $scope.progressMessage = progress.message;
            } else if (progress.loaded && progress.total) { // Unzipping package.
                $scope.percentage = (parseFloat(progress.loaded / progress.total) * 100).toFixed(1);
            } else {
                $scope.percentage = undefined;
            }

        }).finally(function() {
            $scope.progressMessage = undefined;
            $scope.percentage = undefined;
            $scope.downloading = false;
        });
    }

    // Open a SCORM package.
    function openScorm(scoId) {
        $state.go('site.mod_scorm-player', {
            scorm: scorm,
            mode: $scope.scormOptions.mode,
            newAttempt: !!$scope.scormOptions.newAttempt,
            organizationId: $scope.currentOrganization.identifier,
            scoId: scoId
        });
    }

    // Fetch the SCORM data.
    fetchScormData().then(function() {
        $mmaModScorm.logView(scorm.id).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    }).finally(function() {
        $scope.scormLoaded = true;
    });

    // Load a organization's TOC.
    $scope.loadOrg = function() {
        loadOrganizationToc($scope.currentOrganization.identifier).catch(function(message) {
            return showError(message);
        });
    };

    $scope.refreshScorm = function() {
        refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Open a SCORM. It will download the SCORM package if it's not downloaded or it has changed.
    // The scoId param indicates the SCO that needs to be loaded when the SCORM is opened. If not defined, load first SCO.
    $scope.open = function(e, scoId) {
        e.preventDefault();
        e.stopPropagation();

        if ($scope.downloading) {
            // Scope is being downloaded, abort.
            return;
        }

        if (currentStatus == mmCoreOutdated || currentStatus == mmCoreNotDownloaded) {
            // SCORM needs to be downloaded.
            $mmaModScormHelper.confirmDownload(scorm).then(function() {
                // Invalidate file if SCORM is outdated.
                var promise = currentStatus == mmCoreOutdated ? $mmaModScorm.invalidateContent(scorm.coursemodule) : $q.when();
                promise.finally(function() {
                    downloadScormPackage().then(function() {
                        // Success downloading, open scorm if user hasn't left the view.
                        if (!$scope.$$destroyed) {
                            openScorm(scoId);
                        }
                    }).catch(function() {
                        if (!$scope.$$destroyed) {
                            $mmaModScormHelper.showDownloadError(scorm);
                        }
                    });
                });
            });
        } else {
            openScorm(scoId);
        }
    };

    $scope.$on('$destroy', function() {
        statusObserver && statusObserver.off && statusObserver.off();
    });
});
