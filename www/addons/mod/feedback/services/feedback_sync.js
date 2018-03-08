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
 * Feedback synchronization service.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc service
 * @name $mmaModFeedbackSync
 */
.factory('$mmaModFeedbackSync', function($q, $log, $mmApp, $mmSitesManager, $mmaModFeedbackOffline, $mmSite, $mmEvents, $mmSync,
        $mmLang, mmaModFeedbackComponent, $mmaModFeedback, $translate, mmaModFeedbackAutomSyncedEvent, mmaModFeedbackSyncTime,
        $mmCourse, $mmSyncBlock, $mmUtil) {

    $log = $log.getInstance('$mmaModFeedbackSync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaModFeedbackComponent, mmaModFeedbackSyncTime);

    /**
     * Try to synchronize all feedback from current site that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackSync#syncAllFeedback
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllFeedback = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all feedback because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync feedback in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync feedback in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Sync all new responses.
                sitePromises.push($mmaModFeedbackOffline.getAllFeedbackResponses(siteId).then(function(responses) {
                    var promises = {};

                    // Do not sync same feedback twice.
                    for (var i in responses) {
                        var response = responses[i];

                        if (typeof promises[response.feedbackid] != 'undefined') {
                            continue;
                        }

                        promises[response.feedbackid] = self.syncFeedbackIfNeeded(response.feedbackid, siteId)
                                .then(function(result) {
                            if (result && result.updated) {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaModFeedbackAutomSyncedEvent, {
                                    siteid: siteId,
                                    feedbackid: response.feedbackid,
                                    userid: response.userid,
                                    warnings: result.warnings
                                });
                            }
                        });
                    }
                    // Promises will be an object so, convert to an array first;
                    promises = $mmUtil.objectToArray(promises);

                    return $q.all(promises);
                }));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Sync a feedback only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackSync#syncFeedbackIfNeeded
     * @param  {Number} feedbackId  Feedback ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the feedback is synced or if it doesn't need to be synced.
     */
    self.syncFeedbackIfNeeded = function(feedbackId, siteId) {
        siteId = siteId || $mmSite.getId();

        return self.isSyncNeeded(feedbackId, siteId).then(function(needed) {
            if (needed) {
                return self.syncFeedback(feedbackId, siteId);
            }
        });
    };

    /**
     * Synchronize all offline responses of a feedback.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackSync#syncFeedback
     * @param  {Number} feedbackId  Feedback ID to be synced.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncFeedback = function(feedbackId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            feedback,
            courseId,
            syncId = feedbackId,
            result = {
                warnings: [],
                updated: false
            };

        if (self.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this feedback, return the promise.
            return self.getOngoingSync(syncId, siteId);
        }

        // Verify that feedback isn't blocked.
        if ($mmSyncBlock.isBlocked(mmaModFeedbackComponent, syncId, siteId)) {
            $log.debug('Cannot sync feedback ' + feedbackId + ' because it is blocked.');
            var modulename = $mmCourse.translateModuleName('feedback');
            return $mmLang.translateAndReject('mm.core.errorsyncblocked', {$a: modulename});
        }

        $log.debug('Try to sync feedback ' + feedbackId);

        // Get offline responses to be sent.
        syncPromise = $mmaModFeedbackOffline.getFeedbackResponses(feedbackId, siteId).catch(function() {
            // No offline data found, return empty object.
            return [];
        }).then(function(responses) {
            if (!responses.length) {
                // Nothing to sync.
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            courseId = responses[0].courseid;

            return $mmaModFeedback.getFeedbackById(courseId, feedbackId, siteId).then(function(feedbackData) {
                feedback = feedbackData;

                if (!feedback.multiple_submit) {
                    // If it does not admit multiple submits, check if it is completed to know if we can submit.
                    return $mmaModFeedback.isCompleted(feedbackId);
                } else {
                    return false;
                }
            }).then(function(isCompleted) {
                if (isCompleted) {
                    // Cannot submit again, delete resposes.
                    var promises = [];

                    angular.forEach(responses, function(data) {
                        promises.push($mmaModFeedbackOffline.deleteFeedbackPageResponses(feedbackId, data.page, siteId));
                    });

                    result.updated = true;
                    result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                        component: $mmCourse.translateModuleName('feedback'),
                        name: feedback.name,
                        error: $translate.instant('mma.mod_feedback.this_feedback_is_already_submitted')
                    }));
                    return $q.all(promises);
                }

                return $mmaModFeedback.getCurrentCompletedTimeModified(feedbackId, siteId).then(function(timemodified) {
                    // Sort by page.
                    responses.sort(function (a, b) {
                        return a.page - b.page;
                    });

                    responses = responses.map(function (data) {
                        return {
                            func: processPage,
                            params: [feedback, data, siteId, timemodified, result],
                            blocking: true
                        };
                    });

                    // Execute all the processes in order to solve dependencies.
                    return $mmUtil.executeOrderedPromises(responses);
                });
            })
        }).then(function() {
            if (result.updated) {
                // Data has been sent to server. Now invalidate the WS calls.
                return $mmaModFeedback.invalidateFeedbackWSData(feedbackId, siteId).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
            // Sync finished, set sync time.
            return self.setSyncTime(syncId, siteId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            // All done, return the warnings.
            return result;
        });

        return self.addOngoingSync(syncId, syncPromise, siteId);
    };

    // Convenience function to sync process page calls.
    function processPage(feedback, data, siteId, timemodified, result) {
        // Delete all pages that are submitted before changing website.
        if (timemodified > data.timemodified) {
            return $mmaModFeedbackOffline.deleteFeedbackPageResponses(feedback.id, data.page, siteId);
        }

        return $mmaModFeedback.processPageOnline(feedback.id, data.page, data.responses, false, siteId).then(function() {
            result.updated = true;

            return $mmaModFeedbackOffline.deleteFeedbackPageResponses(feedback.id, data.page, siteId);
        }).catch(function(error) {
            if (error && error.wserror) {
                // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                result.updated = true;
                return $mmaModFeedbackOffline.deleteFeedbackPageResponses(feedback.id, data.page, siteId).then(function() {
                    // Responses deleted, add a warning.
                    result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                        component: $mmCourse.translateModuleName('feedback'),
                        name: feedback.name,
                        error: error.error
                    }));
                });
            } else {
                // Couldn't connect to server, reject.
                return $q.reject(error && error.error);
            }
        });
    }

    return self;
});
