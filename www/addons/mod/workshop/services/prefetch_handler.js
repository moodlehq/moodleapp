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

angular.module('mm.addons.mod_workshop')

/**
 * Mod workshop prefetch handler.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc service
 * @name $mmaModWorkshopPrefetchHandler
 */
.factory('$mmaModWorkshopPrefetchHandler', function($mmaModWorkshop, mmaModWorkshopComponent, $mmFilepool, $q, $mmPrefetchFactory,
        $mmSite, $mmGroups, $mmCourse, $mmaModWorkshopHelper, $mmSitesManager, $mmUser, $mmUtil) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModWorkshopComponent);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$|^completion|^gradeitems$|^outcomes$|^submissions$|^assessments$|^assessmentgrades$|^usersubmissions$|^userassessments$|^userassessmentgrades$|^userassessmentgrades$/;

    /**
     * Download the module.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Workshop cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#getFiles
     * @param  {Object} module    Module to get the files.
     * @param  {Number} courseId  Course ID the module belongs to.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the list of files.
     */
    self.getFiles = function(module, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return getWorkshopInfoHelper(module, courseId, true, undefined, undefined, siteId).then(function(info) {
            return info.files;
        });
    };

    /**
     * Helper function to get all workshop info just once.
     *
     * @param  {Object}  module         Module to get the files.
     * @param  {Number}  courseId       Course ID the module belongs to.
     * @param  {Boolean} [omitFail]     True to always return even if fails. Default false.
     * @param  {Boolean} [forceCache]   True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean} [ignoreCache]  True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String}  siteId         Site ID.
     * @return {Promise}                Promise resolved with the info fetched.
     */
    function getWorkshopInfoHelper(module, courseId, omitFail, forceCache, ignoreCache, siteId) {
        var workshop,
            groups = [],
            files = [],
            access;

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var userId = site.getUserId();

            return $mmaModWorkshop.getWorkshop(courseId, module.id, siteId, forceCache).then(function(data) {
                files = self.getIntroFilesFromInstance(module, data);
                files = files.concat(data.instructauthorsfiles).concat(data.instructreviewersfiles);

                workshop = data;
                return $mmaModWorkshop.getWorkshopAccessInformation(workshop.id, false, true, siteId).then(function (accessData) {
                    access = accessData;
                    if (access.canviewallsubmissions) {
                        return $mmGroups.getActivityGroupInfo(module.id, false, undefined, siteId).then(function(groupInfo) {
                            if (!groupInfo.groups || groupInfo.groups.length == 0) {
                                groupInfo.groups = [{id: 0}];
                            }
                            groups = groupInfo.groups;
                        });
                    }
                });
            }).then(function() {
                return $mmaModWorkshop.getUserPlanPhases(workshop.id, false, true, siteId).then(function (phases) {
                    // Get submission phase info.
                    var submissionPhase = phases[$mmaModWorkshop.PHASE_SUBMISSION],
                        canSubmit = $mmaModWorkshopHelper.canSubmit(workshop, access, submissionPhase.tasks),
                        canAssess = $mmaModWorkshopHelper.canAssess(workshop, access),
                        promises = [];

                    if (canSubmit) {
                        promises.push($mmaModWorkshopHelper.getUserSubmission(workshop.id, userId).then(function(submission) {
                            if (submission) {
                                files = files.concat(submission.contentfiles).concat(submission.attachmentfiles);
                            }
                        }));
                    }

                    if (access.canviewallsubmissions && workshop.phase >= $mmaModWorkshop.PHASE_SUBMISSION) {
                        promises.push($mmaModWorkshop.getSubmissions(workshop.id).then(function(submissions) {
                            var promises2 = [];
                            angular.forEach(submissions, function(submission) {
                                files = files.concat(submission.contentfiles).concat(submission.attachmentfiles);
                                promises2.push($mmaModWorkshop.getSubmissionAssessments(workshop.id, submission.id).then(function(assessments) {
                                    angular.forEach(assessments, function(assessment) {
                                        files = files.concat(assessment.feedbackattachmentfiles).concat(assessment.feedbackcontentfiles);
                                    });
                                }));
                            });
                            return $q.all(promises2);
                        }));
                    }

                    // Get assessment files.
                    if (workshop.phase >= $mmaModWorkshop.PHASE_ASSESSMENT && canAssess) {
                        promises.push($mmaModWorkshopHelper.getReviewerAssessments(workshop.id).then(function(assessments) {
                            angular.forEach(assessments, function(assessment) {
                                files = files.concat(assessment.feedbackattachmentfiles).concat(assessment.feedbackcontentfiles);
                            });
                        }));
                    }

                    return $q.all(promises);
                });
            });
        }).then(function() {
            return {
                workshop: workshop,
                groups: groups,
                files: $mmUtil.filterUndefinedItemsInArray(files)
            };
        }).catch(function(message) {
            if (omitFail) {
                // Any error, return the info we have.
                return {
                    workshop: workshop,
                    groups: groups,
                    files: $mmUtil.filterUndefinedItemsInArray(files)
                };
            }
            return $q.reject(message);
        });
    }

    /**
     * Returns workshop intro files.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#getIntroFiles
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID.
     * @return {Promise}         Promise resolved with list of intro files.
     */
    self.getIntroFiles = function(module, courseId) {
        return $mmaModWorkshop.getWorkshop(courseId, module.id).catch(function() {
            // Not found, return undefined so module description is used.
        }).then(function(workshop) {
            return self.getIntroFilesFromInstance(module, workshop);
        });
    };

    /**
     * Get revision of a data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Number}         Promise resolved with revision.
     */
    self.getRevision = function(module, courseId) {
        // Data will always be controlled using the getCourseUpdates.
        return 0;
    };

    /**
     * Get timemodified of a workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#getTimemodified
     * @param {Object} module    Module to get the timemodified.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        // Return always 0 because calculation requires too many WS calls.
        // Return a fake timemodified since it won't be used. This will be improved in the future.
        return 0;
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModWorkshop.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModWorkshop.invalidateWorkshopData(courseId);
    };

    /**
     * Check if a workshop is downloadable.
     * A workshop isn't downloadable if it's not open yet.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#isDownloadable
     * @param {Object} module    Module to check.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        return $mmaModWorkshop.getWorkshop(courseId, module.id, false, true).then(function(workshop) {
            return $mmaModWorkshop.getWorkshopAccessInformation(workshop.id).then(function(accessData) {
                // Check if workshop is setup by phase.
                return accessData.canswitchphase || workshop.phase > $mmaModWorkshop.PHASE_SETUP;
            });
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModWorkshop.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return self.prefetchPackage(module, courseId, single, prefetchWorkshop);
    };

    /**
     * Retrieves all the grades reports for all the groups and then returns only unique grades.
     *
     * @param  {Number}  workshopId     Workshop ID.
     * @param  {Array}   groups         Array of groups in the activity.
     * @param  {Boolean} [forceCache]   True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean} [ignoreCache]  True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String}  siteId         Site ID.
     * @return {Promise}                All unique entries.
     */
    function getAllGradesReport(workshopId, groups, forceCache, ignoreCache, siteId) {
        var promises = [];

        angular.forEach(groups, function(group) {
            promises.push($mmaModWorkshop.fetchAllGradeReports(workshopId, group.id, undefined, forceCache, ignoreCache, siteId));
        });

        return $q.all(promises).then(function(grades) {
            var uniqueGrades = {};

            angular.forEach(grades, function(groupGrades) {
                angular.forEach(groupGrades, function(grade) {
                    if (grade.submissionid) {
                        uniqueGrades[grade.submissionid] = grade;
                    }
                });
            });

            return uniqueGrades;
        });
    }

    /**
     * Prefetch a workshop.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchWorkshop(module, courseId, single, siteId) {
        var userIds = [];

        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var currentUserId = site.getUserId();
             // Prefetch the workshop data.
            return getWorkshopInfoHelper(module, courseId, false, false, true, siteId).then(function(info) {
                var workshop = info.workshop,
                    promises = [],
                    assessments = [];

                promises.push($mmFilepool.addFilesToQueueByUrl(siteId, info.files, self.component, module.id));
                promises.push($mmaModWorkshop.getWorkshopAccessInformation(workshop.id, false, true, siteId).then(function (access) {
                    return $mmaModWorkshop.getUserPlanPhases(workshop.id, false, true, siteId).then(function (phases) {

                        // Get submission phase info.
                        var submissionPhase = phases[$mmaModWorkshop.PHASE_SUBMISSION],
                            canSubmit = $mmaModWorkshopHelper.canSubmit(workshop, access, submissionPhase.tasks),
                            canAssess = $mmaModWorkshopHelper.canAssess(workshop, access),
                            promises2 = [];

                        if (canSubmit) {
                            promises2.push($mmaModWorkshop.getSubmissions(workshop.id));
                            // Add userId to the profiles to prefetch.
                            userIds.push(currentUserId);
                        }

                        var reportPromise = $q.when();
                        if (access.canviewallsubmissions && workshop.phase >= $mmaModWorkshop.PHASE_SUBMISSION) {
                            reportPromise = getAllGradesReport(workshop.id, info.groups).then(function(grades) {
                                angular.forEach(grades, function(grade) {
                                    userIds.push(grade.userid);
                                    userIds.push(grade.gradeoverby);

                                    angular.forEach(grade.reviewedby, function(assessment) {
                                        userIds.push(assessment.userid);
                                        userIds.push(assessment.gradinggradeoverby);
                                        assessments[assessment.assessmentid] = assessment;
                                    });

                                    angular.forEach(grade.reviewerof, function(assessment) {
                                        userIds.push(assessment.userid);
                                        userIds.push(assessment.gradinggradeoverby);
                                        assessments[assessment.assessmentid] = assessment;
                                    });
                                });
                            });
                        }

                        if (workshop.phase >= $mmaModWorkshop.PHASE_ASSESSMENT && canAssess) {
                            // Wait the report promise to finish to override assessments array if needed.
                            reportPromise = reportPromise.finally(function() {
                                return $mmaModWorkshopHelper.getReviewerAssessments(workshop.id, currentUserId, undefined,
                                        undefined, siteId).then(function(revAssessments) {
                                    var p = $q.when();
                                    angular.forEach(revAssessments, function(assessment) {
                                        if (assessment.submission.authorid == currentUserId) {
                                            p = $mmaModWorkshop.getAssessment(workshop.id, assessment.id);
                                        }
                                        userIds.push(assessment.reviewerid);
                                        userIds.push(assessment.gradinggradeoverby);
                                        assessments[assessment.id] = assessment;
                                    });
                                    return p;
                                });
                            });
                        }

                        if (assessments.length > 0) {
                            reportPromise = reportPromise.finally(function() {
                                var promises3 = [];
                                angular.forEach(assessments, function(assessment, id) {
                                    promises3.push($mmaModWorkshop.getAssessmentForm(workshop.id, id, undefined, undefined,
                                        undefined, siteId));
                                });
                                return $q.all(promises3);
                            });
                        }
                        promises2.push(reportPromise);

                        if (workshop.phase == $mmaModWorkshop.PHASE_CLOSED) {
                            promises2.push($mmaModWorkshop.getGrades(workshop.id));
                            if (access.canviewpublishedsubmissions) {
                                promises2.push($mmaModWorkshop.getSubmissions(workshop.id));
                            }
                        }

                        return $q.all(promises2);
                    });
                }));
                // Add Basic Info to manage links.
                promises.push($mmCourse.getModuleBasicInfoByInstance(workshop.id, 'workshop', siteId));
                promises.push($mmCourse.getModuleBasicGradeInfo(module.id, siteId));

                return $q.all(promises);
            });
        }).then(function() {
            // Prefetch user profiles.
            return $mmUser.prefetchProfiles(userIds, courseId, siteId);
        }).then(function() {
            // Get revision and timemodified.

            var promises = [];
            promises.push(self.getRevision(module, courseId));
            promises.push(self.getTimemodified(module, courseId));

            // Return revision and timemodified.
            return $q.all(promises).then(function(list) {
                return {
                    revision: list[0],
                    timemod: list[1]
                };
            });
        });
    }

    return self;
});
