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

angular.module('mm.core.user')

/**
 * Service to provide user functionalities.
 *
 * @module mm.core.user
 * @ngdoc service
 * @name $mmUser
 */
.factory('$mmUser', function($log, $q, $mmSite, $mmLang, $mmUtil, $translate) {

    $log = $log.getInstance('$mmUser');

    var self = {};

    /**
     * Get user profile's state name.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#getProfileStateName
     * @return {String} User profile's state name.
     */
    self.getProfileStateName = function() {
        return 'site.mm_user-profile';
    };

    /**
     * Get user profile. The type of profile retrieved depends on the params.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#getProfile
     * @param  {Number} userid   User's ID.
     * @param  {Number} courseid Optional - Course ID to get course profile, undefined or 0 to get site profile.
     * @return {Promise}         Promise to be resolved with the user data.
     */
    self.getProfile = function(userid, courseid) {
        if (courseid) {
            return self.getCourseProfile(userid, courseid);
        } else {
            return self.getSiteProfile(userid);
        }
    };

    /**
     * Get user's course profile.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#getCourseProfile
     * @param  {Number} userid   User ID.
     * @param  {Number} courseid Course ID.
     * @return {Promise}         Promise to be resolved with the user data.
     */
    self.getCourseProfile = function(userid, courseid) {
        $log.debug('Get participant with ID ' + userid + ' in course '+courseid);
        var deferred = $q.defer();

        var data = {
            "userlist[0][userid]": userid,
            "userlist[0][courseid]": courseid
        };

        $mmSite.read('core_user_get_course_user_profiles', data).then(function(users) {
            if (users.length == 0) {
                $mmLang.translateErrorAndReject(deferred, 'errorparticipantnotfound');
                return;
            }

            $mmUtil.getCountries().then(function(countries) {

                var user = users.shift();

                if (user.country && typeof(countries) !== 'undefined'
                                 && typeof(countries[user.country]) !== "undefined") {
                    user.country = countries[user.country];
                }

                deferred.resolve(user);

            });
        }, deferred.reject);

        return deferred.promise;
    };

    /**
     * Get user's site profile.
     * @todo To be implemented.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#getSiteProfile
     * @param  {Number} userid   User ID.
     * @return {Promise}         Promise to be resolved with the user data.
     */
    self.getSiteProfile = function(userid) {
        $log.debug('Get user with ID ' + userid);
        var deferred = $q.defer();

        deferred.resolve({});

        return deferred.promise;
    };

    /**
     * Formats a user address, concatenating address, city and country.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#formatAddress
     * @param  {String} address Address.
     * @param  {String} city    City..
     * @param  {String} country Country.
     * @return {String}         Formatted address.
     */
    self.formatAddress = function(address, city, country) {
        if (address) {
            address += city ? ', ' + city : '';
            address += country ? ', ' + country : '';
        }
        return address;
    };

    /**
     * Formats a user role list, translating and concatenating them.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#formatRoleList
     * @param  {Array} roles List of user roles.
     * @return {Promise}     Promise resolved with the formatted roles (string).
     */
    self.formatRoleList = function(roles) {
        var deferred = $q.defer();

        if (roles && roles.length > 0) {
            $translate('mm.user.roleseparator').then(function(separator) {
                var rolekeys = roles.map(function(el) {
                    return 'mm.user.'+el.shortname; // Set the string key to be translated.
                });

                $translate(rolekeys).then(function(roleNames) {
                    var roles = '';
                    for (var roleKey in roleNames) {
                        var roleName = roleNames[roleKey];
                        if (roleName.indexOf('mm.user.') > -1) {
                            // Role name couldn't be translated, leave it like it was.
                            roleName = roleName.replace('mm.user.', '');
                        }
                        roles += (roles != '' ? separator+' ' : '') + roleName;
                    }
                    deferred.resolve(roles);
                });
            });
        } else {
            deferred.resolve('');
        }
        return deferred.promise;
    };

    return self;
});
