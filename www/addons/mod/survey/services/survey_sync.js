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

angular.module('mm.addons.mod_survey')

/**
 * Mod survey synchronization factory.
 *
 * @module mm.addons.mod_survey
 * @ngdoc service
 * @name $mmaModSurveySync
 */
.factory('$mmaModSurveySync', function($log, $mmSite, $q, $mmApp, $translate, $mmaModSurvey, $mmSitesManager, $mmCourse, $mmSync,
            $mmaModSurveyOffline, $mmEvents, mmaModSurveyAutomSyncedEvent, mmaModSurveyComponent, mmaModSurveySyncTime) {
    $log = $log.getInstance('$mmaModSurveySync');

    var self = $mmSync.createChild(mmaModSurveyComponent, mmaModSurveySyncTime);

    /**
     * Get the ID of a survey sync.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveySync#_getSyncId
     * @param  {Number} surveyId Survey ID.
     * @param  {Number} userId   User the answers belong to.
     * @return {String}          Sync ID.
     * @protected
     */
    self._getSyncId = function(surveyId, userId) {
        return surveyId + '#' + userId;
    };

    /**
     * Check if a survey is being synchronized.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveySync#isSyncingSurvey
     * @param  {Number} surveyId Survey ID.
     * @param  {Number} userId   User the answers belong to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Boolean}         True if synchronizing, false otherwise.
     */
    self.isSyncingSurvey = function(surveyId, userId, siteId) {
        var syncId = self._getSyncId(surveyId, userId);
        return self.isSyncing(syncId, siteId);
    };

    /**
     * Try to synchronize all the surveys in a certain site or in all sites.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveySync#syncAllSurveys
     * @param  {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}         Promise resolved if sync is successful, rejected if sync fails.
     */
    self.syncAllSurveys = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all surveys because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync surveys in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync surveys in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Get all survey answers pending to be sent in the site.
                sitePromises.push($mmaModSurveyOffline.getAllData(siteId).then(function(entries) {
                    var promises = [];

                    // Sync all surveys.
                    angular.forEach(entries, function(entry) {
                        promises.push(self.syncSurvey(entry.surveyid, entry.userid, siteId).then(function(result) {
                            if (result && result.answersSent) {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaModSurveyAutomSyncedEvent, {
                                    siteid: siteId,
                                    surveyid: entry.surveyid,
                                    userid: entry.userid,
                                    warnings: result.warnings
                                });
                            }
                        }));
                    });

                    return $q.all(promises);
                }));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Sync a survey only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveySync#syncSurveyIfNeeded
     * @param  {Number} surveyId Survey ID.
     * @param  {Number} userId   User the answers belong to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the survey is synced or if it doesn't need to be synced.
     */
    self.syncSurveyIfNeeded = function(surveyId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncId = self._getSyncId(surveyId, userId);
        return self.isSyncNeeded(syncId, siteId).then(function(needed) {
            if (needed) {
                return self.syncSurvey(surveyId, userId, siteId);
            }
        });
    };

    /**
     * Synchronize a survey.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveySync#syncSurvey
     * @param  {Number} surveyId Survey ID.
     * @param  {Number} userId   User the answers belong to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncSurvey = function(surveyId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            result = {
                warnings: [],
                answersSent: false
            },
            syncId = self._getSyncId(surveyId, userId),
            courseId;

        if (self.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this survey and user, return the promise.
            return self.getOngoingSync(syncId, siteId);
        }

        $log.debug('Try to sync survey ' + surveyId + ' for user ' + userId);

        // Get answers to be sent.
        syncPromise = $mmaModSurveyOffline.getSurveyData(surveyId, siteId, userId).catch(function() {
            // No offline data found, return empty object.
            return {};
        }).then(function(data) {
            if (!data.answers || !data.answers.length) {
                // Nothing to sync.
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            courseId = data.courseid;

            // Send the answers.
            return $mmaModSurvey.submitAnswersOnline(surveyId, data.answers, siteId).then(function() {
                result.answersSent = true;

                // Answers sent, delete them.
                return $mmaModSurveyOffline.deleteSurveyAnswers(surveyId, siteId, userId);
            }, function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means that answers cannot be submitted. Delete them.
                    result.answersSent = true;
                    return $mmaModSurveyOffline.deleteSurveyAnswers(surveyId, siteId, userId).then(function() {
                        // Answers deleted, add a warning.
                        result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                            component: $mmCourse.translateModuleName('survey'),
                            name: data.name,
                            error: error.error
                        }));
                    });
                } else {
                    // Couldn't connect to server, reject.
                    return $q.reject(error && error.error);
                }
            });
        }).then(function() {
            if (courseId) {
                // Data has been sent to server, update survey data.
                return $mmaModSurvey.invalidateSurveyData(courseId).then(function() {
                    return $mmaModSurvey.getSurveyById(courseId, surveyId, siteId);
                }).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
            // Sync finished, set sync time.
            return self.setSyncTime(syncId, siteId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            return result;
        });

        return self.addOngoingSync(syncId, syncPromise, siteId);
    };

    /**
     * If there's an ongoing sync for a certain survey and user, wait for it to end.
     * If there's no sync ongoing the promise will be resolved right away.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveySync#waitForSurveySync
     * @param  {Number} surveyId Survey ID.
     * @param  {Number} userId   User the answers belong to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when there's no sync going on for the survey.
     */
    self.waitForSurveySync = function(surveyId, userId, siteId) {
        var syncId = self._getSyncId(surveyId, userId);
        return self.waitForSync(syncId, siteId);
    };

    return self;
});
