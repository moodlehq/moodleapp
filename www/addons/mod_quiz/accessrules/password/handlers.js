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
.constant('mmaModQuizAccessPasswordStore', 'mod_quiz_access_password')

.config(function($mmSitesFactoryProvider, mmaModQuizAccessPasswordStore) {
    var stores = [
        {
            name: mmaModQuizAccessPasswordStore,
            keyPath: 'id',
            indexes: []
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Handler for password quiz access rule.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaQuizAccessPasswordHandler
 */
.factory('$mmaQuizAccessPasswordHandler', function($mmSitesManager, $mmSite, $q, mmaModQuizAccessPasswordStore) {

    var self = {};

    /**
     * Preflight form closed, reset password.
     *
     * @param  {Object} data Preflight data.
     */
    self.cleanPreflight = function(data) {
        delete data.quizpassword;
    };

    /**
     * Get a password stored in DB.
     *
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with password on success, rejected otherwise.
     */
    function getPasswordEntry(quizId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModQuizAccessPasswordStore, quizId);
        });
    }

    /**
     * Remove a password from DB.
     *
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved on success, rejected otherwise.
     */
    function removePassword(quizId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModQuizAccessPasswordStore, quizId);
        });
    }

    /**
     * Store a password in DB.
     *
     * @param  {Number} quizId   Quiz ID.
     * @param  {String} password Password.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved on success, rejected otherwise.
     */
    function storePassword(quizId, password, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var entry = {
                id: quizId,
                password: password,
                timemodified: new Date().getTime()
            };

            return site.getDb().insert(mmaModQuizAccessPasswordStore, entry);
        });
    }

    /**
     * Get fixed preflight data (data that doesn't require user interaction).
     *
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} preflightData Object where to store the preflight data.
     * @param  {Boolean} prefetch     True if prefetching, false if attempting the quiz.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved when preflight data has been added.
     */
    self.getFixedPreflightData = function(quiz, attempt, preflightData, prefetch, siteId) {
        if (quiz && quiz.id && typeof preflightData.quizpassword == 'undefined') {
            return getPasswordEntry(quiz.id, siteId).then(function(entry) {
                preflightData.quizpassword = entry.password;
            }).catch(function() {
                // Don't reject.
            });
        }

        return $q.when();
    };

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
     * @return {Promise}          Promise resolved with a boolean: true if preflight check required, false otherwise.
     */
    self.isPreflightCheckRequired = function(quiz, attempt, prefetch, siteId) {
        // Check if we have a password stored.
        return getPasswordEntry(quiz.id, siteId).then(function() {
            return false;
        }).catch(function() {
            // Not stored.
            return true;
        });
    };

    /**
     * Get the name of the directive to be rendered in the preflight form.
     *
     * @return {String} Directive name.
     */
    self.getPreflightDirectiveName = function() {
        return 'mma-quiz-access-password-preflight';
    };

    /**
     * The preflight check has passed. This is a chance to record that fact in some way.
     *
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} preflightData Object where to store the preflight data.
     * @param  {Boolean} prefetch     True if prefetching, false if attempting the quiz.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved when done.
     */
    self.notifyPreflightCheckPassed = function(quiz, attempt, preflightData, prefetch, siteId) {
        if (quiz && quiz.id && typeof preflightData.quizpassword != 'undefined') {
            return storePassword(quiz.id, preflightData.quizpassword, siteId);
        }

        return $q.when();
    };

    /**
     * The preflight check has failed.
     *
     * @param  {Object} quiz          Quiz.
     * @param  {Object} attempt       Attempt.
     * @param  {Object} preflightData Object where to store the preflight data.
     * @param  {Boolean} prefetch     True if prefetching, false if attempting the quiz.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved when done.
     */
    self.notifyPreflightCheckFailed = function(quiz, attempt, preflightData, prefetch, siteId) {
        if (quiz && quiz.id) {
            return removePassword(quiz.id, siteId);
        }

        return $q.when();
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModQuizAccessRulesDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the quiz addon will be packaged in custom apps.
    var $mmaModQuizAccessRulesDelegate = $mmAddonManager.get('$mmaModQuizAccessRulesDelegate');
    if ($mmaModQuizAccessRulesDelegate) {
        $mmaModQuizAccessRulesDelegate.registerHandler('mmaQuizAccessPassword', 'quizaccess_password',
                                '$mmaQuizAccessPasswordHandler');
    }
});
