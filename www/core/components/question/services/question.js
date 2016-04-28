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

angular.module('mm.core.question')

.constant('mmQuestionAnswersStore', 'question_answers')

.config(function($mmSitesFactoryProvider, mmQuestionAnswersStore) {
    var stores = [
        {
            name: mmQuestionAnswersStore,
            keyPath: ['component', 'attemptid', 'name'],
            indexes: [
                {
                    name: 'userid'
                },
                {
                    name: 'component'
                },
                {
                    name: 'componentId'
                },
                {
                    name: 'attemptid'
                },
                {
                    name: 'name'
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'componentAndAttempt',
                    generator: function(obj) {
                        return [obj.component, obj.attemptid];
                    }
                },
                {
                    // Not using compound indexes because they seem to have issues with where().
                    name: 'componentAndComponentId',
                    generator: function(obj) {
                        return [obj.component, obj.componentId];
                    }
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Question service.
 *
 * @module mm.core.question
 * @ngdoc service
 * @name $mmQuestion
 */
.factory('$mmQuestion', function($log, $mmSite, $mmSitesManager, $mmUtil, $q, mmQuestionAnswersStore) {

    $log = $log.getInstance('$mmQuestion');

    var self = {};

    /**
     * Retrieve an attempt answers from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getAnswer
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} name      Answer's name.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the answers.
     */
    self.getAnswer = function(component, attemptId, name, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmQuestionAnswersStore, [component, attemptId, name]);
        });
    };

    /**
     * Retrieve an attempt answers from site DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#getAttemptAnswers
     * @param  {String} component Component the attempt belongs to.
     * @param  {Number} attemptId Attempt ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the answers.
     */
    self.getAttemptAnswers = function(component, attemptId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmQuestionAnswersStore, 'componentAndAttempt', [component, attemptId]);
        });
    };

    /**
     * Save answers in local DB.
     *
     * @module mm.core.question
     * @ngdoc method
     * @name $mmQuestion#saveAnswers
     * @param  {String} component   Component the answers belong to. E.g. 'mmaModQuiz'.
     * @param  {Number} componentId ID of the component the answers belong to.
     * @param  {Number} attemptId   Attempt ID.
     * @param  {Number} userId      User ID.
     * @param  {Object} answers     Answers to save.
     * @param  {Number} [timemod]   Time modified to set in the questions. If not defined, current time.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved in success, rejected otherwise.
     */
    self.saveAnswers = function(component, componentId, attemptId, userId, answers, timemod, siteId) {
        siteId = siteId || $mmSite.getId();
        timemod = timemod || $mmUtil.timestamp();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var db = site.getDb(),
                promises = [];

            angular.forEach(answers, function(value, name) {
                var entry = {
                    component: component,
                    componentId: componentId,
                    attemptid: attemptId,
                    userid: userId,
                    name: name,
                    value: value,
                    timemodified: timemod
                };
                promises.push(db.insert(mmQuestionAnswersStore, entry));
            });

            return $q.all(promises);
        });
    };

    return self;
});
