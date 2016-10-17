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
        $mmCourse, $mmGroups, $mmUser, $mmaModAssignSubmissionDelegate, $mmaModAssignFeedbackDelegate, $mmPrefetchFactory) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModAssignComponent, false);

    /**
     * Download the module.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Assigns cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
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
            // Get intro files and attachments.
            var files = assign.introattachments || [];
            files = files.concat(self.getIntroFilesFromInstance(module, assign));

            return $mmaModAssign.getSubmissions(assign.id, siteId).then(function(data) {
                var blindMarking = assign.blindmarking && !assign.revealidentities;

                if (data.canviewsubmissions) {
                    // Teacher, get all submissions.
                    return $mmaModAssign.getSubmissionsUserData(data.submissions, courseId, assign.id, blindMarking)
                            .then(function(submissions) {

                        var promises = [];

                        // Get Submission status with all files
                        angular.forEach(submissions, function(submission) {
                            promises.push(getSubmissionFiles(assign, submission.submitid, !!submission.blindid,
                                    submission.plugins, siteId).then(function(submissionFiles) {
                                files = files.concat(submissionFiles);
                            }));
                        });

                        return $q.all(promises).then(function() {
                            return files;
                        });
                    });
                } else {
                    // Student, get only his/her submissions.
                    var userId = $mmSite.getUserId();
                    return getSubmissionFiles(assign, userId, blindMarking, [], siteId).then(function(submissionFiles) {
                        files = files.concat(submissionFiles);
                        return files;
                    });
                }
            });
        }).catch(function() {
            // Assign not found, return empty list.
            return [];
        });
    };

    /**
     * Get submission files.
     *
     * @param  {Object} assign        Assign.
     * @param  {Number} submitId      User ID of the submission to get.
     * @param  {Boolean} blindMarking True if blind marking, false otherwise.
     * @param  {Object[]} plugins     Submission plugins. Only used for legacy code.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with array of files.
     */
    function getSubmissionFiles(assign, submitId, blindMarking, plugins, siteId) {
        return $mmaModAssign.getSubmissionStatus(assign.id, submitId, blindMarking, true, false, siteId).then(function(response) {
            var promises = [];

            if (response.lastattempt) {
                var userSubmission = $mmaModAssign.getSubmissionObjectFromAttempt(assign, response.lastattempt);
                if (userSubmission) {
                    // Add submission plugin files.
                    angular.forEach(userSubmission.plugins, function(plugin) {
                        promises.push($mmaModAssignSubmissionDelegate.getPluginFiles(assign, userSubmission, plugin, siteId));
                    });
                }
            }

            if (response.feedback) {
                // Add feedback plugin files.
                angular.forEach(response.feedback.plugins, function(plugin) {
                    promises.push($mmaModAssignFeedbackDelegate.getPluginFiles(assign, response, plugin, siteId));
                });
            }

            return $q.all(promises);

        }).catch(function(error) {
            var promises = [];

            if (typeof error != "undefined") {
                return [];
            }

            // Fallback. Legacy code ahead. Only add user submission files.
            angular.forEach(plugins, function(plugin) {
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
     * Get revision of an assign. Right now assignment files don't have revision, so we'll always return 0.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {String}         Revision.
     */
    self.getRevision = function(module, courseId) {
        return "0";
    };

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
                var blindMarking = assign.blindmarking && !assign.revealidentities,
                    promise;

                if (data.canviewsubmissions) {
                    // Teacher, get all submissions.
                    promise = $mmaModAssign.getSubmissionsUserData(data.submissions, courseId, assign.id, blindMarking)
                            .then(function(submissions) {

                        var promises = [];
                        // Get Submission status with all files
                        angular.forEach(submissions, function(submission) {
                            promises.push(getSubmissionTimemodified(assign, submission.submitid,
                                    !!submission.blindid, submission.timemodified, siteId));
                        });

                        return $q.all(promises).then(function(lastmodifiedTimes) {
                            // Get the maximum value in the array.
                            return Math.max.apply(null, lastmodifiedTimes);
                        });
                    });
                } else {
                    // Student, get only his/her submissions.
                    promise = getSubmissionTimemodified(assign, $mmSite.getUserId(), blindMarking, undefined, siteId);
                }

                return promise.then(function(submissionTimemodified) {
                    lastModified = Math.max(lastModified, submissionTimemodified);

                    return self.getFiles(module, courseId, siteId).then(function(files) {
                        var lastModifiedFiles = $mmFilepool.getTimemodifiedFromFileList(files);
                        // Get the maximum value in the array.
                        return Math.max(lastModified, lastModifiedFiles);
                    });

                });
            });
        }).catch(function() {
            return lastModified;
        });
    };

    /**
     * Get submission timemodified.
     *
     * @param  {Object} assign         Assign.
     * @param  {Number} submitId       User ID of the submission to get.
     * @param  {Boolean} blindMarking  True if blind marking, false otherwise.
     * @param  {Number} [timemodified] Submission timemodified, undefined if unknown.
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with array of files.
     */
    function getSubmissionTimemodified(assign, submitId, blindMarking, timemodified, siteId) {
        return $mmaModAssign.getSubmissionStatus(assign.id, submitId, blindMarking, true, false, siteId)
                .then(function(response) {
            var lastModified = 0;

            if (response.lastattempt) {
                var userSubmission = $mmaModAssign.getSubmissionObjectFromAttempt(assign, response.lastattempt);
                if (userSubmission && lastModified < userSubmission.timemodified) {
                    lastModified = userSubmission.timemodified;
                }
            }

            if (response.feedback && lastModified < response.feedback.gradeddate) {
                lastModified = response.feedback.gradeddate;
            }

            return lastModified;
        }).catch(function(error) {
            if (typeof error != 'undefined' || !timemodified) {
                return 0;
            }

            return timemodified;
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModAssign.invalidateContent(moduleId, courseId);
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
        var siteId = $mmSite.getId();
        return $mmaModAssign.getAssignment(courseId, module.id, siteId).then(function(assign) {
            var promises = [];

            promises.push($mmaModAssign.invalidateAssignmentData(courseId, siteId));
            promises.push($mmaModAssign.invalidateAllSubmissionData(assign.id, siteId));
            promises.push($mmaModAssign.invalidateAssignmentUserMappingsData(assign.id, siteId));

            return $q.all(promises);
        });
    };

    /**
     * Check if an assign is downloadable.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignPrefetchHandler#isDownloadable
     * @param {Object} module    Module to check.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        return $mmaModAssign.isPrefetchEnabled();
    };

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
        return self.prefetchPackage(module, courseId, single, prefetchAssign);
    };

    /**
     * Prefetch an assign.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchAssign(module, courseId, single, siteId) {
        var userId = $mmSite.getUserId(),
            revision,
            timemod,
            promises = [];

        promises.push($mmCourse.getModuleBasicInfo(module.id, siteId));

        // Get Assignment to retrieve all its submissions.
        promises.push($mmaModAssign.getAssignment(courseId, module.id, siteId).then(function(assign) {
            var subPromises = [],
                blindMarking = assign.blindmarking && !assign.revealidentities;

            if (blindMarking) {
                subPromises.push($mmaModAssign.getAssignmentUserMappings(assign.id, false, siteId).catch(function() {
                    // Fail silently (Moodle < 2.6)
                }));
            }

            subPromises.push(prefetchSubmissions(assign, courseId, siteId, userId));

            subPromises.push($mmCourseHelper.getModuleCourseIdByInstance(assign.id, 'assign', siteId));

            // Get related submissions files and fetch them.
            subPromises.push(self.getFiles(module, courseId, siteId).then(function(files) {
                var filePromises = [];

                revision = self.getRevision(module, courseId);

                angular.forEach(files, function(file) {
                    var url = file.fileurl;
                    filePromises.push($mmFilepool.addToQueueByUrl(siteId, url, self.component, module.id, file.timemodified));
                });

                return $q.all(filePromises);
            }));

            return $q.all(subPromises);
        }));

        // Get timemodified.
        promises.push(self.getTimemodified(module, courseId, siteId).then(function(timemodified) {
            timemod = timemodified;
        }));

        return $q.all(promises).then(function() {
            // Return revision and timemodified.
            return {
                revision: revision,
                timemod: timemod
            };
        });
    }

    /**
     * Prefetch assign submissions.
     *
     * @param  {Object} assign     Assign.
     * @param  {Number} courseId   Course ID.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @param  {Number} [userId]   User ID. If not defined, current user.
     * @return {Promise}           Promise resolved when prefetched, rejected otherwise.
     */
    function prefetchSubmissions(assign, courseId, siteId, userId) {
        siteId = siteId || $mmSite.getId();
        userId = userId || $mmSite.getUserId();

        // Get submissions.
        return $mmaModAssign.getSubmissions(assign.id, siteId).then(function(data) {
            var promises = [],
                blindMarking = assign.blindmarking && !assign.revealidentities;

            if (data.canviewsubmissions) {
                // Teacher.
                // Do not send participants to getSubmissionsUserData to retrieve user profiles.
                promises.push($mmaModAssign.getSubmissionsUserData(data.submissions, courseId, assign.id, blindMarking, false, siteId)
                        .then(function(submissions) {
                    var subPromises = [];
                    angular.forEach(submissions, function(submission) {
                        subPromises.push($mmaModAssign.getSubmissionStatus(
                                assign.id, submission.submitid, !!submission.blindid, true, false, siteId).then(function(subm) {
                            return prefetchSubmission(assign, courseId, subm, siteId);
                        }));
                    });
                    return $q.all(subPromises).catch(function() {
                        // Fail silently (Moodle < 3.1)
                    });
                }));

                // Get list participants.
                promises.push($mmaModAssign.listParticipants(assign.id, 0, siteId).then(function (participants) {
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
                promises.push($mmaModAssign.getSubmissionStatus(assign.id, userId, false, true, false, siteId).then(function(subm) {
                    return prefetchSubmission(assign, courseId, subm, siteId);
                }));
            }

            promises.push($mmGroups.getActivityAllowedGroups(assign.cmid, false, siteId));

            return $q.all(promises);
        });
    }

    /**
     * Prefetch a submission.
     *
     * @param  {Object} assign     Assign.
     * @param  {Number} courseId   Course ID.
     * @param  {Object} submission Data returned by $mmaModAssign#getSubmissionStatus.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when prefetched, rejected otherwise.
     */
    function prefetchSubmission(assign, courseId, submission, siteId) {
        siteId = siteId || $mmSite.getId();

        var promises = [],
            blindMarking = assign.blindmarking && !assign.revealidentities,
            userIds = [];

        if (submission.lastattempt) {
            var userSubmission = $mmaModAssign.getSubmissionObjectFromAttempt(assign, submission.lastattempt);

            // Get IDs of the members who need to submit.
            if (!blindMarking && submission.lastattempt.submissiongroupmemberswhoneedtosubmit) {
                userIds = userIds.concat(submission.lastattempt.submissiongroupmemberswhoneedtosubmit);
            }

            if (userSubmission && userSubmission.id) {
                // Prefetch submission plugins data.
                angular.forEach(userSubmission.plugins, function(plugin) {
                    promises.push($mmaModAssignSubmissionDelegate.prefetch(assign, userSubmission, plugin, siteId));
                });

                // Get ID of the user who did the submission.
                if (userSubmission.userid) {
                    userIds.push(userSubmission.userid);
                }
            }
        }

        // Prefetch feedback.
        if (submission.feedback) {
            // Get profile and image of the grader.
            if (submission.feedback.grade && submission.feedback.grade.grader) {
                userIds.push(submission.feedback.grade.grader);
            }

            // Prefetch feedback plugins data.
            angular.forEach(submission.feedback.plugins, function(plugin) {
                promises.push($mmaModAssignFeedbackDelegate.prefetch(assign, submission, plugin, siteId));
            });
        }

        // Prefetch user profiles.
        promises.push($mmUser.prefetchProfiles(userIds, courseId, siteId));

        return $q.all(promises);
    }

    return self;
});

