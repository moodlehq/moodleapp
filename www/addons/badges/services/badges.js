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

angular.module('mm.addons.badges')

/**
 * Badges factory.
 *
 * @module mm.addons.badges
 * @ngdoc service
 * @name $mmaBadges
 */
.factory('$mmaBadges', function($log, $mmSitesManager) {
    $log = $log.getInstance('$mmaBadges');

    var self = {};

    /**
     * Returns whether or not the badge plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.badges
     * @ngdoc method
     * @name $mmaBadges#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    self.isPluginEnabled = function(siteId) {

        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (!site.canUseAdvancedFeature('enablebadges')) {
                return false;
            } else if (!site.wsAvailable('core_badges_get_user_badges') || !site.wsAvailable('core_course_get_user_navigation_options')) {
                return false;
            }

            return true;
        });
    };

    /**
     * Get the cache key for the get badges call.
     *
     * @param  {Number} courseId ID of the course to get the badges from.
     * @param  {Number} userId   ID of the user to get the badges from.
     * @return {String}          Cache key.
     */
    function getBadgesCacheKey(courseId, userId) {
        return 'mmaBadges:badges:' + courseId + ':' + userId;
    }

    /**
     * Get issued badges for a certain user in a course.
     *
     * @module mm.addons.badges
     * @ngdoc method
     * @name $mmaBadges#getUserBadges
     * @param  {Number} courseId     ID of the course to get the badges from.
     * @param  {Number} userId       ID of the user to get the badges from.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise to be resolved when the badges are retrieved.
     */
    self.getUserBadges = function(courseId, userId, siteId) {

        $log.debug('Get badges for course ' + courseId);

        return $mmSitesManager.getSite(siteId).then(function(site) {

            var data = {
                    courseid : courseId,
                    userid : userId
                },
                presets = {
                    cacheKey: getBadgesCacheKey(courseId, userId)
                };

            return site.read('core_badges_get_user_badges', data, presets).then(function(response) {
                if (response && response.badges) {
                    return response.badges;
                } else {
                    return $q.reject();
                }
            });
        });
    };


    /**
     * Invalidate get badges WS call.
     *
     * @module mm.addons.badges
     * @ngdoc method
     * @name $mmaBadges#invalidateUserBadges
     * @param {Number} courseId  Course ID.
     * @param  {Number} userId   ID of the user to get the badges from.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when data is invalidated.
     */
    self.invalidateUserBadges = function(courseId, userId, siteId) {

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getBadgesCacheKey(courseId, userId));
        });
    };

    return self;
});
