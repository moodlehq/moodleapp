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

.constant('mmaModAssignSubmissionsStore', 'mma_mod_assign_submissions')

.config(function($mmSitesFactoryProvider, mmaModAssignSubmissionsStore) {
    var stores = [
        {
            name: mmaModAssignSubmissionsStore,
            keyPath: ['assignmentid', 'userid'],
            indexes: [
                {
                    name: 'assignmentid'
                },
                {
                    name: 'userid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'timemodified'
                },
                {
                    name: 'onlinetimemodified'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Offline assign factory.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignOffline
 */
.factory('$mmaModAssignOffline', function($mmSitesManager, $log, $mmSite, $mmFS, mmaModAssignSubmissionsStore) {
    $log = $log.getInstance('$mmaModAssignOffline');

    var self = {};

    /**
     * Delete a submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#deleteSubmission
     * @param  {Number} assignId Assignment ID.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if deleted, rejected if failure.
     */
    self.deleteSubmission = function(assignId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().remove(mmaModAssignSubmissionsStore, [assignId, userId]);
        });
    };

    /**
     * Get all the stored submissions from all the assignments.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getAllSubmissions
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with submissions.
     */
    self.getAllSubmissions = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModAssignSubmissionsStore);
        });
    };

    /**
     * Get all the stored submission from a certain assignment.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getAssignSubmissions
     * @param  {Number} assignId Assignment ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with submissions.
     */
    self.getAssignSubmissions = function(assignId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModAssignSubmissionsStore, 'assignmentid', assignId);
        });
    };

    /**
     * Get a stored submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getSubmission
     * @param  {Number} assignId Assignment ID.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with submission.
     */
    self.getSubmission = function(assignId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().get(mmaModAssignSubmissionsStore, [assignId, userId]);
        });
    };

    /**
     * Get the path to the folder where to store files for a offline submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getSubmissionFolder
     * @param  {Number} assignId Assignment ID.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the path.
     */
    self.getSubmissionFolder = function(assignId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var siteFolderPath = $mmFS.getSiteFolder(siteId),
                submissionFolderPath = 'offlineassign/' + assignId + '/' + userId;

            return $mmFS.concatenatePaths(siteFolderPath, submissionFolderPath);
        });
    };

    /**
     * Get the path to the folder where to store files for a certain plugin in an offline submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#getSubmissionPluginFolder
     * @param  {Number} assignId   Assignment ID.
     * @param  {String} pluginName Name of the plugin. Must be unique (both in submission and feedback plugins).
     * @param  {Number} [userId]   User ID. If not defined, site's current user.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with the path.
     */
    self.getSubmissionPluginFolder = function(assignId, pluginName, userId, siteId) {
        return self.getSubmissionFolder(assignId, userId, siteId).then(function(folderPath) {
            return $mmFS.concatenatePaths(folderPath, pluginName);
        });
    };

    /**
     * Mark/Unmark a submission as being submitted.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#markSubmitted
     * @param  {Number} assignId         Assignment ID.
     * @param  {Number} courseId         Course ID the assign belongs to.
     * @param  {Boolean} submitted       True to mark as submitted, false to mark as not submitted.
     * @param  {Boolean} acceptStatement True to accept the submission statement, false otherwise.
     * @param  {Number} timemodified     The time the submission was last modified in online.
     * @param  {Number} [userId]         User ID. If not defined, site's current user.
     * @param  {String} [siteId]         Site ID. If not defined, current site.
     * @return {Promise}                 Promise resolved if marked, rejected if failure.
     */
    self.markSubmitted = function(assignId, courseId, submitted, acceptStatement, timemodified, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            // Check if there's a submission stored.
            return self.getSubmission(assignId, userId, siteId).catch(function() {
                // No submission, create an empty one.
                var now = new Date().getTime();
                return {
                    assignmentid: assignId,
                    courseid: courseId,
                    plugindata: {},
                    userid: userId,
                    onlinetimemodified: timemodified,
                    timecreated: now,
                    timemodified: now
                };
            }).then(function(submission) {
                // Mark the submission.
                submission.submitted = !!submitted;
                submission.submissionstatement = !!acceptStatement;
                return site.getDb().insert(mmaModAssignSubmissionsStore, submission);
            });
        });
    };

    /**
     * Save a submission to be sent later.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignOffline#saveSubmission
     * @param  {Number} assignId     Assignment ID.
     * @param  {Number} courseId     Course ID the assign belongs to.
     * @param  {Object} pluginData   Data to save.
     * @param  {Number} timemodified The time the submission was last modified in online.
     * @param  {Boolean} submitted   True if submission has been submitted, false otherwise.
     * @param  {Number} [userId]     User ID. If not defined, site's current user.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if stored, rejected if failure.
     */
    self.saveSubmission = function(assignId, courseId, pluginData, timemodified, submitted, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var now = new Date().getTime(),
                entry = {
                    assignmentid: assignId,
                    courseid: courseId,
                    plugindata: pluginData,
                    userid: userId,
                    submitted: !!submitted,
                    timecreated: now,
                    timemodified: now,
                    onlinetimemodified: timemodified
                };

            return site.getDb().insert(mmaModAssignSubmissionsStore, entry);
        });
    };

    return self;
});