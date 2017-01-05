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
 * Handler for openclosedate quiz access rule.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaQuizAccessOpenCloseDateHandler
 */
.factory('$mmaQuizAccessOpenCloseDateHandler', function($mmaModQuiz) {

    var self = {};

    /**
     * Whether or not the rule is enabled for the site.
     *
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Check if a preflight check is required.
     *
     * @param  {Object} quiz      Quiz.
     * @param  {Object} [attempt] Attempt to continue. Not defined if starting a new attempt.
     * @param  {Boolean} prefetch True if prefetching, false if attempting the quiz.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Boolean}          True if preflight check required.
     */
    self.isPreflightCheckRequired = function(quiz, attempt, prefetch, siteId) {
        return false;
    };

    /**
     * Check if time left should be shown.
     *
     * @param  {Object} attempt Attempt.
     * @param  {Number} endTime The attempt end time (in seconds).
     * @param  {Number} timeNow The time to consider as 'now' (in seconds).
     * @return {Boolean}        True if it should show the time left.
     */
    self.shouldShowTimeLeft = function(attempt, endTime, timeNow) {
        // If this is a teacher preview after the close date, do not show the time.
        if (attempt.preview && timeNow > endTime) {
            return false;
        }

        // Show the time left only if it's less than QUIZ_SHOW_TIME_BEFORE_DEADLINE.
        if (timeNow > endTime - $mmaModQuiz.QUIZ_SHOW_TIME_BEFORE_DEADLINE) {
            return true;
        }
        return false;
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModQuizAccessRulesDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the quiz addon will be packaged in custom apps.
    var $mmaModQuizAccessRulesDelegate = $mmAddonManager.get('$mmaModQuizAccessRulesDelegate');
    if ($mmaModQuizAccessRulesDelegate) {
        $mmaModQuizAccessRulesDelegate.registerHandler('mmaQuizAccessOpenCloseDate', 'quizaccess_openclosedate',
                                '$mmaQuizAccessOpenCloseDateHandler');
    }
});
