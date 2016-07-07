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

/**
 * Helper to gather some common functions for assign.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignHelper
 */
.factory('$mmaModAssignHelper', function($mmUtil, $mmaModAssignSubmissionDelegate) {

    var self = {};

    /**
     * Clear plugins temporary data because a submission was cancelled.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#clearSubmissionPluginTmpData
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to clear the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Void}
     */
    self.clearSubmissionPluginTmpData = function(assign, submission, inputData) {
        angular.forEach(submission.plugins, function(plugin) {
            $mmaModAssignSubmissionDelegate.clearTmpData(assign, submission, plugin, inputData);
        });
    };

    /**
     * Retrieve the answers entered in a form.
     * We don't use ng-model because it doesn't detect changes done by JavaScript.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#getAnswersFromForm
     * @param  {Object} form Form (DOM element).
     * @return {Object}      Object with the answers.
     */
    self.getAnswersFromForm = function(form) {
        if (!form || !form.elements) {
            return {};
        }

        var answers = {};

        angular.forEach(form.elements, function(element) {
            var name = element.name || '';
            // Ignore flag and submit inputs.
            if (!name || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            // Get the value.
            if (element.type == 'checkbox') {
                answers[name] = !!element.checked;
            } else if (element.type == 'radio') {
                if (element.checked) {
                    answers[name] = element.value;
                }
            } else {
                answers[name] = element.value;
            }
        });

        return answers;
    };

    /**
     * Check if the submission data has changed for a certain submission and assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#hasSubmissionDataChanged
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Promise}           Promise resolved with true if data has changed, resolved with false otherwise.
     */
    self.hasSubmissionDataChanged = function(assign, submission, inputData) {
        var hasChanged = false,
            promises = [];

        angular.forEach(submission.plugins, function(plugin) {
            promises.push($mmaModAssignSubmissionDelegate.hasPluginDataChanged(assign, submission, plugin, inputData)
                    .then(function(changed) {
                if (changed) {
                    hasChanged = true;
                }
            }).catch(function() {
                // Ignore errors.
            }));
        });

        return $mmUtil.allPromises(promises).then(function() {
            return hasChanged;
        });
    };

    /**
     * Prepare and return the plugin data to send for a certain submission and assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignHelper#prepareSubmissionPluginData
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Promise}           Promise resolved with plugin data to send to server.
     */
    self.prepareSubmissionPluginData = function(assign, submission, inputData) {
        var pluginData = {},
            promises = [];

        angular.forEach(submission.plugins, function(plugin) {
            promises.push($mmaModAssignSubmissionDelegate.preparePluginSubmissionData(
                    assign, submission, plugin, inputData, pluginData));
        });

        return $mmUtil.allPromises(promises).then(function() {
            return pluginData;
        });
    };

    return self;
});
