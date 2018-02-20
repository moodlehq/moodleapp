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

angular.module('mm.addons.mod_choice')

.constant('mmaModChoiceOfflineResponsesStore', 'mma_mod_choice_offline_responses')

.config(function($mmSitesFactoryProvider, mmaModChoiceOfflineResponsesStore) {
    var stores = [
        {
            name: mmaModChoiceOfflineResponsesStore,
            keyPath: ['choiceid', 'userid'],
            indexes: [
                {
                    name: 'choiceid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'userid'
                },
                {
                    name: 'timecreated'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Choice offline service.
 *
 * @module mm.addons.mod_choice
 * @ngdoc service
 * @name $mmaModChoiceOffline
 */
.factory('$mmaModChoiceOffline', function($log, mmaModChoiceOfflineResponsesStore, $mmSitesManager, $mmSite) {

    $log = $log.getInstance('$mmaModChoiceOffline');

    var self = {};

    /**
     * Delete a response.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoiceOffline#deleteResponse
     * @param  {Number} choiceId    Choice ID to remove.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @param  {Number} [userId]    User the responses belong to. If not defined, current user in site.
     * @return {Promise}            Promise resolved if stored, rejected if failure.
     */
    self.deleteResponse = function(choiceId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.getDb().remove(mmaModChoiceOfflineResponsesStore, [choiceId, userId]);
        });
    };

    /**
     * Get all offline responses.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoiceOffline#getResponses
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with responses.
     */
    self.getResponses = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModChoiceOfflineResponsesStore);
        });
    };

    /**
     * Check if there are offline responses to send.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoiceOffline#hasResponse
     * @param  {Number} choiceId  Choice ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @param  {Number} [userId] User the responses belong to. If not defined, current user in site.
     * @return {Promise}          Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    self.hasResponse = function(choiceId, siteId, userId) {
        return self.getResponse(choiceId, siteId, userId).then(function(response) {
            return !!response.choiceid;
        }).catch(function(error) {
            // No offline data found, return false.
            return false;
        });;
    };

    /**
     * Get response to be synced.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoiceOffline#getResponse
     * @param  {Number} choiceId Choice ID to get.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the responses belong to. If not defined, current user in site.
     * @return {Promise}         Promise resolved with the object to be synced.
     */
    self.getResponse = function(choiceId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            return site.getDb().get(mmaModChoiceOfflineResponsesStore, [choiceId, userId]);
        });
    };

    /**
     * Offline version for sending a response to a choice to Moodle.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoiceOffline#saveResponse
     * @param  {Number}   choiceId  Choice ID.
     * @param  {String}   name      Choice name.
     * @param  {Number}   courseId  Course ID the choice belongs to.
     * @param  {Number[]} responses IDs of selected options.
     * @param  {Boolean}  deleting  If true, the user is deleting responses, if false, submitting.
     * @param  {String}   [siteId]  Site ID. If not defined, current site.
     * @param  {Number}   [userId] User the responses belong to. If not defined, current user in site.
     * @return {Promise}            Promise resolved when results are successfully submitted.
     */
    self.saveResponse = function(choiceId, name, courseId, responses, deleting, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var db = site.getDb(),
                response = {
                    choiceid: choiceId,
                    name: name,
                    courseid: courseId,
                    userid: userId,
                    responses: responses,
                    deleting: !!deleting,
                    timecreated: new Date().getTime()
                };
            return db.insert(mmaModChoiceOfflineResponsesStore, response);
        });

    };

    return self;
});
