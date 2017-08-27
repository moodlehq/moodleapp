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
 * Assignments service.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name $mmaModAssign
 */
.factory('$mmaModAssign', function($mmSite, $q, $mmUser, $mmSitesManager, mmaModAssignComponent, $mmFilepool, $mmComments, $mmUtil,
        $mmaModAssignSubmissionDelegate, mmaModAssignSubmissionStatusNew, mmaModAssignSubmissionStatusSubmitted, $mmText, $mmApp,
        $mmaModAssignOffline, mmaModAssignGradingStatusGraded, mmaModAssignGradingStatusNotGraded, $mmGrades,
        mmaModMarkingWorkflowStateReleased) {
    var self = {},
        gradingOfflineEnabled = {};

    /**
     * Check if the user can submit in offline. This should only be used if submissionStatus.lastattempt.cansubmit cannot
     * be used (offline usage).
     * This function doesn't check if the submission is empty, it should be checked before calling this function.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#canSubmitOffline
     * @param  {Object} assign           Assignment instance.
     * @param  {Object} submissionStatus Submission status returned by $mmaModAssign#getSubmissionStatus.
     * @return {Boolean}                 True if can submit, false otherwise.
     */
    self.canSubmitOffline = function(assign, submissionStatus) {
        if (!self.isSubmissionOpen(assign, submissionStatus)) {
            return false;
        }

        var userSubmission = submissionStatus.lastattempt.submission,
            teamSubmission = submissionStatus.lastattempt.teamsubmission;

        if (teamSubmission) {
            if (teamSubmission.status === mmaModAssignSubmissionStatusSubmitted) {
                // The assignment submission has been completed.
                return false;
            } else if (userSubmission && userSubmission.status === mmaModAssignSubmissionStatusSubmitted) {
                // The user has already clicked the submit button on the team submission.
                return false;
            } else if (assign.preventsubmissionnotingroup && !submissionStatus.lastattempt.submissiongroup) {
                return false;
            }
        } else if (userSubmission) {
            if (userSubmission.status === mmaModAssignSubmissionStatusSubmitted) {
                // The assignment submission has been completed.
                return false;
            }
        } else {
            // No valid submission or team submission.
            return false;
        }

        // Last check is that this instance allows drafts.
        return assign.submissiondrafts;
    };

    /**
     * Get cache key for assignment data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getAssignmentCacheKey(courseId) {
        return 'mmaModAssign:assignment:' + courseId;
    }

    /**
     * Get cache key for assignment user mappings data WS calls.
     *
     * @param {Number} assignmentId Assignment ID.
     * @return {String}             Cache key.
     */
    function getAssignmentUserMappingsCacheKey(assignmentId) {
        return 'mmaModAssign:usermappings:' + assignmentId;
    }

    /**
     * Get cache key for assignment submissions data WS calls.
     *
     * @param {Number}  assignId    Assignment id.
     * @return {String}             Cache key.
     */
    function getSubmissionsCacheKey(assignId) {
        return 'mmaModAssign:submissions:' + assignId;
    }

    /**
     * Get cache key for assignment list participants data WS calls.
     *
     * @param {Number}  assignId    Assignment id.
     * @param {Number}  groupId     Group id.
     * @return {String}             Cache key.
     */
    function listParticipantsCacheKey(assignId, groupId) {
        return listParticipantsPrefixCacheKey(assignId) + ':' + groupId;
    }

    /**
     * Get prefix cache key for assignment list participants data WS calls.
     *
     * @param {Number}  assignId    Assignment id.
     * @return {String}             Cache key.
     */
    function listParticipantsPrefixCacheKey(assignId) {
        return 'mmaModAssign:participants:' + assignId;
    }

    /**
     * Get cache key for get submission status data WS calls.
     *
     * @param {Number}  assignId   Assignment instance id.
     * @param {Number}  [userId]   User id (empty for current user).
     * @param {Number}  [isBlind]  If blind marking is enabled or not.
     * @return {String}         Cache key.
     */
    function getSubmissionStatusCacheKey(assignId, userId, isBlind) {
        if (!userId) {
            isBlind = 0;
            userId = $mmSite.getUserId();
        }
        isBlind = isBlind ? 1 : 0;
        return getSubmissionsCacheKey(assignId) + ':' + userId + ':' + isBlind;
    }

    /**
     * Get an assigment with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {String} siteId   Site ID.
     * @param  {Number} courseId Course ID.
     * @param  {String} key      Name of the property to check.
     * @param  {Mixed} value     Value to search.
     * @return {Promise}         Promise resolved when the assignment is retrieved.
     */
    function getAssignment(siteId, courseId, key, value) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    'courseids': [courseId]
                },
                preSets = {
                    cacheKey: getAssignmentCacheKey(courseId)
                };

            return site.read('mod_assign_get_assignments', params, preSets).then(function(response) {
                if (response.courses && response.courses.length) {
                    var assignments = response.courses[0].assignments;
                    for (var i = 0; i < assignments.length; i++) {
                        if (assignments[i][key] == value) {
                            return assignments[i];
                        }
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get an assignment by course module ID.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getAssignment
     * @param {Number} courseId Course ID the assignment belongs to.
     * @param {Number} cmId     Assignment module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the assignment.
     */
    self.getAssignment = function(courseId, cmId, siteId) {
        return getAssignment(siteId, courseId, 'cmid', cmId);
    };

    /**
     * Get an assignment by instance ID.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getAssignmentById
     * @param {Number} courseId Course ID the assignment belongs to.
     * @param {Number} cmId     Assignment instance ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the assignment.
     */
    self.getAssignmentById = function(courseId, id, siteId) {
        return getAssignment(siteId, courseId, 'id', id);
    };

    /**
     * Get an assignment user mapping for blind marking.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getAssignmentUserMappings
     * @param {Number} assignmentId Assignment Id.
     * @param {Number} userId       User Id to be blinded.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the user blind id.
     */
    self.getAssignmentUserMappings = function(assignmentId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    "assignmentids": [assignmentId]
                },
                preSets = {
                    cacheKey: getAssignmentUserMappingsCacheKey(assignmentId)
                };

            return site.read('mod_assign_get_user_mappings', params, preSets).then(function(response) {
                if (userId && userId > 0 && response.assignments && response.assignments.length) {
                    var assignment = response.assignments[0];
                    if (assignment.assignmentid == assignmentId) {
                        var mappings = assignment.mappings;
                        for (var i = 0; i < mappings.length; i++) {
                            if (mappings[i].userid == userId) {
                                return mappings[i].id;
                            }
                        }
                    }
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get the submission object from an attempt.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionObjectFromAttempt
     * @param  {Object} assign  Assign.
     * @param  {Object} attempt Attempt.
     * @return {Object}         Submission object.
     */
    self.getSubmissionObjectFromAttempt = function(assign, attempt) {
        return assign.teamsubmission ? attempt.teamsubmission : attempt.submission;
    };

    /**
     * Get attachments of a submission Submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionPluginAttachments
     * @param {Object} submissionPlugin Submission Plugin.
     * @return {Object[]}               Submission Pluginattachments.
     */
    self.getSubmissionPluginAttachments = function(submissionPlugin) {
        var files = [];
        if (submissionPlugin.fileareas) {
            angular.forEach(submissionPlugin.fileareas, function(filearea) {
                angular.forEach(filearea.files, function(file) {
                    var filename;
                    if (file.filename) {
                        filename = file.filename;
                    } else {
                        // We don't have filename, extract it from the path.
                        filename = file.filepath[0] == '/' ? file.filepath.substr(1) : file.filepath;
                    }

                    files.push({
                        'filename' : filename,
                        'fileurl': file.fileurl
                    });
                });
            });
        }
        return files;
    };

    /**
     * Get text of a submission plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionText
     * @param  {Object} submissionPlugin Submission Plugin.
     * @param  {Boolean} [keepUrls]      True if it should keep original URLs, false if they should be replaced.
     * @return {String}                  Submission text.
     */
    self.getSubmissionPluginText = function(submissionPlugin, keepUrls) {
        var text = '';
        if (submissionPlugin.editorfields) {
            angular.forEach(submissionPlugin.editorfields, function(field) {
                text += field.text;
            });

            if (!keepUrls && submissionPlugin.fileareas && submissionPlugin.fileareas[0]) {
                text = $mmText.replacePluginfileUrls(text, submissionPlugin.fileareas[0].files);
            }
        }

        return text;
    };

    /**
     * Get an assignment submissions.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissions
     * @param {Number}  assignId    Assignment id.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with:
     *                                    - canviewsubmissions: True if user can view submissions, false otherwise.
     *                                    - submissions: Array of submissions.
     */
    self.getSubmissions = function(assignId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    "assignmentids": [assignId]
                },
                preSets = {
                    cacheKey: getSubmissionsCacheKey(assignId)
                };

            return site.read('mod_assign_get_submissions', params, preSets).then(function(response) {
                // Check if we can view submissions, with enough permissions.
                if (response.warnings.length > 0 && response.warnings[0].warningcode == 1) {
                    return {canviewsubmissions: false};
                }

                if (response.assignments && response.assignments.length) {
                    return {
                        canviewsubmissions: true,
                        submissions: response.assignments[0].submissions
                    };
                }

                return $q.reject();
            });
        });
    };

    // Convenience function to find participant on a list.
    function getParticipantFromUserId(participants, id) {
        if (participants) {
            for (var x in participants) {
                if (participants[x].id == id) {
                    var participant = participants[x];
                    delete participants[x];
                    return participant;
                }
            }
        }
        return false;
    }

    /**
     * Get user data for submissions since they only have userid.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionsUserData
     * @param {Object[]} submissions Submissions to get the data for.
     * @param {Number}   courseId       ID of the course the submissions belong to.
     * @param {Number}   assignId       ID of the assignment the submissions belong to.
     * @param {Boolean}  blind          The user data need to be blinded.
     * @param {Object[]} [participants] List of participants in the assignment.
     * @return {Promise}                Promise always resolved. Resolve param is the formatted submissions.
     */
    self.getSubmissionsUserData = function(submissions, courseId, assignId, blind, participants) {
        var promises = [],
            subs = [];

        angular.forEach(submissions, function(submission) {
            submission.submitid = submission.userid > 0 ? submission.userid : submission.blindid;
            if (submission.submitid <= 0) {
                return;
            }

            var participant = getParticipantFromUserId(participants, submission.submitid);
            if (participants && !participant) {
                // Avoid permission denied error. Participant not found on list.
                return;
            }

            if (participant) {
                if (!blind) {
                    submission.userfullname = participant.fullname;
                    submission.userprofileimageurl = participant.profileimageurl;
                }

                submission.manyGroups = !!participant.groups && participant.groups.length > 1;
                if (participant.groupname) {
                    submission.groupid = participant.groupid;
                    submission.groupname = participant.groupname;
                }
            }

            var promise = $q.when();
            if (submission.userid > 0) {
                if (blind) {
                    // Blind but not blinded! (Moodle < 3.1.1, 3.2)
                    delete submission.userid;

                    promise = self.getAssignmentUserMappings(assignId, submission.submitid).then(function(blindId) {
                        submission.blindid = blindId;
                    }).catch(function() {
                        // Error mapping user, fail silently (Moodle < 2.6)
                    });
                } else if (!participant) {
                    // No blind, no participants.
                    promise = $mmUser.getProfile(submission.userid, courseId, true).then(function(user) {
                        submission.userfullname = user.fullname;
                        submission.userprofileimageurl = user.profileimageurl;
                    }).catch(function() {
                        // Error getting profile, resolve promise without adding any extra data.
                    });
                }
            }

            promises.push(promise.then(function() {
                // Add to the list.
                if (submission.userfullname || submission.blindid) {
                    subs.push(submission);
                }
            }));
        });

        return $q.all(promises).then(function() {
            if (participants) {
                angular.forEach(participants, function(participant) {
                    var submission = {
                        submitid: participant.id
                    };

                    if (!blind) {
                        submission.userid = participant.id;
                        submission.userfullname = participant.fullname;
                        submission.userprofileimageurl = participant.profileimageurl;
                    } else {
                        submission.blindid = participant.id;
                    }

                    if (participant.groupname) {
                        submission.groupid = participant.groupid;
                        submission.groupname = participant.groupname;
                    }
                    submission.status = participant.submitted ? mmaModAssignSubmissionStatusSubmitted : mmaModAssignSubmissionStatusNew;
                    subs.push(submission);
                });
            }
            return subs;
        });
    };

    /**
     * Given a list of plugins, returns the plugin names that aren't supported for editing.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModAssign#getUnsupportedEditPlugins
     * @param  {Object[]} plugins Plugins to check.
     * @return {Promise}          Promise resolved with unsupported plugin names.
     */
    self.getUnsupportedEditPlugins = function(plugins) {
        var notSupported = [],
            promises = [];

        angular.forEach(plugins, function(plugin) {
            promises.push($q.when($mmaModAssignSubmissionDelegate.isPluginSupportedForEdit(plugin.type)).then(function(enabled) {
                if (!enabled) {
                    notSupported.push(plugin.name);
                }
            }));
        });

        return $q.all(promises).then(function() {
            return notSupported;
        });
    };

    /**
     * List the participants for a single assignment, with some summary info about their submissions.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#listParticipants
     * @param {Number}  assignId    Assignment id.
     * @param {Number}  groupId     Group id.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the list of participants and summary of submissions.
     */
    self.listParticipants = function(assignId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (!site.wsAvailable('mod_assign_list_participants')) {
                // Silently fail if is not available. (needs Moodle version >= 3.2)
                return $q.reject();
            }

            groupId = 0;
            var params = {
                    "assignid": assignId,
                    "groupid": groupId,
                    "filter": "",
                },
                preSets = {
                    cacheKey: listParticipantsCacheKey(assignId, groupId)
                };

            return site.read('mod_assign_list_participants', params, preSets);
        });
    };


    /**
     * Get information about an assignment submission status for a given user.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionStatus
     * @param {Number}  assignId      Assignment instance id.
     * @param {Number}  [userId]      User id (empty for current user).
     * @param {Number}  [isBlind]     If blind marking is enabled or not.
     * @param {Number}  [filter=true] True to filter WS response and rewrite URLs, false otherwise.
     * @param {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {Number}  [siteId]      Site id (empty for current site).
     * @return {Promise}              Promise always resolved with the user submission status.
     */
    self.getSubmissionStatus = function(assignId, userId, isBlind, filter, ignoreCache, siteId) {
        if (typeof filter == 'undefined') {
            filter = true;
        }

        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (!site.wsAvailable('mod_assign_get_submission_status')) {
                // Silently fail if is not available. (needs Moodle version >= 3.1)
                return $q.reject();
            }

            userId = userId || 0;

            var params = {
                    assignid: assignId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getSubmissionStatusCacheKey(assignId, userId, isBlind),
                    getCacheUsingCacheKey: true, // We use the cache key to take isBlind into account.
                    filter: filter,
                    rewriteurls: filter
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            if (!filter) {
                // Don't cache when getting text without filters.
                // @todo Change this to support offline editing.
                preSets.saveToCache = 0;
            }

            return site.read('mod_assign_get_submission_status', params, preSets);
        });
    };

    /**
     * Invalidates assignment data WS calls.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#invalidateAssignmentData
     * @param {Number} courseId Course ID.
     * @param {Number}  [siteId]   Site id (empty for current site).
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateAssignmentData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getAssignmentCacheKey(courseId));
        });
    };

    /**
     * Invalidates assignment user mappings data WS calls.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#invalidateAssignmentUserMappingsData
     * @param {Number} assignmentId Assignment ID.
     * @param {Number}  [siteId]    Site id (empty for current site).
     * @return {Promise}            Promise resolved when the data is invalidated.
     */
    self.invalidateAssignmentUserMappingsData = function(assignmentId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getAssignmentUserMappingsCacheKey(assignmentId));
        });
    };

    /**
     * Invalidates assignment submissions data WS calls.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#invalidateSubmissionData
     * @param {Number}  assignId   Assignment instance id.
     * @param {Number}  [siteId]   Site id (empty for current site).
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubmissionData = function(assignId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getSubmissionsCacheKey(assignId));
        });
    };

    /**
     * Invalidates All submission status data.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#invalidateAllSubmissionData
     * @param {Number}  assignId   Assignment instance id.
     * @param {Number}  [siteId]   Site id (empty for current site).
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateAllSubmissionData = function(assignId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getSubmissionsCacheKey(assignId));
        });
    };

    /**
     * Invalidates submission status data.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#invalidateSubmissionStatusData
     * @param {Number}  assignId   Assignment instance id.
     * @param {Number}  [userId]   User id (empty for current user).
     * @param {Number}  [isBlind]  If blind marking is enabled or not.
     * @param {Number}  [siteId]   Site id (empty for current site).
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubmissionStatusData = function(assignId, userId, isBlind, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getSubmissionStatusCacheKey(assignId, userId, isBlind));
        });
    };

    /**
     * Invalidates assignment participants data.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#invalidateListParticipantsData
     * @param {Number}  assignId   Assignment instance id.
     * @param {Number}  [siteId]   Site id (empty for current site).
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateListParticipantsData = function(assignId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(listParticipantsPrefixCacheKey(assignId));
        });
    };

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use $mmaModAssign#invalidateFiles.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return self.getAssignment(courseId, moduleId, siteId).then(function(assign) {
            var ps = [];
            // Do not invalidate assignment data before getting assignment info, we need it!
            ps.push(self.invalidateAllSubmissionData(assign.id, siteId));
            ps.push(self.invalidateAssignmentUserMappingsData(assign.id, siteId));
            ps.push(self.invalidateListParticipantsData(assign.id, siteId));
            ps.push($mmComments.invalidateCommentsByInstance('module', assign.id, siteId));

            return $q.all(ps);
        }).finally(function() {
            var ps = [];
            ps.push(self.invalidateAssignmentData(courseId, siteId));
            ps.push($mmGrades.invalidateGradeCourseItems(courseId));

            return $q.all(ps);
        });
    };

    /**
     * Invalidate the prefetched files.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#invalidateFiles
     * @param {Number} moduleId The module ID.
     * @return {Promise}        Promise resolved when the files are invalidated.
     */
     self.invalidateFiles = function(moduleId) {
         return $mmFilepool.invalidateFilesByComponent($mmSite.getId(), mmaModAssignComponent, moduleId);
     };

    /**
     * Check if assignments plugin is enabled in a certain site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('mod_assign_get_assignments') && site.wsAvailable('mod_assign_get_submissions');
        });
    };

    /**
     * Check if assignments grading is enabled in a certain site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#isGradingEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if grading is enabled, rejected or resolved with false otherwise.
     */
    self.isGradingEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('mod_assign_submit_grading_form') || site.wsAvailable('mod_assign_save_grade');
        });
    };

    /**
     * Outcomes only can be edited if mod_assign_submit_grading_form is avalaible.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#isOutcomesEditEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if outcomes edit is enabled, rejected or resolved with false otherwise.
     */
    self.isOutcomesEditEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('mod_assign_submit_grading_form');
        });
    };

    /**
     * Check if assignments plugin prefetch is enabled in a certain site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#isPrefetchEnabled
     * @return {Boolean}         if plugin prefetch is enabled.
     */
    self.isPrefetchEnabled = function() {
        return $mmSite.wsAvailable('mod_assign_get_assignments') && $mmSite.wsAvailable('mod_assign_get_submissions') &&
            $mmSite.wsAvailable('mod_assign_get_submission_status');
    };

    /**
     * Check if save and submit assignments is enabled in site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#isSaveAndSubmitSupported
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, false otherwise.
     */
    self.isSaveAndSubmitSupported = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            // Even if save & submit WS were introduced in 2.6, we'll also check get_submission_status WS
            // to make sure we have all the WS to provide the whole submit experience.
            return site.wsAvailable('mod_assign_get_submission_status') && site.wsAvailable('mod_assign_save_submission') &&
                   site.wsAvailable('mod_assign_submit_for_grading');
        }).catch(function() {
            return false;
        });
    };

    /**
     * Check if a submission is open. This function is based on Moodle's submissions_open.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#isSubmissionOpen
     * @param  {Object} assign           Assignment instance.
     * @param  {Object} submissionStatus Submission status returned by $mmaModAssign#getSubmissionStatus.
     * @return {Boolean}                 True if open, false otherwise.
     */
    self.isSubmissionOpen = function(assign, submissionStatus) {
        if (!assign || !submissionStatus) {
            return false;
        }

        var time = $mmUtil.timestamp(),
            dateOpen = true,
            finalDate = false,
            lastAttempt = submissionStatus.lastattempt,
            submission = self.getSubmissionObjectFromAttempt(assign, lastAttempt);

        if (assign.cutoffdate) {
            finalDate = assign.cutoffdate;
        }

        if (lastAttempt && lastAttempt.locked) {
            return false;
        }

        // User extensions.
        if (finalDate) {
            if (lastAttempt && lastAttempt.extensionduedate) {
                // Extension can be before cut off date.
                if (lastAttempt.extensionduedate > finalDate) {
                    finalDate = lastAttempt.extensionduedate;
                }
            }
        }

        if (finalDate) {
            dateOpen = assign.allowsubmissionsfromdate <= time && time <= finalDate;
        } else {
            dateOpen = assign.allowsubmissionsfromdate <= time;
        }

        if (!dateOpen) {
            return false;
        }

        if (submission) {
            if (assign.submissiondrafts && submission.status == mmaModAssignSubmissionStatusSubmitted) {
                // Drafts are tracked and the student has submitted the assignment.
                return false;
            }
        }

        return true;
    };

    /**
     * Report an assignment submission as being viewed.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#logSubmissionView
     * @param {Number} assignId     Assignment ID.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logSubmissionView = function(assignId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                assignid: assignId
            };
            return site.write('mod_assign_view_submission_status', params);
        });
    };

    /**
     * Report an assignment grading table is being viewed.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#logGradingView
     * @param {Number} assignId     Assignment ID.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logGradingView = function(assignId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                assignid: assignId
            };
            return site.write('mod_assign_view_grading_table', params);
        });
    };

    /**
     * Report a assign as being viewed.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#logView
     * @param {Number} assignId     Assignment ID.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(assignId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                assignid: assignId
            };
            return site.write('mod_assign_view_assign', params);
        });
    };

    /**
     * Returns the badge class for a given status name
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionStatusClass
     * @param {Number}  status    Status name
     * @return {String}           The badge class name.
     */
    self.getSubmissionStatusClass = function(status) {
        switch (status) {
            case 'submitted':
                return 'badge-balanced';
            case 'draft':
                return 'badge-positive';
            case 'new':
            case 'noattempt':
            case 'noonlinesubmissions':
            case 'nosubmission':
                return 'badge-assertive';
        }
        return "";
    };

    /**
     * Returns the class for a given grading status name.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionGradingStatusClass
     * @param {Number}  status    Grading Status name
     * @return {String}           The class name.
     */
    self.getSubmissionGradingStatusClass = function(status) {
        if (!status) {
            return '';
        }
        if (status == mmaModAssignGradingStatusGraded || status == mmaModMarkingWorkflowStateReleased) {
            return 'badge-balanced';
        }
        return 'badge-assertive';
    };

    /**
     * Returns the translation id for a given grading status name.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionGradingStatusTranslationId
     * @param {Number}  status    Grading Status name
     * @return {String}           The status translation identifier.
     */
    self.getSubmissionGradingStatusTranslationId = function(status) {
        if (!status) {
            return false;
        }
        if (status == mmaModAssignGradingStatusGraded || status == mmaModAssignGradingStatusNotGraded) {
            return 'mma.mod_assign.' + status;
        }
        return 'mma.mod_assign.markingworkflowstate' + status;
    };

    /**
     * Returns if a submissions needs to be graded.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#needsSubmissionToBeGraded
     * @param {Object}  submission    submission
     * @param {Number}  assignId      Assignment Id of the submission.
     * @return {Boolean}              If needs to be graded or not.
     */
    self.needsSubmissionToBeGraded = function(submission, assignId) {
        if (!submission.gradingstatus) {
            // This should not happen, but it's better to show rather than not showing any of the submissions.
            return $q.when(true);
        }

        if (submission.gradingstatus != mmaModAssignGradingStatusGraded &&
                submission.gradingstatus != mmaModMarkingWorkflowStateReleased) {
            // Not graded.
            return $q.when(true);
        }

        // We need more data to decide that.
        return self.getSubmissionStatus(assignId, submission.submitid, submission.blindid).then(function(response) {
            if (!response.feedback || !response.feedback.gradeddate) {
                // Not graded.
                return true;
            }
            // Submitted after grading?
            return response.feedback.gradeddate < submission.timemodified;
        });
    };

    /**
     * Save current user submission for a certain assignment.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#saveSubmission
     * @param  {Number} assignmentId  Assign ID.
     * @param  {Number} courseId      Course ID the assign belongs to.
     * @param  {Object} pluginData    Data to save.
     * @param  {Boolean} allowOffline True to allow offline usage.
     * @param  {Number} timemodified  The time the submission was last modified in online.
     * @param  {Boolean} allowsDrafts True if assignment allows submission drafts, false otherwise.
     * @param  {Number} [userId]      User ID. If not defined, site's current user.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved with true if sent to server, resolved with false if stored in offline.
     */
    self.saveSubmission = function(assignmentId, courseId, pluginData, allowOffline, timemodified, allowsDrafts, userId, siteId) {
        if (allowOffline && !$mmApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        siteId = siteId || $mmSite.getId();

        // If there's already a submission to be sent to the server, discard it first.
        return $mmaModAssignOffline.deleteSubmission(assignmentId, userId, siteId).then(function() {
            return self.saveSubmissionOnline(assignmentId, pluginData, siteId).then(function() {
                return true;
            }).catch(function(error) {
                if (allowOffline && error && !error.wserror) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error or offline not supported, reject.
                    return $q.reject(error.error);
                }
            });
        });

        // Store the submission to be synchronized later.
        function storeOffline() {
            return $mmaModAssignOffline.saveSubmission(assignmentId, courseId, pluginData,
                    timemodified, !allowsDrafts, userId, siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Save current user submission for a certain assignment. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#saveSubmissionOnline
     * @param  {Number} assignmentId Assign ID.
     * @param  {Object} pluginData   Data to save.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when saved, rejected otherwise.
     */
    self.saveSubmissionOnline = function(assignmentId, pluginData, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                assignmentid: assignmentId,
                plugindata: pluginData
            };

            return site.write('mod_assign_save_submission', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function(warnings) {
                if (warnings && warnings.length) {
                    // The WebService returned warnings, reject.
                    return $q.reject({
                        wserror: true,
                        error: warnings[0].message
                    });
                }
            });
        });
    };

    /**
     * Submit the current user assignment for grading.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#submitForGrading
     * @param  {Number} assignmentId     Assign ID.
     * @param  {Number} courseId         Course ID the assign belongs to.
     * @param  {Boolean} acceptStatement True if submission statement is accepted, false otherwise.
     * @param  {Number} timemodified     The time the submission was last modified in online.
     * @param  {Boolean} forceOffline    True to always mark it in offline.
     * @param  {String} [siteId]         Site ID. If not defined, current site.
     * @return {Promise}                 Promise resolved with true if sent to server, resolved with false if stored in offline.
     */
    self.submitForGrading = function(assignmentId, courseId, acceptStatement, timemodified, forceOffline, siteId) {
        if (forceOffline || !$mmApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        siteId = siteId || $mmSite.getId();

        // If there's already a submission to be sent to the server, discard it first.
        return $mmaModAssignOffline.deleteSubmission(assignmentId, undefined, siteId).then(function() {
            return self.submitForGradingOnline(assignmentId, acceptStatement, siteId).then(function() {
                return true;
            }).catch(function(error) {
                if (error && !error.wserror) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error or offline not supported, reject.
                    return $q.reject(error.error);
                }
            });
        });

        // Store the submission to be synchronized later.
        function storeOffline() {
            return $mmaModAssignOffline.markSubmitted(
                        assignmentId, courseId, true, acceptStatement, timemodified, undefined, siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Submit the current user assignment for grading. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#submitForGradingOnline
     * @param  {Number} assignmentId     Assign ID.
     * @param  {Boolean} acceptStatement True if submission statement is accepted, false otherwise.
     * @param  {String} [siteId]         Site ID. If not defined, current site.
     * @return {Promise}                 Promise resolved when submitted, rejected otherwise.
     */
    self.submitForGradingOnline = function(assignmentId, acceptStatement, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                assignmentid: assignmentId,
                acceptsubmissionstatement: acceptStatement ? 1 : 0
            };
            return site.write('mod_assign_submit_for_grading', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function(warnings) {
                if (warnings && warnings.length) {
                    // The WebService returned warnings, reject.
                    return $q.reject({
                        wserror: true,
                        error: warnings[0].message
                    });
                }
            });
        });
    };

    // Convenience function to check if grading offline is enabled.
    function isGradingOfflineEnabled(siteId) {
        if (typeof gradingOfflineEnabled[siteId] != 'undefined') {
            return $q.when(gradingOfflineEnabled[siteId]);
        }

        return $mmGrades.isGradeItemsAvalaible(siteId).then(function(enabled) {
            gradingOfflineEnabled[siteId] = enabled;
            return enabled;
        });
    }

    /**
     * Submit the grading for the current user and assignment. It will use old or new WS depending on availability.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#submitGradingForm
     * @param  {Number}  assignmentId   Assign ID.
     * @param  {Number}  userId         User ID.
     * @param  {Number}  grade          Grade to submit.
     * @param  {Number}  attemptNumber  Number of the attempt number being graded.
     * @param  {Number}  addAttempt     Admit the user to attempt again.
     * @param  {String}  workflowState  Next workflow State.
     * @param  {Boolean} applyToAll     If it's a team submission, if the grade applies to all group members.
     * @param  {Object}  outcomes       Object including all outcomes values. If empty, any of them will be sent.
     * @param  {Object}  pluginData     Feedback plugin data to save.
     * @param  {Number}  courseId       Course ID the assign belongs to.
     * @param  {String}  [siteId]       Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with true if sent to server, resolved with false if stored offline.
     */
    self.submitGradingForm = function(assignmentId, userId, grade, attemptNumber, addAttempt, workflowState, applyToAll, outcomes,
            pluginData, courseId, siteId) {

        siteId = siteId || $mmSite.getId();

        // Grading offline is only allowed if WS of grade items is enabled to avoid inconsistency.
        return isGradingOfflineEnabled(siteId).then(function (enabled) {
            if (!enabled) {
                return self.submitGradingFormOnline(assignmentId, userId, grade, attemptNumber, addAttempt, workflowState,
                    applyToAll, outcomes, pluginData, siteId);
            }

            if (!$mmApp.isOnline()) {
                // App is offline, store the action.
                return storeOffline();
            }

            // If there's already a grade to be sent to the server, discard it first.
            return $mmaModAssignOffline.deleteSubmissionGrade(assignmentId, userId, siteId).then(function() {
                return self.submitGradingFormOnline(assignmentId, userId, grade, attemptNumber, addAttempt, workflowState, applyToAll,
                        outcomes, pluginData, siteId).then(function() {
                    return true;
                }).catch(function(error) {
                    if (error && !error.wserror) {
                        // Couldn't connect to server, store in offline.
                        return storeOffline();
                    } else {
                        // The WebService has thrown an error or offline not supported, reject.
                        return $q.reject(error.error);
                    }
                });
            });
        });

        // Store the grading to be synchronized later.
        function storeOffline() {
            return $mmaModAssignOffline.submitGradingForm(assignmentId, userId, grade, attemptNumber, addAttempt, workflowState,
                    applyToAll, outcomes, pluginData, courseId, siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Submit the grading for the current user and assignment. It will use old or new WS depending on availability.
     * It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#submitGradingFormOnline
     * @param  {Number}  assignmentId   Assign ID.
     * @param  {Number}  userId         User ID.
     * @param  {Number}  grade          Grade to submit.
     * @param  {Number}  attemptNumber  Number of the attempt number being graded.
     * @param  {Number}  addAttempt     Admit the user to attempt again.
     * @param  {String}  workflowState  Next workflow State.
     * @param  {Boolean} applyToAll     If it's a team submission, if the grade applies to all group members.
     * @param  {Object}  outcomes       Object including all outcomes values. If empty, any of them will be sent.
     * @param  {Object}  pluginData     Feedback plugin data to save.
     * @param  {String}  [siteId]       Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when submitted, rejected otherwise.
     */
    self.submitGradingFormOnline = function(assignmentId, userId, grade, attemptNumber, addAttempt, workflowState, applyToAll,
            outcomes, pluginData, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (site.wsAvailable('mod_assign_submit_grading_form')) {
                return submitGradingForm(assignmentId, userId, grade, attemptNumber, addAttempt, workflowState, applyToAll,
                    outcomes, pluginData, site);
            } else if(site.wsAvailable('mod_assign_save_grade')) {
                return saveGrade(assignmentId, userId, grade, attemptNumber, addAttempt, workflowState, applyToAll, pluginData,
                    site);
            } else {
                return $q.reject();
            }
        });
    };

    // Legacy grading WS for Moodle < 3.2 when mod_assign_submit_grading_form is not avalaible.
    // See params on $mmaModAssign#submitGradingForm
    // It does not have outcomes support.
    function saveGrade(assignmentId, userId, grade, attemptNumber, addAttempt, workflowState, applyToAll, pluginData, site) {
        var params = {
                assignmentid: assignmentId,
                userid: userId ? userId : site.getUserId(),
                grade: grade,
                attemptnumber: attemptNumber,
                addattempt: addAttempt ? 1 : 0,
                workflowstate: workflowState,
                applytoall: applyToAll ? 1 : 0,
                plugindata: pluginData
            },
            preSets = {
                responseExpected: false
            };

        return site.write('mod_assign_save_grade', params, preSets).catch(function(error) {
            return $q.reject({
                error: error,
                wserror: $mmUtil.isWebServiceError(error)
            });
        });
    }

    // New grading WS for Moodle >= 3.2.
    // See params on $mmaModAssign#submitGradingForm
    function submitGradingForm(assignmentId, userId, grade, attemptNumber, addAttempt, workflowState, applyToAll, outcomes,
            pluginData, site) {
        var jsondata, serialized, params;

        jsondata = {
                grade: grade,
                attemptnumber: attemptNumber,
                addattempt: addAttempt ? 1 : 0,
                workflowstate: workflowState,
                applytoall: applyToAll ? 1 : 0
            };

        angular.forEach(outcomes, function(outcome, index) {
            jsondata['outcome_' + index + '[' + userId + ']'] = outcome;
        });

        angular.forEach(pluginData, function(data, index) {
            jsondata[index] = data;
        });

        serialized = $mmUtil.param(jsondata, true);

        params = {
            assignmentid: assignmentId,
            userid: userId || site.getUserId(),
            jsonformdata: JSON.stringify(serialized)
        };

        return site.write('mod_assign_submit_grading_form', params).catch(function(error) {
            return $q.reject({
                error: error,
                wserror: $mmUtil.isWebServiceError(error)
            });
        }).then(function(warnings) {
            if (warnings && warnings.length) {
                // The WebService returned warnings, reject.
                return $q.reject({
                    wserror: true,
                    error: warnings[0].message
                });
            }
        });
    }

    return self;
});
