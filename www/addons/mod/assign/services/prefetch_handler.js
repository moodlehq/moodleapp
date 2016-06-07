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
 * Mod assign prefetch handler.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignPrefetchHandler
 */
.factory('$mmaModAssignPrefetchHandler', function($mmaModAssign, mmaModAssignComponent, $mmSite, $mmFilepool, $q, $mmCourseHelper,
        $mmCourse, $mmGroups, $mmUser, $mmComments) {

    var self = {};

    self.component = mmaModAssignComponent;

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#getDownloadSize
     * @param {Object} module Module to get the size.
     * @param {Number} courseId Course ID the module belongs to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}       Size.
     */
    self.getDownloadSize = function(module, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return self.getFiles(module, courseId, siteId).then(function(files) {
            var size = 0;
            angular.forEach(files, function(file) {
                if (file.filesize) {
                    size = size + file.filesize;
                }
            });

            // Avoid failing.
            if (size == 0) {
                return 1;
            }
            return size;
        });
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         List of files.
     */
    self.getFiles = function(module, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmaModAssign.getAssignment(courseId, module.id, siteId).then(function(assign) {
            var files = assign.introattachments || [];

            return $mmaModAssign.getSubmissions(assign.id, siteId).then(function(data) {
                var blindMarking = assign.blindmarking && !assign.revealidentities;

                return $mmaModAssign.getSubmissionsUserData(data.submissions, courseId, assign.id, blindMarking)
                        .then(function(submissions) {

                    var promises = [],
                        userId = $mmSite.getUserId();

                    // Get Submission status with all files
                    angular.forEach(submissions, function(submission) {
                        if ((data.canviewsubmissions && submission.userid > 0) ||
                            (!data.canviewsubmissions && submission.userid == userId)) {
                            // Teacher, get all submissions.
                            // Student, get only his/her submissions.
                            promises.push(getSubmissionFiles(assign, submission, siteId).then(function(submissionFiles) {
                                files = files.concat(submissionFiles);
                            }));
                        }
                    });

                    return $q.all(promises).then(function() {
                        return files;
                    });
                });
            });
        }).catch(function() {
            // Assign not found, return empty list.
            return [];
        });
    };

    function getSubmissionFiles(assign, submission, siteId) {
        return $mmaModAssign.getSubmissionStatus(assign.id, submission.submitid, !!submission.blindid, siteId)
                .then(function(response) {
            var promises = [];

            if (response.lastattempt) {
                var userSubmission = assign.teamsubmission ?
                                response.lastattempt.teamsubmission : response.lastattempt.submission;
                if (userSubmission) {

                    // Add User Submission files.
                    angular.forEach(userSubmission.plugins, function(plugin) {
                        promises.push($mmaModAssign.getSubmissionPluginAttachments(plugin));
                    });
                }
            }

            if (response.feedback) {
                // Add Feedback files.
                angular.forEach(response.feedback.plugins, function(plugin) {
                    promises.push($mmaModAssign.getSubmissionPluginAttachments(plugin));
                });
            }

            return $q.all(promises);

        }).catch(function(error) {
            var promises = [];

            if (typeof error != "undefined") {
                return [];
            }

            // Fallback. Legacy code ahead. Only add user submission files.
            angular.forEach(submission.plugins, function(plugin) {
                promises.push($mmaModAssign.getSubmissionPluginAttachments(plugin));
            });

            return $q.all(promises);

        }).then(function(filePromises) {
            var files = [];

            angular.forEach(filePromises, function(filePromise) {
                files = files.concat(filePromise);
            });

            return files;
        });
    }

    /**
     * Get timemodified of a Assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#getTimemodified
     * @param {Object} module   Module to get the timemodified.
     * @param {Number} courseId Course ID the module belongs to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Timemodified.
     */
    self.getTimemodified = function(module, courseId, siteId) {
        var lastModified = 0;
        return $mmaModAssign.getAssignment(courseId, module.id, siteId).then(function(assign) {
            lastModified = assign.timemodified;


            return $mmaModAssign.getSubmissions(assign.id, siteId).then(function(data) {
                var blindMarking = assign.blindmarking && !assign.revealidentities;

                return $mmaModAssign.getSubmissionsUserData(data.submissions, courseId, assign.id, blindMarking)
                        .then(function(submissions) {

                    var promises = [],
                        userId = $mmSite.getUserId();
                    // Get Submission status with all files
                    angular.forEach(submissions, function(submission) {
                        if ((data.canviewsubmissions && submission.userid > 0) ||
                            (!data.canviewsubmissions && submission.userid == userId)) {
                            // Teacher, get all submissions.
                            // Student, get only his/her submissions.
                            promises.push(getSubmissionTimemodified(assign, submission, siteId));
                        }
                    });

                    return $q.all(promises).then(function(lastmodifiedTimes) {
                        // Get the maximum value in the array.
                        var submissionTimemodified = Math.max.apply(null, lastmodifiedTimes);
                        lastModified = Math.max(lastModified, submissionTimemodified);

                        return self.getFiles(module, courseId, siteId).then(function(files) {
                            var lastModifiedFiles = $mmFilepool.getTimemodifiedFromFileList(files);
                            // Get the maximum value in the array.
                            return Math.max(lastModified, lastModifiedFiles);
                        });
                    });
                });
            });
        }).catch(function() {
            // Assign not found, return empty list.
            return lastModified;
        });
    };

    function getSubmissionTimemodified(assign, submission, siteId) {
        return $mmaModAssign.getSubmissionStatus(assign.id, submission.submitid, !!submission.blindid, siteId)
                .then(function(response) {
            var lastModified = 0;

            if (response.lastattempt) {
                var userSubmission = assign.teamsubmission ?
                                response.lastattempt.teamsubmission : response.lastattempt.submission;
                if (userSubmission && lastModified < userSubmission.timemodified) {
                    lastModified = userSubmission.timemodified;
                }
            }

            if (response.feedback && lastModified < response.feedback.gradeddate) {
                lastModified = response.feedback.gradeddate;
            }

            return lastModified;
        }).catch(function(error) {

            if (typeof error != "undefined") {
                return 0;
            }

            return submission.timemodified;
        });
    }

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModAssign.isPluginEnabled();
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModAssign.invalidateContent(module.id, courseId);
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        var siteId = $mmSite.getId(),
            userId = $mmSite.getUserId();

        var promises = [];

        promises.push($mmCourse.getModuleBasicInfo(module.id, siteId));

        // Get Assignment to retrieve all its submissions.
        promises.push($mmaModAssign.getAssignment(courseId, module.id, siteId).then(function(assign) {
            var promises = [];

            var blindMarking = assign.blindmarking && !assign.revealidentities;
            if (blindMarking) {
                promises.push($mmaModAssign.getAssignmentUserMappings(assign.id, false, siteId).catch(function() {
                    // Fail silently (Moodle < 2.6)
                }));
            }

            promises.push($mmaModAssign.getSubmissions(assign.id, siteId).then(function(data) {
                var promise, altPromises = [];
                if (data.canviewsubmissions) {
                    // Teacher.
                    // Do not send participants to getSubmissionsUserData to retrieve user profiles.
                    promise = $mmaModAssign.getSubmissionsUserData(data.submissions, courseId, assign.id, blindMarking, false,
                            siteId).then(function(submissions) {
                        var promises = [];
                        angular.forEach(submissions, function(submission) {
                            promises.push(
                                $mmaModAssign.getSubmissionStatus(assign.id, submission.submitid, !!submission.blindid, siteId));
                        });
                        return $q.all(promises).catch(function(error) {
                            // Fail silently (Moodle < 3.1)
                        });
                    });

                    // Get list participants.
                    altPromises.push($mmaModAssign.listParticipants(assign.id, 0, siteId).then(function (participants) {
                        angular.forEach(participants, function(participant) {
                            if (participant.profileimageurl) {
                                $mmFilepool.addToQueueByUrl(siteId, participant.profileimageurl);
                            }
                        });
                    }).catch(function() {
                        // Fail silently (Moodle < 3.2)
                    }));
                } else {
                    // Student.
                    promise = $q.all([$mmaModAssign.getSubmissionStatus(assign.id, userId, false, siteId)]);
                }

                altPromises.push($mmGroups.getActivityAllowedGroups(assign.cmid, false, siteId));

                return $q.all(altPromises).then(function() {
                    // Fetch user and group info.
                    return promise.then(function(submissions) {
                        var promises = [];

                        angular.forEach(submissions, function(submission) {
                            if (submission.lastattempt) {
                                if (!blindMarking && submission.lastattempt.submissiongroupmemberswhoneedtosubmit) {
                                    angular.forEach(submission.lastattempt.submissiongroupmemberswhoneedtosubmit, function(member) {
                                        promises.push($mmUser.getProfile(member, courseId).then(function(profile) {
                                            if (profile.profileimageurl) {
                                                return $mmFilepool.addToQueueByUrl(siteId, profile.profileimageurl);
                                            }
                                        }));
                                    });
                                }

                                // Probably we should move that to a prefetch handler but, not really sure about it.
                                if (submission.lastattempt.submission.id) {
                                    angular.forEach(submission.lastattempt.submission.plugins, function(plugin) {
                                        if (plugin.type == "comments") {
                                            promises.push($mmComments.getComments('module', assign.cmid, 'assignsubmission_comments',
                                                submission.lastattempt.submission.id, 'submission_comments', 0, siteId).catch(function() {
                                                    // Fail silently (Moodle < 3.1.1, 3.2)
                                            }));
                                        }
                                    });

                                }
                            }

                            if (submission.feedback) {
                                if (submission.feedback.grade && submission.feedback.grade.grader) {
                                    promises.push($mmUser.getProfile(submission.feedback.grade.grader, courseId)
                                            .then(function(profile) {
                                        return $mmFilepool.addToQueueByUrl(siteId, profile.profileimageurl);
                                    }));
                                }
                            }
                        });

                        return $q.all(promises);
                    });
                });
            }));

            promises.push($mmCourseHelper.getModuleCourseIdByInstance(assign.id, 'assign', siteId));

            // Get related submissions files and fetch them.
            promises.push(self.getFiles(module, courseId, siteId).then(function (files) {
                var revision = $mmFilepool.getRevisionFromFileList(files),
                    timemodified = $mmFilepool.getTimemodifiedFromFileList(files);

                // Download related files and update package info.
                return $mmFilepool.prefetchPackage(siteId, files, mmaModAssignComponent, module.id, revision, timemodified);
            }));

            return $q.all(promises);
        }));

        return $q.all(promises);
    };

    return self;
});

