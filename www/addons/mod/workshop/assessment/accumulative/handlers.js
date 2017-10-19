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
 * Handler for accumulative assessment strategy plugin.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc service
 * @name $mmaModWorkshopAssessmentStrategyAccumulativeHandler
 */
.factory('$mmaModWorkshopAssessmentStrategyAccumulativeHandler', function($mmGradesHelper, $q, $translate) {

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
        return 'mma-mod-workshop-assessment-strategy-accumulative';
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
            if (originalData[x].grade.value != inputData['grade_' + x]) {
                return true;
            }
            if (originalData[x].peercomment != inputData['peercomment_' + x]) {
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
     * @return {Promise}           Promise resolved with original values sorted.
     */
    self.getOriginalValues = function(form, workshopId) {
        var defaultGrade = $translate.instant('mm.core.choosedots'),
            originalValues = [],
            promises = [];

        angular.forEach(form.fields, function(field, n) {
            field.dimtitle = $translate.instant('mma.mod_workshop_assessment_accumulative.dimensionnumber', {'$a': field.number});

            var scale = parseInt(field.grade, 10) < 0 ? form.dimensionsinfo[n].scale : null;

            if (!form.current[n]) {
                form.current[n] = {};
            }

            originalValues[n] = {
                peercomment: form.current[n].peercomment || "",
                number: field.number
            };

            form.current[n].grade = form.current[n].grade ? parseInt(form.current[n].grade, 10) : -1;

            promises.push($mmGradesHelper.makeGradesMenu(field.grade, workshopId, defaultGrade, -1, scale).then(function(grades) {
                field.grades = grades;
                originalValues[n].grade = {
                    label: $mmGradesHelper.getGradeLabelFromValue(grades, form.current[n].grade) || defaultGrade,
                    value: form.current[n].grade
                };
            }));
        });

        return $q.all(promises).then(function() {
            return originalValues;
        });
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
            inputData['grade_' + idx] = parseInt(inputData['grade_' + idx], 10);
            if (!isNaN(inputData['grade_' + idx]) && inputData['grade_' + idx] >= 0) {
                inputData['grade__idx_' + idx] = inputData['grade_' + idx];
            } else {
                errors['grade_' + idx] = $translate.instant('mma.mod_workshop_assessment_accumulative.mustchoosegrade');
                hasErrors = true;
                return;
            }

            delete inputData['grade_' + idx];
            if (inputData['peercomment_' + idx]) {
                inputData['peercomment__idx_' + idx] = inputData['peercomment_' + idx];
            }
            delete inputData['peercomment_' + idx];

            inputData['gradeid__idx_' + idx] = parseInt(form.current[idx].gradeid, 10) || 0;
            inputData['dimensionid__idx_' + idx] = parseInt(field.dimensionid, 10);
            inputData['weight__idx_' + idx] = parseInt(field.weight, 10) ||  0;
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
        $mmaModWorkshopAssessmentStrategyDelegate.registerHandler('mmaModWorkshopAssessmentStrategyAccumulative', 'accumulative',
                '$mmaModWorkshopAssessmentStrategyAccumulativeHandler');
    }
});
