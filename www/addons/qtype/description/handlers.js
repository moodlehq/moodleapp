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

angular.module('mm.addons.qtype_description')

/**
 * Description question handlers.
 *
 * @module mm.addons.qtype_description
 * @ngdoc service
 * @name $mmaQtypeDescriptionHandler
 */
.factory('$mmaQtypeDescriptionHandler', function() {

    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Get the behaviour for this question.
     *
     * @param  {Object} question  Question to get the directive for.
     * @param  {String} behaviour Default behaviour.
     * @return {String}           Behaviour name.
     */
    self.getBehaviour = function(question, behaviour) {
        return 'informationitem';
    };

    /**
     * Get the directive.
     *
     * @param {Object} question The question.
     * @return {String}         Directive's name.
     */
    self.getDirectiveName = function(question) {
        return 'mma-qtype-description';
    };

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     *
     * @param  {Object} question        Question
     * @param  {String} offlineSeqCheck Offline sequencecheck.
     * @return {Boolean}                True if valid, false otherwise.
     */
    self.validateSequenceCheck = function(question, offlineSeqCheck) {
        // Descriptions don't have any answer so we'll always treat them as valid.
        return true;
    };

    return self;
});
