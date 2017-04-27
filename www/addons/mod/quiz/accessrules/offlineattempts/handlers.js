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
 * Handler for offline attempts quiz access rule.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaQuizAccessOfflineAttemptsHandler
 */
.factory('$mmaQuizAccessOfflineAttemptsHandler', function(mmaModQuizSyncTime) {

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
        if (prefetch) {
            return false;
        }

        if (!attempt) {
            return true;
        }

        // Show warning if last sync was a while ago.
        return new Date().getTime() - mmaModQuizSyncTime > attempt.quizSyncTime;
    };

    /**
     * Get fixed preflight data (data that doesn't require user interaction).
     *
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} preflightData Object where to store the preflight data.
     * @param  {Boolean} prefetch     True if prefetching, false if attempting the quiz.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Void}
     */
    self.getFixedPreflightData = function(quiz, attempt, preflightData, prefetch, siteId) {
        preflightData.confirmdatasaved = 1;
    };

    /**
     * Get the name of the directive to be rendered in the preflight form.
     *
     * @return {String} Directive name.
     */
    self.getPreflightDirectiveName = function() {
        return 'mma-quiz-access-offline-attempts-preflight';
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModQuizAccessRulesDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the quiz addon will be packaged in custom apps.
    var $mmaModQuizAccessRulesDelegate = $mmAddonManager.get('$mmaModQuizAccessRulesDelegate');
    if ($mmaModQuizAccessRulesDelegate) {
        $mmaModQuizAccessRulesDelegate.registerHandler('mmaQuizAccessOfflineAttempts', 'quizaccess_offlineattempts',
                                '$mmaQuizAccessOfflineAttemptsHandler');
    }
});
