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

.constant('mmaModSurveyAnswersStore', 'mma_mod_survey_answers')

.config(function($mmSitesFactoryProvider, mmaModSurveyAnswersStore) {
    var stores = [
        {
            name: mmaModSurveyAnswersStore,
            keyPath: ['surveyid', 'userid'],
            indexes: [
                {
                    name: 'surveyid'
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
 * Offline survey factory.
 *
 * @module mm.addons.mod_survey
 * @ngdoc service
 * @name $mmaModSurveyOffline
 */
.factory('$mmaModSurveyOffline', function($mmSitesManager, $log, $mmSite, mmaModSurveyAnswersStore) {
    $log = $log.getInstance('$mmaModSurveyOffline');

    var self = {};

    /**
     * Delete a survey answers.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyOffline#deleteSurveyAnswers
     * @param  {Number} surveyId Survey ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the answers belong to. If not defined, current user in site.
     * @return {Promise}         Promise resolved if deleted, rejected if failure.
     */
    self.deleteSurveyAnswers = function(surveyId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            return site.getDb().remove(mmaModSurveyAnswersStore, [surveyId, userId]);
        });
    };

    /**
     * Get all the stored data from all the surveys.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyOffline#getAllData
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with answers.
     */
    self.getAllData = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModSurveyAnswersStore);
        });
    };

    /**
     * Get a survey stored data.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyOffline#getSurveyData
     * @param  {Number} surveyId Survey ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the answers belong to. If not defined, current user in site.
     * @return {Promise}         Promise resolved with the data.
     */
    self.getSurveyData = function(surveyId, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            return site.getDb().get(mmaModSurveyAnswersStore, [surveyId, userId]);
        });
    };

    /**
     * Get a survey stored answers.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyOffline#getSurveyAnswers
     * @param  {Number} surveyId Survey ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the answers belong to. If not defined, current user in site.
     * @return {Promise}         Promise resolved with the answers.
     */
    self.getSurveyAnswers = function(surveyId, siteId, userId) {
        return self.getSurveyData(surveyId, siteId, userId).then(function(entry) {
            return entry.answers || [];
        }).catch(function() {
            // No answers found.
            return [];
        });
    };

    /**
     * Check if there are offline answers to send.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyOffline#hasAnswers
     * @param  {Number} surveyId  Survey ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @param  {Number} [userId]  User the answers belong to. If not defined, current user in site.
     * @return {Promise}          Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    self.hasAnswers = function(surveyId, siteId, userId) {
        return self.getSurveyAnswers(surveyId, siteId, userId).then(function(answers) {
            return !!answers.length;
        });
    };

    /**
     * Save answers to be sent later.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyOffline#saveAnswers
     * @param  {Number} surveyId  Survey ID.
     * @param  {String} name      Survey name.
     * @param  {Number} courseId  Course ID the survey belongs to.
     * @param  {Object[]} answers Answers.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @param  {Number} [userId]  User the answers belong to. If not defined, current user in site.
     * @return {Promise}          Promise resolved if stored, rejected if failure.
     */
    self.saveAnswers = function(surveyId, name, courseId, answers, siteId, userId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var entry = {
                    surveyid: surveyId,
                    name: name,
                    courseid: courseId,
                    userid: userId,
                    answers: answers,
                    timecreated: new Date().getTime()
                };

            return site.getDb().insert(mmaModSurveyAnswersStore, entry);
        });
    };

    return self;
});
