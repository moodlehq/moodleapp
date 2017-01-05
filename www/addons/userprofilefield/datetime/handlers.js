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

angular.module('mm.addons.userprofilefield_datetime')

/**
 * Datetime user profile field handlers.
 *
 * @module mm.addons.userprofilefield_datetime
 * @ngdoc service
 * @name $mmaUserProfileFieldDatetimeHandler
 */
.factory('$mmaUserProfileFieldDatetimeHandler', function() {

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
        var hasTime = field.param3 && field.param3 !== '0' && field.param3 !== 'false',
            modelName = 'profile_field_' + field.shortname,
            date = angular.copy(model[modelName + '_date']),
            time;

        if (date) {
            if (hasTime && ionic.Platform.isIOS()) {
                // In iOS the time is in a different input. Add it to the date.
                time = model[modelName + '_time'];
                if (!time) {
                    return;
                }

                date.setHours(time.getHours());
                date.setMinutes(time.getMinutes());
            }

            return {
                type: 'datetime',
                name: 'profile_field_' + field.shortname,
                value: Math.round(date.getTime() / 1000)
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
        return 'mma-user-profile-field-datetime';
    };

    return self;
});
