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

angular.module('mm.addons.mod_workshop')

/**
 * Handler for rubric assessment strategy plugin.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc service
 * @name $mmaModWorkshopAssessmentStrategyRubricHandler
 */
.factory('$mmaModWorkshopAssessmentStrategyRubricHandler', function($translate, $q) {

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
     * Get the name of the directive to render this plugin.
     *
     * @return {String} Directive name.
     */
    self.getDirectiveName = function() {
        return 'mma-mod-workshop-assessment-strategy-rubric';
    };

    /**
     * Check if the assessment data has changed for a certain submission and workshop for a this strategy plugin.
     *
     * @param  {Object} originalData  Original data of the form.
     * @param  {Object} inputData     Data entered in the assessment form.
     * @return {Boolean}              True if data has changed, false otherwise.
     */
    self.hasDataChanged = function(originalData, inputData) {
        for (var x in originalData) {
            if (originalData[x].chosenlevelid != (inputData['chosenlevelid_' + x] || '')) {
                return true;
            }
        }
        return false;
    };

    /**
     * Prepare original values to be shown and compared.
     *
     * @param  {Object} form       Original data of the form.
     * @param  {Number} workshopId WorkShop Id
     * @return {Object}            With original values sorted.
     */
    self.getOriginalValues = function(form, workshopId) {
        var originalValues = [];

        angular.forEach(form.fields, function(field, n) {
            field.dimtitle = $translate.instant('mma.mod_workshop_assessment_rubric.dimensionnumber', {'$a': field.number});

            if (!form.current[n]) {
                form.current[n] = {};
            }

            originalValues[n] = {
                chosenlevelid: form.current[n].chosenlevelid || "",
                number: field.number
            };
        });

        return originalValues;
    };

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @param {Object}  inputData           Assessment data.
     * @param {Object}  form                Assessment form data.
     * @return {Promise}                    Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    self.prepareAssessmentData = function(inputData, form) {
        var errors = {},
            hasErrors = false;

        angular.forEach(form.fields, function(field, idx) {
            inputData['chosenlevelid_' + idx] = parseInt(inputData['chosenlevelid_' + idx], 10);
            if (!isNaN(inputData['chosenlevelid_' + idx]) && inputData['chosenlevelid_' + idx] >= 0) {
                inputData['chosenlevelid__idx_' + idx] = inputData['chosenlevelid_' + idx];
            } else {
                errors['chosenlevelid_' + idx] = $translate.instant('mma.mod_workshop_assessment_rubric.mustchooseone');
                hasErrors = true;
                return;
            }

            delete inputData['chosenlevelid_' + idx];

            inputData['gradeid__idx_' + idx] = parseInt(form.current[idx].gradeid, 10) || 0;
            inputData['dimensionid__idx_' + idx] = parseInt(field.dimensionid, 10);
        });
        if (hasErrors) {
            return $q.reject(errors);
        }
        return inputData;
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModWorkshopAssessmentStrategyDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the workshop addon will be packaged in custom apps.
    var $mmaModWorkshopAssessmentStrategyDelegate = $mmAddonManager.get('$mmaModWorkshopAssessmentStrategyDelegate');
    if ($mmaModWorkshopAssessmentStrategyDelegate) {
        $mmaModWorkshopAssessmentStrategyDelegate.registerHandler('mmaModWorkshopAssessmentStrategyRubric', 'rubric',
                '$mmaModWorkshopAssessmentStrategyRubricHandler');
    }
});
