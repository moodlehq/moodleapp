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

angular.module('mm.addons.mod_quiz')

/**
 * Quiz online service.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizOnline
 */
.factory('$mmaModQuizOnline', function($log, $mmSite, $mmSitesManager, $q, $mmUtil) {

    $log = $log.getInstance('$mmaModQuizOnline');

    var self = {};

    /**
     * Process an attempt, saving its data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOnline#processAttempt
     * @param  {Number} attemptId     Attempt ID.
     * @param  {Object} data          Data to save.
     * @param  {Object} preflightData Preflight required data (like password).
     * @param  {Boolean} finish       True to finish the quiz, false otherwise.
     * @param  {Boolean} timeup       True if the quiz time is up, false otherwise.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved in success, rejected otherwise.
     */
    self.processAttempt = function(attemptId, data, preflightData, finish, timeup, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                attemptid: attemptId,
                data: $mmUtil.objectToArrayOfObjects(data, 'name', 'value'),
                finishattempt: finish ? 1 : 0,
                timeup: timeup ? 1 : 0,
                preflightdata: $mmUtil.objectToArrayOfObjects(preflightData, 'name', 'value')
            };

            return site.write('mod_quiz_process_attempt', params).then(function(response) {
                if (response && response.warnings && response.warnings.length) {
                    // Reject with the first warning.
                    return $q.reject(response.warnings[0].message);
                } else if (response && response.state) {
                    return response.state;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Save an attempt data.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizOnline#saveAttempt
     * @param  {Number} attemptId     Attempt ID.
     * @param  {Object} data          Data to save.
     * @param  {Object} preflightData Preflight required data (like password).
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved in success, rejected otherwise.
     */
    self.saveAttempt = function(attemptId, data, preflightData, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                attemptid: attemptId,
                data: $mmUtil.objectToArrayOfObjects(data, 'name', 'value'),
                preflightdata: $mmUtil.objectToArrayOfObjects(preflightData, 'name', 'value')
            };

            return site.write('mod_quiz_save_attempt', params).then(function(response) {
                if (response && response.warnings && response.warnings.length) {
                    // Reject with the first warning.
                    return $q.reject(response.warnings[0].message);
                } else if (!response || !response.status) {
                    return $q.reject();
                }
            });
        });
    };

    return self;
});
