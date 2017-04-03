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

.constant('mmaModFeedbackResponsesStore', 'mma_mod_feedback_responses')

.config(function($mmSitesFactoryProvider, mmaModFeedbackResponsesStore) {
    var stores = [
        {
            name: mmaModFeedbackResponsesStore,
            keyPath: ['feedbackid', 'page'],
            indexes: [
                {
                    name: 'feedbackid'
                },
                {
                    name: 'page'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'responses'
                },
                {
                    name: 'timemodified'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Offline feedback factory.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc service
 * @name $mmaModFeedbackOffline
 */
.factory('$mmaModFeedbackOffline', function($mmSitesManager, $log, mmaModFeedbackResponsesStore, $mmUtil) {
    $log = $log.getInstance('$mmaModFeedbackOffline');

    var self = {};

    /**
     * Get if the feedback have something to be synced.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackOffline#hasFeedbackOfflineData
     * @param  {Number} feedbackId Feedback ID.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with true if the feedback have something to be synced.
     */
    self.hasFeedbackOfflineData = function(feedbackId, siteId) {
        return self.getFeedbackResponses(feedbackId, siteId).then(function(responses) {
           return !!responses.length;
        }).catch(function() {
            // No offline data found, return false.
            return false;
        });
    };

    /**
     * Get all the stored feedback responses data from all the feedback.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackOffline#getAllFeedbackResponses
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with entries.
     */
    self.getAllFeedbackResponses = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModFeedbackResponsesStore);
        });
    };

    /**
     * Get all the stored responses from a certain feedback.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackOffline#getFeedbackResponses
     * @param  {Number} feedbackId Feedback ID.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with responses.
     */
    self.getFeedbackResponses = function(feedbackId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModFeedbackResponsesStore, 'feedbackid', feedbackId);
        });
    };

    /**
     * Get the stored responses for a certain feedback page.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackOffline#getFeedbackPageResponses
     * @param  {Number} feedbackId Feedback ID.
     * @param  {Number} page       Page of the form to get responses from.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with responses.
     */
    self.getFeedbackPageResponses = function(feedbackId, page, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModFeedbackResponsesStore, [feedbackId, page]);
        });
    };

    /**
     * Delete the stored for a certain feedback page.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackOffline#deleteFeedbackPageResponses
     * @param  {Number} feedbackId Feedback ID.
     * @param  {Number} page       Page of the form to delete responses from.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved if deleted, rejected if failure.
     */
    self.deleteFeedbackPageResponses = function(feedbackId, page, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModFeedbackResponsesStore, [feedbackId, page]);
        });
    };

    /**
     * Save page responses to be sent later.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackOffline#saveResponses
     * @param  {Number} feedbackId   Feedback ID.
     * @param  {Number} page         The page being processed.
     * @param  {Object} responses    The data to be processed the key is the field name (usually type[index]_id)
     * @param  {Number} courseId     Course ID the feedback belongs to.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if stored, rejected if failure.
     */
    self.saveResponses = function(feedbackId, page, responses, courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {

            var now = $mmUtil.timestamp(),
                entry = {
                    feedbackid: feedbackId,
                    page: page,
                    courseid: courseId,
                    responses: responses,
                    timemodified: now
                };

            return site.getDb().insert(mmaModFeedbackResponsesStore, entry);
        });
    };

    return self;
});