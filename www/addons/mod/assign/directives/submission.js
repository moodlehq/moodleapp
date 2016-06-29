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

angular.module('mm.addons.mod_assign')

/**
 * Directive to render an submission.
 *
 * @module mm.addons.mod_assign
 * @ngdoc directive
 * @name mmaModAssignSubmission
 * @description
 * Directive to render submission.
 */
.directive('mmaModAssignSubmission', function($mmaModAssign, $translate, $mmUser, mmaModAssignAttemptReopenMethodNone, $q, $mmSite,
        mmaModAssignUnlimitedAttempts, mmaModAssignGradingStatusGraded, mmaModAssignGradingStatusNotGraded, mmUserProfileState,
        mmaModMarkingWorkflowStateReleased, mmaModAssignSubmissionStatusNew, mmaModAssignSubmissionStatusSubmitted, $mmUtil,
        mmaModAssignSubmissionInvalidated, $mmGroups, mmaModAssignSubmissionStatusReopened) {

    // Directive controller.
    function controller() {
        var self = this;

        self.load = function(scope, moduleId, courseId, submitId, blindId) {
            var isBlind = !!blindId;
            if (!submitId) {
                submitId = $mmSite.getUserId();
                isBlind = false;
            }

            return $mmaModAssign.getAssignment(courseId, moduleId).then(function(assign) {
                var time = parseInt(Date.now() / 1000);

                scope.assign = assign;

                if (assign.allowsubmissionsfromdate && assign.allowsubmissionsfromdate >= time) {
                    scope.fromDate = moment(assign.allowsubmissionsfromdate * 1000)
                        .format($translate.instant('mm.core.dfmediumdate'));
                }
                scope.currentAttempt = 0;
                scope.unlimitedAttempts = mmaModAssignUnlimitedAttempts;

                return $mmaModAssign.getSubmissionStatus(assign.id, submitId, isBlind).then(function(response) {
                    var promises = [];

                    scope.submissionStatusAvailable = true;

                    scope.lastAttempt = response.lastattempt;
                    scope.membersToSubmit = [];
                    if (response.lastattempt) {
                        var blindMarking = scope.isGrading && response.lastattempt.blindmarking && !assign.revealidentities;

                        scope.cansubmit = !scope.isGrading && response.lastattempt.cansubmit;
                        scope.canEdit = !scope.isGrading && response.lastattempt.canedit;

                        scope.userSubmission = assign.teamsubmission ?
                            response.lastattempt.teamsubmission : response.lastattempt.submission;

                        if (assign.attemptreopenmethod != mmaModAssignAttemptReopenMethodNone) {
                            if (scope.userSubmission) {
                                scope.currentAttempt = scope.userSubmission.attemptnumber + 1;
                            }
                        }

                        if (!assign.teamsubmission) {
                            if (scope.userSubmission && scope.userSubmission.status != mmaModAssignSubmissionStatusNew) {
                                scope.statusTranslated = $translate.instant('mma.mod_assign.submissionstatus_' +
                                    scope.userSubmission.status);
                                scope.statusClass = $mmaModAssign.getSubmissionStatusClass(scope.userSubmission.status);
                            } else {
                                if (!response.lastattempt.submissionsenabled) {
                                    scope.statusTranslated = $translate.instant('mma.mod_assign.noonlinesubmissions');
                                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass('noonlinesubmissions');
                                } else {
                                    scope.statusTranslated = $translate.instant('mma.mod_assign.noattempt');
                                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass('noattempt');
                                }
                            }
                        } else {
                            if (response.lastattempt.submissiongroup) {
                                promises.push($mmGroups.getActivityAllowedGroups(assign.cmid).then(function(groups) {
                                    angular.forEach(groups, function(group) {
                                        if (group.id == response.lastattempt.submissiongroup) {
                                            scope.lastAttempt.submissiongroupname = group.name;
                                        }
                                    });
                                }));
                            }

                            if (!response.lastattempt.submissiongroup && assign.preventsubmissionnotingroup) {
                                scope.statusTranslated = $translate.instant('mma.mod_assign.nosubmission');
                                scope.statusClass = $mmaModAssign.getSubmissionStatusClass('nosubmission');
                            } else if (scope.userSubmission && scope.userSubmission.status != mmaModAssignSubmissionStatusNew) {
                                scope.userStateName = mmUserProfileState;

                                angular.forEach(response.lastattempt.submissiongroupmemberswhoneedtosubmit, function(member) {
                                    if (blindMarking) {
                                        // Users not blinded! (Moodle < 3.1.1, 3.2)
                                        promises.push($mmaModAssign.getAssignmentUserMappings(assign.id, member).then(function(blindId) {
                                            scope.membersToSubmit.push(blindId);
                                        }).catch(function() {
                                            // Fail silently (Moodle < 2.6)
                                        }));
                                    } else {
                                        promises.push($mmUser.getProfile(member, courseId).then(function(profile) {
                                            scope.membersToSubmit.push(profile);
                                        }));
                                    }
                                });
                                angular.forEach(response.lastattempt.submissiongroupmemberswhoneedtosubmitblind, function(member) {
                                    scope.membersToSubmit.push(member);
                                });

                                scope.statusTranslated = $translate.instant('mma.mod_assign.submissionstatus_' +
                                    scope.userSubmission.status);
                                scope.statusClass = $mmaModAssign.getSubmissionStatusClass(scope.userSubmission.status);
                            } else {
                                if (!response.lastattempt.submissionsenabled) {
                                    scope.statusTranslated = $translate.instant('mma.mod_assign.noonlinesubmissions');
                                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass('noonlinesubmissions');
                                } else {
                                    scope.statusTranslated = $translate.instant('mma.mod_assign.nosubmission');
                                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass('nosubmission');
                                }
                            }
                        }

                        if (response.lastattempt.gradingstatus == mmaModAssignGradingStatusGraded ||
                                response.lastattempt.gradingstatus == mmaModAssignGradingStatusNotGraded) {
                            scope.gradingStatus = $translate.instant('mma.mod_assign.'+response.lastattempt.gradingstatus);
                        } else {
                            scope.gradingStatus = $translate.instant('mma.mod_assign.markingworkflowstate' +
                                response.lastattempt.gradingstatus);
                        }
                        if (response.lastattempt.gradingstatus == mmaModAssignGradingStatusGraded ||
                                response.lastattempt.gradingstatus == mmaModMarkingWorkflowStateReleased) {
                            scope.gradingClass = 'submissiongraded';
                        } else {
                            scope.gradingClass = 'submissionnotgraded';
                        }

                        if (scope.userSubmission) {
                            if (!assign.teamsubmission || response.lastattempt.submissiongroup != false ||
                                    !assign.preventsubmissionnotingroup) {
                                scope.submissionPlugins = scope.userSubmission.plugins;
                            }
                        }
                    }

                    if (assign.duedate > 0) {
                        var duedate = response.lastattempt && response.lastattempt.extensionduedate ?
                            response.lastattempt.extensionduedate: assign.duedate,
                            time = parseInt(Date.now() / 1000);
                            timeRemaining = duedate - time;
                        if (timeRemaining <= 0) {
                            if (!scope.userSubmission || scope.userSubmission.status != mmaModAssignSubmissionStatusSubmitted) {
                                if ((response.lastattempt && response.lastattempt.submissionsenabled) ||
                                    (response.gradingsummary && response.gradingsummary.submissionsenabled)) {
                                    scope.timeRemaining = $translate.instant('mma.mod_assign.overdue',
                                        {'$a': $mmUtil.formatDuration(-timeRemaining, 3) });
                                    scope.timeRemainingClass = 'overdue';
                                } else {
                                    scope.timeRemaining = $translate.instant('mma.mod_assign.duedatereached');
                                }
                            } else {
                                if (scope.userSubmission.timemodified > duedate) {
                                    scope.timeRemaining = $translate.instant('mma.mod_assign.submittedlate',
                                        {'$a': $mmUtil.formatDuration(-timeRemaining, 3) });
                                    scope.timeRemainingClass = 'latesubmission';
                                } else {
                                    scope.timeRemaining = $translate.instant('mma.mod_assign.submittedearly',
                                        {'$a': $mmUtil.formatDuration(-timeRemaining, 3) });
                                    scope.timeRemainingClass = 'earlysubmission';
                                }
                            }
                        } else {
                            scope.timeRemaining = $mmUtil.formatDuration(timeRemaining, 3);
                        }
                    }

                    // Feedback info.
                    if (response.feedback) {
                        scope.feedback = response.feedback;
                        if (response.feedback.grade && response.feedback.grade.grader) {
                            $mmUser.getProfile(response.feedback.grade.grader, courseId).then(function(profile) {
                                scope.grader = profile;
                            });
                        }
                    }

                    return $q.all(promises);
                }).catch(function(error) {
                    if (typeof error != "undefined") {
                        if (error == 'error/nopermission') {
                            $mmUtil.showModal('mm.core.notice', 'mma.mod_assign.errorshowinginformation');
                            return $q.when();
                        }
                        return $q.reject(error);
                    }

                    // Fallback. Legacy code ahead.
                    if (assign.duedate > 0) {
                        var time = parseInt(Date.now() / 1000);
                        if (assign.duedate - time <= 0) {
                            scope.timeRemaining = $translate.instant('mma.mod_assign.duedatereached');
                        } else {
                            scope.timeRemaining = $mmUtil.formatDuration(assign.duedate - time, 3);
                        }
                    }

                    return $mmaModAssign.getSubmissions(assign.id).then(function(data) {
                        scope.cansubmit = !data.canviewsubmissions;

                        if (data.submissions) {
                            scope.userSubmission = false;
                            angular.forEach(data.submissions, function(submission) {
                                if (submission.userid == submitId) {
                                    scope.userSubmission = submission;
                                    scope.statusTranslated = $translate.instant('mma.mod_assign.submissionstatus_' +
                                        submission.status);
                                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass(submission.status);
                                    scope.currentAttempt = submission.attemptnumber + 1;
                                    scope.submissionPlugins = submission.plugins;
                                }
                            });
                        }
                    });
                });
            }).catch(function(message) {
                if (message) {
                    $mmUtil.showErrorModal(message);
                } else {
                    $mmUtil.showErrorModal('Error getting assigment data.');
                }
                return $q.reject();
            }).finally(function() {
                scope.loaded = true;
            });
        };
    }

    return {
        scope: {
            courseid: '@',
            moduleid: '@',
            submitid: '@?',
            blindid: '@?'
        },
        restrict: 'E',
        controller: controller,
        templateUrl: 'addons/mod/assign/templates/submission.html',
        link: function(scope, element, attributes, controller) {
            scope.isGrading = !!attributes.submitid;
            scope.statusNew = mmaModAssignSubmissionStatusNew;
            scope.statusReopened = mmaModAssignSubmissionStatusReopened;
            scope.loaded = false;

            var obsLoaded = scope.$on(mmaModAssignSubmissionInvalidated, function() {
                controller.load(scope, attributes.moduleid, attributes.courseid, attributes.submitid, attributes.blindid, true);
            });

            // Check if submit through app is supported.
            $mmaModAssign.isSaveAndSubmitSupported().then(function(enabled) {
                scope.submitSupported = enabled;
            });

            scope.$on('$destroy', obsLoaded);

            controller.load(scope, attributes.moduleid, attributes.courseid, attributes.submitid, attributes.blindid, false);
        }
    };
});
