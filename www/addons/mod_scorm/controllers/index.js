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
.controller('mmaModScormIndexCtrl', function($scope, $stateParams, $mmaModScorm, $mmUtil, $q, $mmCourse, $ionicScrollDelegate) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        scorm;

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
        return $mmaModScorm.getScorm(courseid, module.id).then(function(scormdata) {
            scorm = scormdata;

            $scope.title = scorm.name || $scope.title;
            $scope.description = scorm.intro || $scope.description;
            $scope.scorm = scorm;

            if (!$mmaModScorm.isScormValidVersion(scorm)) {
                $scope.errorMessage = 'mma.mod_scorm.errorinvalidversion';
            } else if (!$mmaModScorm.isScormDownloadable(scorm)) {
                $scope.errorMessage = 'mma.mod_scorm.errornotdownloadable';
            } else if (!$mmaModScorm.isValidPackageUrl(scorm.packageurl)) {
                $scope.errorMessage = 'mma.mod_scorm.errorpackagefile';
            } else {
                $scope.errorMessage = '';
            }

            if (scorm.warningmessage) {
                return; // SCORM is closed or not open yet, we can't get more data.
            }

            // Get the number of attempts and check if SCORM is incomplete.
            return $mmaModScorm.getAttemptCount(scorm.id).then(function(numattempts) {
                return $mmaModScorm.isScormIncomplete(scorm, numattempts).then(function(incomplete) {
                    var promises = [];

                    scorm.incomplete = incomplete;
                    scorm.numattempts = numattempts;
                    scorm.grademethodreadable = $mmaModScorm.getScormGradeMethod(scorm);
                    scorm.attemptsleft = $mmaModScorm.countAttemptsLeft(scorm, numattempts);
                    if (scorm.forceattempt && scorm.incomplete) {
                        $scope.scormOptions.newAttempt = true;
                    }

                    if (scorm.displayattemptstatus) {
                        promises.push(getReportedGrades());
                    }

                    if (scorm.displaycoursestructure) {
                        promises.push(fetchStructure());
                    }

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
        return $mmaModScorm.getAttemptCount(scorm.id, undefined, true).then(function(numattempts) {
            var promises = [];
            scorm.attempts = [];
            // Calculate the grade for each attempt.
            for (var attempt = 1; attempt <= numattempts; attempt++) {
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
    function loadOrganizationToc(organizationid) {
        $scope.loadingToc = true;
        return $mmaModScorm.getOrganizationToc(scorm.id, organizationid, scorm.numattempts).then(function(toc) {
            $scope.toc = $mmaModScorm.formatTocToArray(toc);
            // Get images for each SCO.
            angular.forEach($scope.toc, function(sco) {
                sco.image = $mmaModScorm.getScoStatusIcon(sco, scorm.incomplete);
            });
            // Search organization title.
            angular.forEach($scope.organizations, function(org) {
                if (org.identifier == organizationid) {
                    $scope.currentOrganization.title = org.title;
                }
            });
            // Resize scroll to prevent empty spaces if new TOC is shorter than previous TOC.
            $ionicScrollDelegate.resize();
        }).finally(function() {
            $scope.loadingToc = false;
        });
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
});
