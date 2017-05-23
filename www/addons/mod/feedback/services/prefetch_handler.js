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

angular.module('mm.addons.mod_feedback')

/**
 * Mod feedback prefetch handler.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc service
 * @name $mmaModFeedbackPrefetchHandler
 */
.factory('$mmaModFeedbackPrefetchHandler', function($mmaModFeedback, mmaModFeedbackComponent, $mmFilepool, $q, $mmUtil, $mmGroups,
            $mmPrefetchFactory, $mmUser) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModFeedbackComponent);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$|^attemptsfinished|^attemptsunfinished$/;

    /**
     * Download the module.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Feedback cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackPrefetchHandler#getFiles
     * @param  {Object} module    Module to get the files.
     * @param  {Number} courseId  Course ID the module belongs to.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the list of files.
     */
    self.getFiles = function(module, courseId, siteId) {
        var files = [];
        return $mmaModFeedback.getFeedback(courseId, module.id, siteId).then(function(feedback) {

            // Get intro files and page after submit files.
            files = feedback.pageaftersubmitfiles || [];
            files = files.concat(self.getIntroFilesFromInstance(module, feedback));

            return $mmaModFeedback.getItems(feedback.id, siteId);
        }).then(function(response) {
            angular.forEach(response.items, function(item) {
                files = files.concat(item.itemfiles);
            });

            return files;
        }).catch(function() {
            // Any error, return the list we have.
            return files;
        });
    };

    /**
     * Returns feedback intro files.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackPrefetchHandler#getIntroFiles
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID.
     * @return {Promise}         Promise resolved with list of intro files.
     */
    self.getIntroFiles = function(module, courseId) {
        return $mmaModFeedback.getFeedback(courseId, module.id).catch(function() {
            // Not found, return undefined so module description is used.
        }).then(function(feedback) {
            return self.getIntroFilesFromInstance(module, feedback);
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModFeedback.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModFeedback.invalidateFeedbackData(courseId);
    };

    /**
     * Check if a feedback is downloadable.
     * A feedback isn't downloadable if it's not open yet.
     * Closed feedback are downloadable because teachers can always see the results.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackPrefetchHandler#isDownloadable
     * @param {Object} module    Module to check.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        return $mmaModFeedback.getFeedback(courseId, module.id, false, true).then(function(feedback) {
            var now = $mmUtil.timestamp();

            // Check time first if available.
            if (feedback.timeopen && feedback.timeopen > now) {
                return false;
            }
            if (feedback.timeclose && feedback.timeclose < now) {
                return false;
            }
            return $mmaModFeedback.getFeedbackAccessInformation(feedback.id).then(function(accessData) {
                return accessData.isopen;
            });
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModFeedback.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return self.prefetchPackage(module, courseId, single, prefetchFeedback);
    };

    /**
     * Prefetch a feedback.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchFeedback(module, courseId, single, siteId) {
        // Prefetch the feedback data.
        return $mmaModFeedback.getFeedback(courseId, module.id, siteId).then(function(feedback) {
            var p1 = [];

            p1.push(self.getFiles(module, courseId, siteId).then(function(files) {
                return $mmFilepool.addFilesToQueueByUrl(siteId, files, self.component, module.id);
            }));

            p1.push($mmaModFeedback.getFeedbackAccessInformation(feedback.id, false, true, siteId).then(function(accessData) {
                var p2 = [];
                if (accessData.canedititems || accessData.canviewreports) {
                    // Get all groups analysis.
                    p2.push($mmaModFeedback.getAnalysis(feedback.id, undefined, siteId));
                    p2.push($mmGroups.getActivityGroupInfo(feedback.coursemodule, true, undefined, siteId)
                            .then(function(groupInfo) {
                        var p3 = [],
                            userIds = [];
                        if (!groupInfo.groups || groupInfo.groups.length == 0) {
                            groupInfo.groups = [{id: 0}];
                        }
                        angular.forEach(groupInfo.groups, function(group) {
                            p3.push($mmaModFeedback.getAnalysis(feedback.id, group.id, siteId));
                            p3.push($mmaModFeedback.getAllResponsesAnalysis(feedback.id, group.id, siteId)
                                    .then(function(responses) {
                                angular.forEach(responses.attempts, function(attempt) {
                                    userIds.push(attempt.userid);
                                });
                            }));
                            if (!accessData.isanonymous) {
                                p3.push($mmaModFeedback.getAllNonRespondents(feedback.id, group.id, siteId)
                                        .then(function(responses) {
                                    angular.forEach(responses.users, function(user) {
                                        userIds.push(user.userid);
                                    });
                                }));
                            }
                        });

                        return $q.all(p3).then(function() {
                            // Prefetch user profiles.
                            return $mmUser.prefetchProfiles(userIds, courseId, siteId);
                        });
                    }));
                }

                p2.push($mmaModFeedback.getItems(feedback.id, siteId));

                if (accessData.cancomplete && accessData.cansubmit && !accessData.isempty) {
                    // Send empty data, so it will recover last completed feedback attempt values.
                    p2.push($mmaModFeedback.processPageOnline(feedback.id, 0, {}, undefined, siteId).finally(function() {
                        var p4 = [];

                        p4.push($mmaModFeedback.getCurrentValues(feedback.id, false, true, siteId));
                        p4.push($mmaModFeedback.getResumePage(feedback.id, false, true, siteId));

                        return $q.all(p4);
                    }));
                }

                return $q.all(p2);
            }));

            return $q.all(p1);
        }).then(function() {
            // Get revision and timemodified.

            var p4 = [];
            p4.push(self.getRevision(module, courseId));
            p4.push(self.getTimemodified(module, courseId));

            // Return revision and timemodified.
            return $q.all(p4).then(function(list) {
                return {
                    revision: list[0],
                    timemod: list[1]
                };
            });
        });
    }

    return self;
});
