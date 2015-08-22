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

.constant('mmCoreUsersStore', 'users')

.config(function($mmSitesFactoryProvider, mmCoreUsersStore) {
    var stores = [
        {
            name: mmCoreUsersStore,
            keyPath: 'id'
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Service to provide user functionalities.
 *
 * @module mm.core.user
 * @ngdoc service
 * @name $mmUser
 */
.factory('$mmUser', function($log, $q, $mmSite, $mmUtil, $translate, mmCoreUsersStore) {

    $log = $log.getInstance('$mmUser');

    var self = {};

    /**
     * Store user basic information in local DB to be retrieved if the WS call fails.
     *
     * @param  {Number} id User ID.
     * @return {Promise}   Promise resolve when the user is deleted.
     */
    self.deleteStoredUser = function(id) {
        var db = $mmSite.getDb();
        self.invalidateUserCache(id); // Invalidate WS calls.
        return db.remove(mmCoreUsersStore, parseInt(id));
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
            $translate('mm.core.elementseparator').then(function(separator) {
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
                        roles += (roles != '' ? separator: '') + roleName;
                    }
                    deferred.resolve(roles);
                });
            });
        } else {
            deferred.resolve('');
        }
        return deferred.promise;
    };

    /**
     * Get user profile. The type of profile retrieved depends on the params.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#getProfile
     * @param  {Number} userid      User's ID.
     * @param  {Number} [courseid]  Course ID to get course profile, undefined or 0 to get site profile.
     * @param  {Boolean} forceLocal True to retrieve the user data from local DB, false to retrieve it from WS.
     * @return {Promise}            Promise resolved with the user data.
     */
    self.getProfile = function(userid, courseid, forceLocal) {

        var deferred = $q.defer();

        if (forceLocal) {
            self.getUserFromLocal(userid).then(deferred.resolve, function() {
                self.getUserFromWS(userid, courseid).then(deferred.resolve, deferred.reject);
            });
        } else {
            self.getUserFromWS(userid, courseid).then(deferred.resolve, function() {
                self.getUserFromLocal(userid).then(deferred.resolve, deferred.reject);
            });
        }

        return deferred.promise;
    };

    /**
     * Invalidates user WS calls.
     *
     * @param  {Number} userid User ID.
     * @return {String}        Cache key.
     */
    function getUserCacheKey(userid) {
        return 'mmUser:data:'+userid;
    }

    /**
     * Get user basic information from local DB.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#getUserFromLocal
     * @param  {Number} id User ID.
     * @return {Promise}   Promise resolve when the user is retrieved.
     */
    self.getUserFromLocal = function(id) {
        var db = $mmSite.getDb();
        return db.get(mmCoreUsersStore, parseInt(id));
    };

    /**
     * Get user profile from WS.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#getUserFromWS
     * @param  {Number} id         User ID.
     * @param  {Number} [courseid] Course ID to get course profile, undefined or 0 to get site profile.
     * @return {Promise}           Promise resolve when the user is retrieved.
     */
    self.getUserFromWS = function(userid, courseid) {
        var wsName,
            data,
            preSets ={
                cacheKey: getUserCacheKey(userid)
            };

        // Determine WS and data to use.
        if (courseid > 1) {
            $log.debug('Get participant with ID ' + userid + ' in course '+courseid);
            wsName = 'core_user_get_course_user_profiles';
            data = {
                "userlist[0][userid]": userid,
                "userlist[0][courseid]": courseid
            };
        } else {
            $log.debug('Get user with ID ' + userid);
            if ($mmSite.wsAvailable('core_user_get_users_by_field')) {
                wsName = 'core_user_get_users_by_field';
                data = {
                    'field': 'id',
                    'values[0]': userid
                };
            } else {
                wsName = 'core_user_get_users_by_id';
                data = {
                    'userids[0]': userid
                };
            }
        }

        return $mmSite.read(wsName, data, preSets).then(function(users) {
            if (users.length == 0) {
                return $q.reject();
            }

            var user = users.shift();
            if (user.country) {
                user.country = $mmUtil.getCountryName(user.country);
            }
            self.storeUser(user.id, user.fullname, user.profileimageurl);
            return user;
        });
    };

    /**
     * Invalidates user WS calls.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#invalidateUserCache
     * @param  {Number} userid User ID.
     * @return {Promise}       Promise resolved when the data is invalidated.
     */
    self.invalidateUserCache = function(userid) {
        return $mmSite.invalidateWsCacheForKey(getUserCacheKey(userid));
    };

    /**
     * Store user basic information in local DB to be retrieved if the WS call fails.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUser#storeUser
     * @param  {Number} id       User ID.
     * @param  {String} fullname User full name.
     * @param  {String} avatar   User avatar URL.
     * @return {Promise}         Promise resolve when the user is stored.
     */
    self.storeUser = function(id, fullname, avatar) {
        var db = $mmSite.getDb();
        return db.insert(mmCoreUsersStore, {
            id: parseInt(id),
            fullname: fullname,
            profileimageurl: avatar
        });
    };

    /**
     * Store users basic information in local DB.
     *
     * @param  {Object[]} users Users to store. Fields stored: id, fullname, profileimageurl.
     * @return {Promise}        Promise resolve when the user is stored.
     */
    self.storeUsers = function(users) {
        var promises = [];

        angular.forEach(users, function(user) {
            promises.push(self.storeUser(user.id, user.fullname, user.profileimageurl));
        });

        return $q.all(promises);
    };

    return self;
});
