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
 * Workshop service.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc controller
 * @name $mmaModWorkshop
 */
.factory('$mmaModWorkshop', function($q, $mmSitesManager, mmaModWorkshopComponent, $mmFilepool, $mmSite, mmaModWorkshopPerPage,
        $mmaModWorkshopOffline, $mmApp, $mmUtil) {
    var self = {
        PHASE_SETUP: 10,
        PHASE_SUBMISSION: 20,
        PHASE_ASSESSMENT: 30,
        PHASE_EVALUATION: 40,
        PHASE_CLOSED: 50
    };

    /**
     * Get cache key for workshop data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getWorkshopDataCacheKey(courseId) {
        return 'mmaModWorkshop:workshop:' + courseId;
    }

    /**
     * Get prefix cache key for all workshop activity data WS calls.
     *
     * @param {Number} workshopId   Workshop ID.
     * @return {String}         Cache key.
     */
    function getWorkshopDataPrefixCacheKey(workshopId) {
        return 'mmaModWorkshop:' + workshopId;
    }

    /**
     * Get cache key for workshop access information data WS calls.
     *
     * @param {Number} workshopId   Workshop ID.
     * @return {String}         Cache key.
     */
    function getWorkshopAccessInformationDataCacheKey(workshopId) {
        return getWorkshopDataPrefixCacheKey(workshopId) + ':access';
    }

    /**
     * Get cache key for workshop user plan data WS calls.
     *
     * @param {Number} workshopId   Workshop ID.
     * @return {String}         Cache key.
     */
    function getUserPlanDataCacheKey(workshopId) {
        return getWorkshopDataPrefixCacheKey(workshopId) + ':userplan';
    }

    /**
     * Get cache key for workshop submissions data WS calls.
     *
     * @param  {Number} workshopId  Workshop ID.
     * @param  {Number} [userId]    User ID.
     * @param  {Number} [groupId]   Group ID.
     * @return {String}             Cache key.
     */
    function getSubmissionsDataCacheKey(workshopId, userId, groupId) {
        userId = userId || 0;
        groupId = groupId || 0;
        return getWorkshopDataPrefixCacheKey(workshopId) + ':submissions:' + userId + ':' + groupId;
    }

    /**
     * Get cache key for a workshop submission data WS calls.
     *
     * @param  {Number}  workshopId    Workshop ID.
     * @param  {Number}  submissionId  Submission ID.
     * @return {String}                Cache key.
     */
    function getSubmissionDataCacheKey(workshopId, submissionId) {
        return getWorkshopDataPrefixCacheKey(workshopId) + ':submission:' + submissionId;
    }

    /**
     * Get cache key for workshop grade report data WS calls.
     *
     * @param  {Number} workshopId  Workshop ID.
     * @param  {Number} [userId]    User ID.
     * @param  {Number} [groupId]   Group ID.
     * @return {String}             Cache key.
     */
    function getGradesReportDataCacheKey(workshopId, groupId) {
        groupId = groupId || 0;
        return getWorkshopDataPrefixCacheKey(workshopId) + ':report:' + groupId;
    }

    /**
     * Get cache key for workshop submission assessments data WS calls.
     *
     * @param  {Number}  workshopId    Workshop ID.
     * @param  {Number}  submissionId  Submission ID.
     * @return {String}                Cache key.
     */
    function getSubmissionAssessmentsDataCacheKey(workshopId, submissionId) {
        return getWorkshopDataPrefixCacheKey(workshopId) + ':assessments:' + submissionId;
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the workshop WS are available.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_workshop_get_workshops_by_courses') &&
                site.wsAvailable('mod_workshop_get_workshop_access_information');
        });
    };

    /**
     * Get a workshop with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {Number}     courseId        Course ID.
     * @param  {String}     key             Name of the property to check.
     * @param  {Mixed}      value           Value to search.
     * @param  {String}     [siteId]        Site ID. If not defined, current site.
     * @param  {Boolean}    [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}                    Promise resolved when the workshop is retrieved.
     */
    function getWorkshop(courseId, key, value, siteId, forceCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getWorkshopDataCacheKey(courseId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_workshop_get_workshops_by_courses', params, preSets).then(function(response) {
                if (response && response.workshops) {
                    for (var x in response.workshops) {
                        if (response.workshops[x][key] == value) {
                            return response.workshops[x];
                        }
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a workshop by course module ID.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getWorkshop
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    cmId            Course module ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the workshop is retrieved.
     */
    self.getWorkshop = function(courseId, cmId, siteId, forceCache) {
        return getWorkshop(courseId, 'coursemodule', cmId, siteId, forceCache);
    };

    /**
     * Get a workshop by ID.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getWorkshopById
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    id              Workshop ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the workshop is retrieved.
     */
    self.getWorkshopById = function(courseId, id, siteId, forceCache) {
        return getWorkshop(courseId, 'id', id, siteId, forceCache);
    };

    /**
     * Invalidates workshop data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateWorkshopData
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the workshop is invalidated.
     */
    self.invalidateWorkshopData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWorkshopDataCacheKey(courseId));
        });
    };

    /**
     * Invalidates workshop data except files and module info.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateWorkshopWSData
     * @param  {Number} workshopId   Workshop ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the workshop is invalidated.
     */
    self.invalidateWorkshopWSData = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getWorkshopDataPrefixCacheKey(workshopId));

        });
    };

    /**
     * Get  access information for a given workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getWorkshopAccessInformation
     * @param   {Number}    workshopId      Workshop ID.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the workshop is retrieved.
     */
    self.getWorkshopAccessInformation = function(workshopId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    workshopid: workshopId
                },
                preSets = {
                    cacheKey: getWorkshopAccessInformationDataCacheKey(workshopId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_workshop_access_information', params, preSets);
        });
    };

    /**
     * Invalidates workshop access information data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateWorkshopAccessInformationData
     * @param {Number} workshopId   Workshop ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateWorkshopAccessInformationData = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWorkshopAccessInformationDataCacheKey(workshopId));
        });
    };

    /**
     * Return the planner information for the given user.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getUserPlanPhases
     * @param   {Number}    workshopId      Workshop ID.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the workshop data is retrieved.
     */
    self.getUserPlanPhases = function(workshopId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    workshopid: workshopId
                },
                preSets = {
                    cacheKey: getUserPlanDataCacheKey(workshopId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_user_plan', params, preSets).then(function(response) {
                if (response && response.userplan && response.userplan.phases) {
                    var phases = {};
                    angular.forEach(response.userplan.phases, function(phase) {
                        phases[phase.code] = phase;
                    });
                    return phases;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates workshop user plan data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateUserPlanPhasesData
     * @param {Number} workshopId   Workshop ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateUserPlanPhasesData = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getUserPlanDataCacheKey(workshopId));
        });
    };

    /**
     * Retrieves all the workshop submissions visible by the current user or the one done by the given user.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getSubmissions
     * @param   {Number}    workshopId      Workshop ID.
     * @param   {Number}    [userId]        User ID.
     * @param   {Number}    [groupId]       Group id, 0 means that the function will determine the user group.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the workshop data is retrieved.
     */
    self.getSubmissions = function(workshopId, userId, groupId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    workshopid: workshopId,
                    userid: userId || 0,
                    groupid: groupId || 0
                },
                preSets = {
                    cacheKey: getSubmissionsDataCacheKey(workshopId, userId, groupId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_submissions', params, preSets).then(function(response) {
                if (response && response.submissions) {
                    return response.submissions;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates workshop submissions data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateSubmissionsData
     * @param  {Number} workshopId  Workshop ID.
     * @param  {Number} [userId]    User ID.
     * @param  {Number} [groupId]   Group ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubmissionsData = function(workshopId, userId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getSubmissionsDataCacheKey(workshopId, userId, groupId));
        });
    };

    /**
     * Retrieves the given submission.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getSubmission
     * @param   {Number}  workshopId    Workshop ID.
     * @param   {Number}  submissionId  Submission ID.
     * @param   {String}  [siteId]      Site ID. If not defined, current site.
     * @return  {Promise}               Promise resolved when the workshop submission data is retrieved.
     */
    self.getSubmission = function(workshopId, submissionId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    submissionid: submissionId
                },
                preSets = {
                    cacheKey: getSubmissionDataCacheKey(workshopId, submissionId)
                };

            return site.read('mod_workshop_get_submission', params, preSets).then(function(response) {
                if (response && response.submission) {
                    return response.submission;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates workshop submission data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateSubmissionData
     * @param   {Number} workshopId    Workshop ID.
     * @param  {Number}  submissionId  Submission ID.
     * @param  {String}  [siteId]      Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved when the data is invalidated.
     */
    self.invalidateSubmissionData = function(workshopId, submissionId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getSubmissionDataCacheKey(workshopId, submissionId));
        });
    };

    /**
     * Retrieves the assessment grades report.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getGradesReport
     * @param   {Number}    workshopId      Workshop ID.
     * @param   {Number}    [groupId]       Group id, 0 means that the function will determine the user group.
     * @param   {Number}    [page]          Page of records to return. Default 0.
     * @param   {Number}    [perPage]       Records per page to return. Default on mmaModWorkshopPerPage.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the workshop data is retrieved.
     */
    self.getGradesReport = function(workshopId, groupId, page, perPage, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    workshopid: workshopId,
                    groupid: groupId || 0,
                    page: page || 0,
                    perpage: perPage || mmaModWorkshopPerPage
                },
                preSets = {
                    cacheKey: getGradesReportDataCacheKey(workshopId, groupId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_grades_report', params, preSets).then(function(response) {
                if (response && response.report) {
                    return response.report;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Performs the whole fetch of the grade reports in the workshop.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModWorkshop#fetchAllGradeReports
     * @param  {Number}    workshopId      Workshop ID.
     * @param  {Number}    [groupId]       Group ID.
     * @param  {Number}    [perPage]       Records per page to fetch. It has to match with the prefetch.
     *                                     Default on mmaModWorkshopPerPage.
     * @param  {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean}   [ignoreCache]   True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String}    [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                   Promise resolved when done.
     */
    self.fetchAllGradeReports = function(workshopId, groupId, perPage, forceCache, ignoreCache, siteId) {
        siteId = siteId || $mmSite.getId();
        perPage = perPage || mmaModWorkshopPerPage;
        return fetchGradeReportsRecursive(workshopId, groupId, perPage, forceCache, ignoreCache, [], 0, siteId);
    };

    /**
     * Recursive call on fetch all grade reports.
     *
     * @param  {Number}    workshopId      Workshop ID.
     * @param  {Number}    groupId         Group ID.
     * @param  {Number}    perPage         Records per page to fetch. It has to match with the prefetch.
     * @param  {Boolean}   forceCache      True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {Array}     grades          Grades already fetch (just to concatenate them).
     * @param  {Number}    page            Page of records to return.
     * @param  {String}    siteId          Site ID.
     * @return {Promise}                   Promise resolved when done.
     */
    function fetchGradeReportsRecursive(workshopId, groupId, perPage, forceCache, ignoreCache, grades, page, siteId) {
        return self.getGradesReport(workshopId, groupId, page, perPage, forceCache, ignoreCache, siteId).then(function(report) {
            grades = grades.concat(report.grades);

            var canLoadMore = ((page + 1) * perPage) < report.totalcount;
            if (canLoadMore) {
                return fetchGradeReportsRecursive(workshopId, groupId, perPage, forceCache, ignoreCache, grades, page + 1, siteId);
            }
            return grades;
        });
    }

    /**
     * Invalidates workshop grade report data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateGradeReportData
     * @param  {Number} workshopId  Workshop ID.
     * @param  {Number} [groupId]   Group ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateGradeReportData = function(workshopId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getGradesReportDataCacheKey(workshopId, groupId));
        });
    };

    /**
     * Retrieves the given submission assessment.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getSubmissionAssessments
     * @param   {Number}    workshopId      Workshop ID.
     * @param   {Number}    submissionId    Submission ID.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the workshop data is retrieved.
     */
    self.getSubmissionAssessments = function(workshopId, submissionId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    submissionid: submissionId
                },
                preSets = {
                    cacheKey: getSubmissionAssessmentsDataCacheKey(workshopId, submissionId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_submission_assessments', params, preSets).then(function(response) {
                if (response && response.assessments) {
                    return response.assessments;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates workshop submission assessments data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateSubmissionAssesmentsData
     * @param  {Number} workshopId   Workshop ID.
     * @param  {Number} submissionId Submission ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubmissionAssesmentsData = function(workshopId, submissionId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getSubmissionAssessmentsDataCacheKey(workshopId, submissionId));
        });
    };

    /**
     * Add a new submission to a given workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#addSubmission
     * @param {Number}  workshopId      Workshop ID.
     * @param {Number}  courseId        Course ID the workshop belongs to.
     * @param {String}  title           The submission title.
     * @param {String}  content         The submission text content.
     * @param {Number}  [attachmentsId] The draft file area id for attachments.
     * @param {String}  [siteId]        Site ID. If not defined, current site.
     * @param {Number}  [timecreated]   The time the submission was created. Only used when editing an offline discussion.
     * @param {Boolean} allowOffline    True if it can be stored in offline, false otherwise.
     * @return {Promise}                Promise resolved with submission ID if sent online, resolved with false if stored offline.
     */
    self.addSubmission = function(workshopId, courseId, title, content, attachmentsId, siteId, timecreated, allowOffline) {
        siteId = siteId || $mmSite.getId();

        // If we are editing an offline discussion, discard previous first.
        var discardPromise =
            timecreated ? $mmaModWorkshopOffline.deleteSubmissionAction(workshopId, timecreated, 'add', siteId) : $q.when();

        return discardPromise.then(function() {
            if (!$mmApp.isOnline() && allowOffline) {
                // App is offline, store the action.
                return storeOffline();
            }

            return self.addSubmissionOnline(workshopId, title, content, attachmentsId, siteId).catch(function(error) {
                if (allowOffline && error && !error.wserror) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error or offline not supported, reject.
                    return $q.reject(error.error);
                }
            });
        });

        // Convenience function to store a message to be synchronized later.
        function storeOffline() {
            return $mmaModWorkshopOffline.saveSubmission(workshopId, courseId, title, content, attachmentsId, timecreated, 'add',
                    siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Add a new submission to a given workshop. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#addSubmissionOnline
     * @param  {Number} workshopId      Workshop ID.
     * @param  {String} title           The submission title.
     * @param  {String} content         The submission text content.
     * @param  {Number} [attachmentsId] The draft file area id for attachments.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when the submission is created.
     */
    self.addSubmissionOnline = function(workshopId, title, content, attachmentsId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                workshopid: workshopId,
                title: title,
                content: content,
                attachmentsid: attachmentsId || 0
            };

            return site.write('mod_workshop_add_submission', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function(response) {
                // Other errors ocurring.
                if (!response || !response.submissionid) {
                    return $q.reject({
                        wserror: true
                    });
                }
                return response.submissionid;
            });
        });
    };

    /**
     * Updates the given submission.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#updateSubmission
     * @param {Number}  workshopId      Workshop ID.
     * @param  {Number} submissionId    Submission ID.
     * @param {Number}  courseId        Course ID the workshop belongs to.
     * @param {String}  title           The submission title.
     * @param {String}  content         The submission text content.
     * @param {Number}  [attachmentsId] The draft file area id for attachments.
     * @param {String}  [siteId]        Site ID. If not defined, current site.
     * @param {Boolean} allowOffline    True if it can be stored in offline, false otherwise.
     * @return {Promise}                Promise resolved with submission ID if sent online, resolved with false if stored offline.
     */
    self.updateSubmission = function(workshopId, submissionId, courseId, title, content, attachmentsId, siteId, allowOffline) {
        siteId = siteId || $mmSite.getId();

        // If we are editing an offline discussion, discard previous first.
        return $mmaModWorkshopOffline.deleteSubmissionAction(workshopId, submissionId, 'update', siteId).then(function() {
            if (!$mmApp.isOnline() && allowOffline) {
                // App is offline, store the action.
                return storeOffline();
            }

            return self.updateSubmissionOnline(submissionId, title, content, attachmentsId, siteId).catch(function(error) {
                if (allowOffline && error && !error.wserror) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error or offline not supported, reject.
                    return $q.reject(error.error);
                }
            });
        });

        // Convenience function to store a message to be synchronized later.
        function storeOffline() {
            return $mmaModWorkshopOffline.saveSubmission(workshopId, courseId, title, content, attachmentsId, submissionId, 'update',
                    siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Updates the given submission. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#updateSubmissionOnline
     * @param  {Number} submissionId    Submission ID.
     * @param  {String} title           The submission title.
     * @param  {String} content         The submission text content.
     * @param  {Number} [attachmentsId] The draft file area id for attachments.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when the submission is updated.
     */
    self.updateSubmissionOnline = function(submissionId, title, content, attachmentsId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                submissionid: submissionId,
                title: title,
                content: content,
                attachmentsid: attachmentsId || 0
            };

            return site.write('mod_workshop_update_submission', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function(response) {
                // Other errors ocurring.
                if (!response || !response.status) {
                    return $q.reject({
                        wserror: true
                    });
                }
                // Return submissionId to be consistent with addSubmission.
                return submissionId;
            });
        });
    };

    /**
     * Deletes the given submission.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#deleteSubmission
     * @param {Number}  workshopId      Workshop ID.
     * @param  {Number} submissionId    Submission ID.
     * @param {Number}  courseId        Course ID the workshop belongs to.
     * @param {String}  [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with submission ID if sent online, resolved with false if stored offline.
     */
    self.deleteSubmission = function(workshopId, submissionId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        // If we are editing an offline discussion, discard previous first.
        return $mmaModWorkshopOffline.deleteSubmissionAction(workshopId, submissionId, 'delete', siteId).then(function() {
            if (!$mmApp.isOnline()) {
                // App is offline, store the action.
                return storeOffline();
            }

            return self.deleteSubmissionOnline(submissionId, siteId).catch(function(error) {
                if (error && !error.wserror) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error or offline not supported, reject.
                    return $q.reject(error.error);
                }
            });
        });

        // Convenience function to store a message to be synchronized later.
        function storeOffline() {
            return $mmaModWorkshopOffline.saveSubmission(workshopId, courseId, false, false, false, submissionId, 'delete',
                    siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Deletes the given submission. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#deleteSubmissionOnline
     * @param  {Number} submissionId    Submission ID.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when the submission is deleted.
     */
    self.deleteSubmissionOnline = function(submissionId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                submissionid: submissionId
            };

            return site.write('mod_workshop_delete_submission', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function(response) {
                // Other errors ocurring.
                if (!response || !response.status) {
                    return $q.reject({
                        wserror: true
                    });
                }
                // Return submissionId to be consistent with addSubmission.
                return submissionId;
            });
        });
    };

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use $mmaModWorkshop#invalidateFiles.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return self.getWorkshop(courseId, moduleId, siteId, true).then(function(workshop) {
            return self.invalidateContentById(workshop.id, courseId, siteId);
        });
    };

    /**
     * Invalidate the prefetched content except files using the activityId.
     * To invalidate files, use $mmaModWorkshop#invalidateFiles.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateContentById
     * @param {Number} workshopId Workshop ID.
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContentById = function(workshopId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        var ps = [];
        // Do not invalidate workshop data before getting workshop info, we need it!
        ps.push(self.invalidateWorkshopData(courseId, siteId));
        ps.push(self.invalidateWorkshopWSData(workshopId, siteId));

        return $q.all(ps);
    };

    /**
     * Invalidate the prefetched files.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateFiles
     * @param {Number} moduleId  The module ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the files are invalidated.
     */
    self.invalidateFiles = function(moduleId, siteId) {
        return $mmFilepool.invalidateFilesByComponent(siteId, mmaModWorkshopComponent, moduleId);
    };

    /**
     * Report the workshop as being viewed.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#logView
     * @param {String}  id       Workshop ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                workshopid: id
            };
            return site.write('mod_workshop_view_workshop', params);
        });
    };

    /**
     * Report the workshop submission as being viewed.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#logViewSubmission
     * @param {String}  id       Submission ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logViewSubmission = function(id, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                submissionid: id
            };
            return site.write('mod_workshop_view_submission', params);
        });
    };

    return self;
});
