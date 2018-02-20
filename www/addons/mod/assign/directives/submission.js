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
        mmaModAssignUnlimitedAttempts, mmUserProfileState, mmaModAssignSubmissionStatusNew, mmaModAssignSubmissionStatusSubmitted,
        mmaModAssignSubmissionInvalidatedEvent, $mmGroups, $state, $mmaModAssignHelper, mmaModAssignSubmissionStatusReopened,
        $mmEvents, mmaModAssignSubmittedForGradingEvent, $mmFileUploaderHelper, $mmApp, $mmText, mmaModAssignComponent, $mmUtil,
        $mmaModAssignOffline, mmaModAssignEventManualSynced, $mmCourse, $mmGrades, mmaModAssignAttemptReopenMethodManual,
        $mmLang, $mmSyncBlock, mmaModAssignEventSubmitGrade, $ionicPlatform, mmaModAssignGradedEvent, $mmGradesHelper) {

    var originalGrades =  {};

    /**
     * Set the submission status name and class.
     *
     * @param {Object} scope  Directive scope.
     * @param {Object} assign Assignment.
     * @param {Object} status Submission status.
     */
    function setStatusNameAndClass(scope, assign, status) {
        if (scope.hasOffline) {
            // Offline data.
            scope.statusTranslated = $translate.instant('mm.core.notsent');
            scope.statusClass = 'badge-energized';
        } else if (!assign.teamsubmission) {
            if (scope.userSubmission && scope.userSubmission.status != mmaModAssignSubmissionStatusNew) {
                scope.statusTranslated = $translate.instant('mma.mod_assign.submissionstatus_' + scope.userSubmission.status);
                scope.statusClass = $mmaModAssign.getSubmissionStatusClass(scope.userSubmission.status);
            } else {
                if (!status.lastattempt.submissionsenabled) {
                    scope.statusTranslated = $translate.instant('mma.mod_assign.noonlinesubmissions');
                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass('noonlinesubmissions');
                } else {
                    scope.statusTranslated = $translate.instant('mma.mod_assign.noattempt');
                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass('noattempt');
                }
            }
        } else {
            if (!status.lastattempt.submissiongroup && assign.preventsubmissionnotingroup) {
                scope.statusTranslated = $translate.instant('mma.mod_assign.nosubmission');
                scope.statusClass = $mmaModAssign.getSubmissionStatusClass('nosubmission');
            } else if (scope.userSubmission && scope.userSubmission.status != mmaModAssignSubmissionStatusNew) {
                scope.statusTranslated = $translate.instant('mma.mod_assign.submissionstatus_' + scope.userSubmission.status);
                scope.statusClass = $mmaModAssign.getSubmissionStatusClass(scope.userSubmission.status);
            } else {
                if (!status.lastattempt.submissionsenabled) {
                    scope.statusTranslated = $translate.instant('mma.mod_assign.noonlinesubmissions');
                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass('noonlinesubmissions');
                } else {
                    scope.statusTranslated = $translate.instant('mma.mod_assign.nosubmission');
                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass('nosubmission');
                }
            }
        }
    }

    /**
     * Convenience function to minimize and split the controller having all feedback info here.
     *
     * @param {Object} scope            Directive scope.
     * @param {Object} assign           Assignment.
     * @param {Object} feedbackStatus   Submission feedback status.
     * @param {Number} courseId         Course Id.
     * @param {Number} moduleId         Module Id.
     * @param {Number} userId           User Id.
     * @return {Promise}          Resolved when controller finish.
     */
    function feedbackController(scope, assign, feedbackStatus, courseId, moduleId, userId) {
        scope.grade = {
            method: false,
            grade: false,
            modified: 0,
            gradingStatus: false,
            addAttempt : false,
            applyToAll: false,
            scale: false,
            lang: false
        };

        originalGrades =  {
            grade: false,
            addAttempt: false,
            applyToAll: false,
            outcomes: {}
        };

        if (feedbackStatus) {
            scope.feedback = feedbackStatus;
            if (feedbackStatus.grade && feedbackStatus.grade.grader) {
                $mmUser.getProfile(feedbackStatus.grade.grader, courseId).then(function(profile) {
                    scope.grader = profile;
                });
            }

            if (feedbackStatus.gradefordisplay) {
                var position = feedbackStatus.gradefordisplay.indexOf('class="advancedgrade"');
                if (position > -1) {
                    scope.feedback.advancedgrade = true;
                }
            }

            // Do not override already loaded grade.
            if (feedbackStatus.grade && feedbackStatus.grade.grade && !scope.grade.grade) {
                var parsedGrade = parseFloat(feedbackStatus.grade.grade);
                scope.grade.grade = parsedGrade || parsedGrade == 0 ? parsedGrade : null;
            }
        } else {
            // If no feedback, always show Submission.
            scope.showSubmission = true;
        }

        scope.grade.gradingStatus = scope.lastAttempt.gradingstatus;

        return $mmaModAssign.isGradingEnabled().then(function(enabled) {
            if (!enabled) {
                return $q.when();
            }
            return $mmCourse.getModuleBasicGradeInfo(moduleId).then(function(gradeInfo) {
                if (!gradeInfo) {
                    return $q.when();
                }

                if (!scope.$$destroyed) {
                    // Block the assignment.
                    $mmSyncBlock.blockOperation(mmaModAssignComponent, assign.id);
                }

                scope.gradeInfo = gradeInfo;
                if (gradeInfo.advancedgrading && gradeInfo.advancedgrading[0] &&
                        typeof gradeInfo.advancedgrading[0].method != 'undefined') {
                    scope.grade.method = gradeInfo.advancedgrading[0].method || 'simple';
                } else {
                    scope.grade.method = 'simple';
                }
                scope.isGrading = true;

                // Grades can be saved if simple grading.
                scope.canSaveGrades = scope.grade.method == 'simple';

                if (scope.gradeInfo.scale) {
                    scope.grade.scale = $mmUtil.makeMenuFromList(scope.gradeInfo.scale, $translate.instant('mm.core.nograde'));
                } else {
                    // Get current language to format grade input field.
                    $mmLang.getCurrentLanguage().then(function(lang) {
                        scope.grade.lang = lang;
                    });
                }

                if ($mmaModAssign.isOutcomesEditEnabled()) {
                    angular.forEach(scope.gradeInfo.outcomes, function(outcome) {
                        if (outcome.scale) {
                            outcome.options =
                                $mmUtil.makeMenuFromList(outcome.scale, $translate.instant('mm.grades.nooutcome'));
                        }
                        outcome.selectedId = 0;
                        originalGrades.outcomes[outcome.id] = outcome.selectedId;
                    });
                }

                return $mmGrades.getGradeModuleItems(courseId, moduleId, userId).then(function(grades) {
                    var outcomes = {};

                    angular.forEach(grades, function(grade) {
                        if (!grade.outcomeid && !grade.scaleid) {
                            if (scope.grade.scale) {
                                scope.grade.grade = $mmGradesHelper.getGradeValueFromLabel(scope.grade.scale, grade.gradeformatted);
                            } else {
                                var parsedGrade = parseFloat(grade.gradeformatted);
                                scope.grade.grade = parsedGrade || parsedGrade == 0 ? parsedGrade : null;
                            }
                            scope.grade.modified = grade.gradedategraded;
                            originalGrades.grade = scope.grade.grade;
                        } else if (grade.outcomeid) {
                            // Only show outcomes with info on it outcomeid could be null if outcomes are disabled on site.
                            angular.forEach(scope.gradeInfo.outcomes, function(outcome) {
                                if (outcome.id == grade.outcomeid) {
                                    outcome.selected = grade.gradeformatted;
                                    outcome.modified = grade.gradedategraded;
                                    if (outcome.options) {
                                        outcome.selectedId = $mmGradesHelper.getGradeValueFromLabel(outcome.options, outcome.selected);
                                        originalGrades.outcomes[outcome.id] = outcome.selectedId;
                                        outcome.itemNumber = grade.itemnumber;
                                    }
                                    outcomes[outcome.id] = outcome;
                                }
                            });
                        }
                    });
                    scope.gradeInfo.outcomes = outcomes;
                });
            }).then(function() {
                if (!scope.isGrading) {
                    return $q.when();
                }

                var isManual = assign.attemptreopenmethod == mmaModAssignAttemptReopenMethodManual,
                    isUnlimited = assign.maxattempts == mmaModAssignUnlimitedAttempts,
                    isLessThanMaxAttempts = scope.userSubmission &&
                        (scope.userSubmission.attemptnumber < (assign.maxattempts - 1));

                scope.allowAddAttempt = isManual && (!scope.userSubmission || isUnlimited || isLessThanMaxAttempts);

                if (assign.teamsubmission) {
                    scope.grade.applyToAll = true;
                    originalGrades.applyToAll = true;
                }
                if (assign.markingworkflow && scope.grade.gradingStatus) {
                    scope.workflowStatusTranslationId =
                        $mmaModAssign.getSubmissionGradingStatusTranslationId(scope.grade.gradingStatus);
                }

                if (!scope.feedback || !scope.feedback.plugins) {
                    scope.feedback = {};
                    // Feedback plugins not present, we have to use assign configs to detect the plugins used.
                    scope.feedback.plugins = $mmaModAssignHelper.getPluginsEnabled(assign, 'assignfeedback');
                }

                // Check if there's any offline data for this submission.
                if (scope.canSaveGrades) {
                    // Submission grades are not identified using attempt number so it can retrieve the feedback for a previous
                    // attempt. The app will not treat that as an special case.
                    return $mmaModAssignOffline.getSubmissionGrade(assign.id, userId).then(function(data) {
                        // Load offline grades.
                        if (data &&
                                (!feedbackStatus || !feedbackStatus.gradeddate || feedbackStatus.gradeddate < data.timemodified)) {
                            // If grade has been modified from gradebook, do not use offline.
                            if (scope.grade.modified < data.timemodified) {
                                scope.grade.grade = data.grade;
                                scope.gradingStatusTranslationId = 'mma.mod_assign.gradenotsynced';
                                scope.gradingClass = "";
                                originalGrades.grade = scope.grade.grade;
                            }

                            scope.grade.applyToAll = data.applytoall;
                            scope.grade.addAttempt = data.addattempt;
                            originalGrades.applyToAll = scope.grade.applyToAll;
                            originalGrades.addAttempt = scope.grade.addAttempt;

                            if (data.outcomes && Object.keys(data.outcomes).length) {
                                angular.forEach(scope.gradeInfo.outcomes, function(outcome) {
                                    if (typeof data.outcomes[outcome.itemNumber] != "undefined") {
                                        // If outcome has been modified from gradebook, do not use offline.
                                        if (outcome.modified < data.timemodified) {
                                            outcome.selectedId = data.outcomes[outcome.itemNumber];
                                            originalGrades.outcomes[outcome.id] = outcome.selectedId;
                                        }
                                    }
                                });
                            }
                        }
                    });
                } else {
                    return $mmCourse.getModule(moduleId, courseId, false, true).then(function(mod) {
                        scope.gradeUrl = mod.url + "&action=grader&userid=" + userId;
                    });
                }
            });
        });
    }

    // Directive controller.
    function controller() {
        var self = this;

        self.load = function(scope, moduleId, courseId, submitId, blindId) {
            var isBlind = !!blindId,
                assign;

            scope.previousAttempt = false;

            if (!submitId) {
                submitId = $mmSite.getUserId();
                isBlind = false;
            }

            return $mmaModAssign.getAssignment(courseId, moduleId).then(function(assignData) {
                assign = assignData;

                var time = $mmUtil.timestamp(),
                    promises = [];

                scope.assign = assign;

                if (assign.allowsubmissionsfromdate && assign.allowsubmissionsfromdate >= time) {
                    scope.fromDate = moment(assign.allowsubmissionsfromdate * 1000)
                        .format($translate.instant('mm.core.dfmediumdate'));
                }
                scope.currentAttempt = 0;
                scope.attemptReopenMethodNone = mmaModAssignAttemptReopenMethodNone;
                scope.unlimitedAttempts = mmaModAssignUnlimitedAttempts;
                scope.maxAttemptsText = $translate.instant('mma.mod_assign.unlimitedattempts');
                scope.blindMarking = scope.isSubmittedForGrading && assign.blindmarking && !assign.revealidentities;

                if (!scope.blindMarking && submitId != $mmSite.getUserId()) {
                    promises.push($mmUser.getProfile(submitId, courseId).then(function(profile) {
                        scope.user = profile;
                    }));
                }

                // Check if there's any offline data for this submission.
                promises.push($mmaModAssignOffline.getSubmission(assign.id, submitId).then(function(data) {
                    scope.hasOffline = data && data.plugindata && Object.keys(data.plugindata).length;
                    scope.submittedOffline = data && data.submitted;
                }).catch(function() {
                    // No offline data found.
                    scope.hasOffline = false;
                    scope.submittedOffline = false;
                }));

                return $q.all(promises);
            }).then(function() {
                // Get submission status.
                return $mmaModAssign.getSubmissionStatus(assign.id, submitId, isBlind).then(function(response) {
                    var promises = [],
                        submissionStatementMissing = assign.requiresubmissionstatement &&
                            typeof assign.submissionstatement == 'undefined';

                    scope.submissionStatusAvailable = true;

                    scope.lastAttempt = response.lastattempt;
                    if (response.previousattempts && response.previousattempts.length > 0) {
                        var previousAttempts = response.previousattempts.sort(function(a, b) {
                            return a.attemptnumber - b.attemptnumber;
                        });
                        scope.previousAttempt = previousAttempts[previousAttempts.length - 1];
                    }

                    scope.membersToSubmit = [];
                    if (response.lastattempt) {
                        scope.canSubmit = !scope.isSubmittedForGrading && !scope.submittedOffline &&
                            (response.lastattempt.cansubmit ||
                                (scope.hasOffline && $mmaModAssign.canSubmitOffline(assign, response)));
                        scope.canEdit = !scope.isSubmittedForGrading && response.lastattempt.canedit &&
                                (!scope.submittedOffline || !assign.submissiondrafts);

                        // Get submission statement if needed.
                        if (assign.requiresubmissionstatement && assign.submissiondrafts && submitId == $mmSite.getUserId()) {
                            scope.submissionStatement = assign.submissionstatement;
                            scope.submitModel.submissionStatement = false;
                        } else {
                            scope.submissionStatement = false;
                            scope.submitModel.submissionStatement = true; // No submission statement, so it's accepted.
                        }

                        // Show error instead of edit/submit button if submission statement should be shown
                        // but we couldn't retrieve it from server (Moodle 3.1 or previous).
                        scope.showErrorStatementEdit = submissionStatementMissing && !assign.submissiondrafts &&
                                submitId == $mmSite.getUserId();
                        scope.showErrorStatementSubmit = submissionStatementMissing && assign.submissiondrafts;

                        scope.userSubmission = $mmaModAssign.getSubmissionObjectFromAttempt(assign, response.lastattempt);

                        if (assign.attemptreopenmethod != mmaModAssignAttemptReopenMethodNone) {
                            if (scope.userSubmission) {
                                scope.currentAttempt = scope.userSubmission.attemptnumber + 1;
                            }
                        }

                        setStatusNameAndClass(scope, assign, response);

                        if (assign.teamsubmission) {
                            if (response.lastattempt.submissiongroup) {
                                promises.push($mmGroups.getActivityAllowedGroups(assign.cmid).then(function(groups) {
                                    angular.forEach(groups, function(group) {
                                        if (group.id == response.lastattempt.submissiongroup) {
                                            scope.lastAttempt.submissiongroupname = group.name;
                                        }
                                    });
                                }));
                            }

                            if (scope.userSubmission && scope.userSubmission.status != mmaModAssignSubmissionStatusNew) {
                                scope.userStateName = mmUserProfileState;

                                angular.forEach(response.lastattempt.submissiongroupmemberswhoneedtosubmit, function(member) {
                                    if (scope.blindMarking) {
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
                            }
                        }

                        scope.gradingStatusTranslationId =
                                    $mmaModAssign.getSubmissionGradingStatusTranslationId(response.lastattempt.gradingstatus);
                        scope.gradingClass = $mmaModAssign.getSubmissionGradingStatusClass(response.lastattempt.gradingstatus);

                        if (scope.userSubmission) {
                            if (!assign.teamsubmission || !response.lastattempt.submissiongroup ||
                                    !assign.preventsubmissionnotingroup) {
                                if (scope.previousAttempt && scope.previousAttempt.submission.plugins &&
                                        scope.userSubmission.status == mmaModAssignSubmissionStatusReopened) {
                                    // Get latest attempt if avalaible.
                                    scope.submissionPlugins = scope.previousAttempt.submission.plugins;
                                } else {
                                    scope.submissionPlugins = scope.userSubmission.plugins;
                                }
                            }
                        }
                    }

                    if (assign.duedate > 0) {
                        var duedate = response.lastattempt && response.lastattempt.extensionduedate ?
                            response.lastattempt.extensionduedate: assign.duedate,
                            time = $mmUtil.timestamp();
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
                                var timeSubmittedDiff = scope.userSubmission.timemodified - duedate;
                                if (timeSubmittedDiff > 0) {
                                    scope.timeRemaining = $translate.instant('mma.mod_assign.submittedlate',
                                        {'$a': $mmUtil.formatDuration(timeSubmittedDiff, 2) });
                                    scope.timeRemainingClass = 'latesubmission';
                                } else {
                                    scope.timeRemaining = $translate.instant('mma.mod_assign.submittedearly',
                                        {'$a': $mmUtil.formatDuration(-timeSubmittedDiff, 2) });
                                    scope.timeRemainingClass = 'earlysubmission';
                                }
                            }
                        } else {
                            scope.timeRemaining = $mmUtil.formatDuration(timeRemaining, 3);
                        }
                    }

                    promises.push(feedbackController(scope, assign, response.feedback, courseId, moduleId, submitId));

                    // Check if there's any unsupported plugin for editing.
                    if (!scope.userSubmission || !scope.userSubmission.plugins) {
                        scope.userSubmission = {};
                        // Submission not created yet, we have to use assign configs to detect the plugins used.
                        scope.userSubmission.plugins = $mmaModAssignHelper.getPluginsEnabled(assign, 'assignsubmission');
                    }

                    promises.push($mmaModAssign.getUnsupportedEditPlugins(scope.userSubmission.plugins).then(function(list) {
                        scope.unsupportedEditPlugins = list;
                    }));

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
                        var time = $mmUtil.timestamp();
                        if (assign.duedate - time <= 0) {
                            scope.timeRemaining = $translate.instant('mma.mod_assign.duedatereached');
                        } else {
                            scope.timeRemaining = $mmUtil.formatDuration(assign.duedate - time, 3);
                        }
                    }

                    return $mmaModAssign.getSubmissions(assign.id).then(function(data) {
                        scope.canSubmit = !data.canviewsubmissions;

                        if (data.submissions) {
                            scope.userSubmission = false;
                            angular.forEach(data.submissions, function(submission) {
                                if (submission.userid == submitId) {
                                    scope.userSubmission = submission;
                                    scope.statusTranslated = $translate.instant('mma.mod_assign.submissionstatus_' +
                                        submission.status);
                                    scope.statusClass = $mmaModAssign.getSubmissionStatusClass(submission.status);
                                    scope.currentAttempt = scope.userSubmission.attemptnumber + 1;
                                    scope.submissionPlugins = submission.plugins;
                                }
                            });
                        }
                    });
                });
            }).catch(function(message) {
                $mmUtil.showErrorModalDefault(message, 'Error getting assigment data.');
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
            blindid: '@?',
            scrollHandle: '@?',
            showSubmission: '@?'
        },
        restrict: 'E',
        controller: controller,
        templateUrl: 'addons/mod/assign/templates/submission.html',
        link: function(scope, element, attributes, controller) {
            var moduleId = parseInt(attributes.moduleid, 10),
                courseId = parseInt(attributes.courseid, 10),
                submitId = parseInt(attributes.submitid, 10),
                blindId = parseInt(attributes.blindid, 10),
                blockData,
                obsInvalidated, obsManualSync, obsSubmitGrade;

            // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
            blockData = $mmUtil.blockLeaveView(scope, cancel);

            scope.isSubmittedForGrading = !!submitId;
            scope.statusNew = mmaModAssignSubmissionStatusNew;
            scope.statusReopened = mmaModAssignSubmissionStatusReopened;
            scope.showSubmission = typeof attributes.showSubmission != 'undefined' ? attributes.showSubmission : true;
            scope.submitId = submitId;
            scope.courseId = courseId;
            scope.blindId = blindId;
            scope.loaded = false;
            scope.submitModel = {};

            obsInvalidated = scope.$on(mmaModAssignSubmissionInvalidatedEvent, function() {
                invalidateAndRefresh();
            });

            obsManualSync = $mmEvents.on(mmaModAssignEventManualSynced, function(data) {
                if (data && scope.assign && data.siteid == $mmSite.getId() && data.assignid == scope.assign.id) {
                    controller.load(scope, moduleId, courseId, submitId, blindId);
                }
            });

            obsSubmitGrade = $mmEvents.on(mmaModAssignEventSubmitGrade, function() {
                submitGrade().then(function() {
                    // Go back if not in tablet view.
                    if (!$ionicPlatform.isTablet()) {
                        blockData && blockData.back();
                    }
                });
            });

            // Check if submit through app is supported.
            $mmaModAssign.isSaveAndSubmitSupported().then(function(enabled) {
                scope.submitSupported = enabled;
            });

            scope.$on('$destroy', function() {
                obsInvalidated && obsInvalidated();
                obsManualSync && obsManualSync.off && obsManualSync.off();
                obsSubmitGrade && obsSubmitGrade.off && obsSubmitGrade.off();

                if (scope.assign && scope.isGrading) {
                    $mmSyncBlock.unblockOperation(mmaModAssignComponent, scope.assign.id);
                }
            });

            controller.load(scope, moduleId, courseId, submitId, blindId);

            // Add or edit submission.
            scope.goToEdit = function() {
                $state.go('site.mod_assign-submission-edit', {
                    moduleid: moduleId,
                    courseid: courseId,
                    userid: submitId,
                    blindid: blindId
                });
            };

            // Copy previous attempt and then go to edit.
            scope.copyPrevious = function() {
                if (!$mmApp.isOnline()) {
                    $mmUtil.showErrorModal('mm.core.networkerrormsg', true);
                    return;
                }

                if (!scope.previousAttempt) {
                    // Cannot access previous attempts, just go to edit.
                    scope.goToEdit();
                    return;
                }

                var modal = $mmUtil.showModalLoading(),
                    previousSubmission = $mmaModAssign.getSubmissionObjectFromAttempt(scope.assign, scope.previousAttempt);

                $mmaModAssignHelper.getSubmissionSizeForCopy(scope.assign, previousSubmission).catch(function() {
                    // Error calculating size, return -1.
                    return -1;
                }).then(function(size) {
                    modal.dismiss();

                    // Confirm action.
                    return $mmFileUploaderHelper.confirmUploadFile(size, true);
                }).then(function() {
                    // User confirmed, copy the attempt.
                    modal = $mmUtil.showModalLoading('mm.core.sending', true);

                    $mmaModAssignHelper.copyPreviousAttempt(scope.assign, previousSubmission).then(function() {
                        // Now go to edit.
                        scope.goToEdit();

                        // Invalidate and refresh data to update this view.
                        invalidateAndRefresh();

                        if (!scope.assign.submissiondrafts) {
                            // No drafts allowed, so it was submitted. Trigger event.
                            $mmEvents.trigger(mmaModAssignSubmittedForGradingEvent, {
                                assignmentId: scope.assign.id,
                                submissionId: scope.userSubmission.id,
                                userId: $mmSite.getUserId(),
                                siteId: $mmSite.getId()
                            });
                        }
                    }).catch(function(err) {
                        alert(err);
                    }).finally(function() {
                        modal.dismiss();
                    });
                });
            };

            // Show advanced grade action.
            scope.showAdvancedGrade = function() {
                if (scope.feedback.advancedgrade) {
                    $mmText.expandText($translate.instant('mm.grades.grade'), scope.feedback.gradefordisplay, false,
                            mmaModAssignComponent, moduleId);
                }
            };

            // Change between submission and feedback view.
            scope.changeShowSubmission = function(show) {
                scope.showSubmission = show;
            };

            // Submit grade action.
            function submitGrade() {
                return hasDataToSave().then(function(modified) {
                    if (!modified) {
                        return $q.when();
                    }

                    var attemptNumber = scope.userSubmission ? scope.userSubmission.attemptnumber : -1,
                        outcomes = {},
                        modal,
                        pluginPromise,
                        // Scale "no grade" uses -1 instead of 0.
                        grade = scope.grade.scale && scope.grade.grade == 0 ? -1 : $mmUtil.unformatFloat(scope.grade.grade);

                    if (grade === false) {
                        $mmUtil.showErrorModal('mm.grades.badgrade', true);
                        return $q.reject();
                    }

                    modal = $mmUtil.showModalLoading('mm.core.sending', true);

                    angular.forEach(scope.gradeInfo.outcomes, function(outcome) {
                        if (outcome.itemNumber) {
                            outcomes[outcome.itemNumber] = outcome.selectedId;
                        }
                    });

                    if (scope.feedback && scope.feedback.plugins) {
                        pluginPromise = $mmaModAssignHelper.prepareFeedbackPluginData(scope.assign.id, submitId, scope.feedback);
                    } else {
                        pluginPromise = $q.when({});
                    }

                    return pluginPromise.then(function(pluginData) {
                        return $mmaModAssign.submitGradingForm(scope.assign.id, submitId, grade, attemptNumber,
                                scope.grade.addAttempt, scope.grade.gradingStatus, scope.grade.applyToAll, outcomes, pluginData,
                                courseId).then(function() {

                            discardDrafts().finally(function() {
                                // Invalidate and refresh data.
                                invalidateAndRefresh();

                                $mmEvents.trigger(mmaModAssignGradedEvent, {
                                    assignmentId: scope.assign.id,
                                    submissionId: submitId,
                                    userId: $mmSite.getUserId(),
                                    siteId: $mmSite.getId()
                                });
                            });
                        });
                    }).catch(function(error) {
                        $mmUtil.showErrorModal(error);
                    }).finally(function() {
                        // Keep it on submission view.
                        scope.showSubmission = true;
                        modal.dismiss();
                    });
                });
            }

            // Submit for grading.
            scope.submitForGrading = function(acceptStatement) {
                if (scope.assign.requiresubmissionstatement && !acceptStatement) {
                    $mmUtil.showErrorModal('mma.mod_assign.acceptsubmissionstatement', true);
                    return $q.reject();
                }

                // Ask for confirmation. @todo plugin precheck_submission
                $mmUtil.showConfirm($translate('mma.mod_assign.confirmsubmission')).then(function() {

                    var modal = $mmUtil.showModalLoading('mm.core.sending', true);

                    $mmaModAssign.submitForGrading(scope.assign.id, courseId, acceptStatement,
                                scope.userSubmission.timemodified, scope.hasOffline).then(function() {
                        // Invalidate and refresh data.
                        invalidateAndRefresh();

                        // Submitted, trigger event.
                        $mmEvents.trigger(mmaModAssignSubmittedForGradingEvent, {
                            assignmentId: scope.assign.id,
                            submissionId: scope.userSubmission.id,
                            userId: $mmSite.getUserId(),
                            siteId: $mmSite.getId()
                        });
                    }).catch(function(error) {
                        $mmUtil.showErrorModal(error);
                    }).finally(function() {
                        modal.dismiss();
                    });
                });
            };

            // Invalidate and refresh data.
            function invalidateAndRefresh() {
                scope.loaded = false;

                var promises = [$mmaModAssign.invalidateAssignmentData(courseId)];
                if (scope.assign) {
                    promises.push($mmaModAssign.invalidateSubmissionStatusData(scope.assign.id, submitId, !!blindId));
                    promises.push($mmaModAssign.invalidateAssignmentUserMappingsData(scope.assign.id));
                    promises.push($mmaModAssign.invalidateListParticipantsData(scope.assign.id));
                }
                promises.push($mmGrades.invalidateGradeModuleItems(courseId, submitId));
                promises.push($mmCourse.invalidateModule(moduleId));

                return $q.all(promises).finally(function() {
                    return controller.load(scope, moduleId, courseId, submitId, blindId);
                });
            }

            // Convenience function to compare data to be saved.
            function hasDataToSave() {
                if (!scope.canSaveGrades) {
                    return $q.when(false);
                }

                var modified = originalGrades.grade != scope.grade.grade ||
                    originalGrades.addAttempt != scope.grade.addAttempt ||
                    originalGrades.applyToAll != scope.grade.applyToAll;

                if (scope.gradeInfo && scope.gradeInfo.outcomes) {
                    for (var x in scope.gradeInfo.outcomes) {
                        if (modified) {
                            return $q.when(true);
                        }
                        var outcome = scope.gradeInfo.outcomes[x];

                        modified = originalGrades.outcomes[outcome.id] == 'undefined' ||
                            originalGrades.outcomes[outcome.id] != outcome.selectedId;
                    }
                }

                if (modified) {
                    return $q.when(true);
                }

                if (scope.feedback && scope.feedback.plugins) {
                    return $mmaModAssignHelper.hasFeedbackDataChanged(scope.assign, submitId, scope.feedback).catch(function() {
                        // Error ocurred, omit error as not modified.
                        return $q.when(false);
                    });
                }
                return $q.when(false);
            }

            // Convenience function to discard feedback drafts.
            function discardDrafts() {
                if (scope.feedback && scope.feedback.plugins) {
                    return $mmaModAssignHelper.discardFeedbackPluginData(scope.assign.id, submitId, scope.feedback);
                }
                return $q.when();
            }

            // Just ask to confirm the lost of data.
            function cancel() {
                return hasDataToSave().then(function(modified) {
                    if (modified) {
                        // Modified, confirm user wants to go back.
                        return $mmUtil.showConfirm($translate('mm.core.confirmcanceledit')).then(function() {
                            return discardDrafts().catch(function() {
                                // Ignore errors.
                            });
                        });
                    }
                });
            }
        }
    };
});
