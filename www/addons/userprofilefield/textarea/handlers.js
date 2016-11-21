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

angular.module('mm.addons.userprofilefield_textarea')

/**
 * Textarea user profile field handlers.
 *
 * @module mm.addons.userprofilefield_textarea
 * @ngdoc service
 * @name $mmaUserProfileFieldTextareaHandler
 */
.factory('$mmaUserProfileFieldTextareaHandler', function() {

    var self = {};

    /**
     * Whether or not the field is enabled for the site.
     *
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Get the data to send for the field based on the input data.
     *
     * @param  {Object} field          User field to get the data for.
     * @param  {Boolean} signup        True if user is in signup page.
     * @param  {String} [registerAuth] Register auth method. E.g. 'email'.
     * @param  {Object} model          Model with the input data.
     * @return {Object}                Data to send for the field.
     */
    self.getData = function(field, signup, registerAuth, model) {
        var name = 'profile_field_' + field.shortname;

        if (model[name]) {
            return {
                type: 'textarea',
                name: name,
                value: JSON.stringify({
                    text: model[name].text || '',
                    format: model[name].format || 1
                })
            };
        }
    };

    /**
     * Get the directive.
     *
     * @param {Object} field The profile field.
     * @return {String}      Directive's name.
     */
    self.getDirectiveName = function(field) {
        return 'mma-user-profile-field-textarea';
    };

    return self;
});
