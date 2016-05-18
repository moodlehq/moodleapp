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
 * Mod quiz prefetch handler.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizPrefetchHandler
 */
.factory('$mmaModQuizPrefetchHandler', function($mmaModQuiz, $q, mmaModQuizComponent) {

    var self = {};

    self.component = mmaModQuizComponent;

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getDownloadSize
     * @param {Object} module    Module to get the size.
     * @param {Number} courseId  Course ID the module belongs to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Number}          Size.
     */
    self.getDownloadSize = function(module, courseId, siteId) {
        // We return 1 because 0 is considered as "cannot calculate".
        return 1;
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getFiles
     * @param {Object} module    Module to get the files.
     * @param {Number} courseId  Course ID the module belongs to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Object[]}        List of files.
     */
    self.getFiles = function(module, courseId, siteId) {
        return [];
    };

    /**
     * Get revision of a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Number}         Promise resolved with revision.
     */
    self.getRevision = function(module, courseId) {
        return $mmaModQuiz.getQuizIdFromModule(module, courseId).then(function(quizId) {
            return $mmaModQuiz.getUserAttempts(quizId).then(function(attempts) {
                return $mmaModQuiz.getQuizRevisionFromAttempts(attempts);
            });
        });
    };

    /**
     * Get timemodified of a quiz.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#getTimemodified
     * @param {Object} module    Module to get the timemodified.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        return $mmaModQuiz.getQuizIdFromModule(module, courseId).then(function(quizId) {
            return $mmaModQuiz.getUserAttempts(quizId).then(function(attempts) {
                return $mmaModQuiz.getQuizTimemodifiedFromAttempts(attempts);
            });
        });
    };

    /**
     * Check if a quiz is downloadable.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#isDownloadable
     * @param {Object} module    Module to get the timemodified.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        return $mmaModQuiz.getQuiz(courseId, module.id).then(function(quiz) {
            if (quiz.allowofflineattempts !== 1 || quiz.hasquestions === 0) {
                return false;
            }

            // Not downloadable if we reached max attempts.
            return $mmaModQuiz.getUserAttempts(quiz.id).then(function(attempts) {
                var isLastFinished = !attempts.length || $mmaModQuiz.isAttemptFinished(attempts[attempts.length - 1].state);
                return quiz.attempts === 0 || quiz.attempts > attempts.length || !isLastFinished;
            });
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#isEnabled
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isEnabled = function() {
        return $mmaModQuiz.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizPrefetchHandler#prefetch
     * @param { Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when the prefetch is finished. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return $mmaModQuiz.prefetch(module, courseId, single);
    };

    return self;
});
