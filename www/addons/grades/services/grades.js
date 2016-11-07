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

angular.module('mm.addons.grades')

/**
 * Service to handle grades.
 *
 * @module mm.addons.grades
 * @ngdoc service
 * @name $mmaGrades
 */
.factory('$mmaGrades', function($q, $log, $mmSite, $mmCourses, $mmSitesManager) {

    $log = $log.getInstance('$mmaGrades');

    var self = {};

    /**
     * Get cache key for grade table data WS calls.
     *
     * @param {Number} courseId ID of the course to get the grades from.
     * @param {Number} userId   ID of the user to get the grades from.
     * @return {String}         Cache key.
     */
    function getGradesTableCacheKey(courseId, userId) {
        return 'mmaGrades:table:' + courseId + ':' + userId;
    }

    /**
     * Get cache key for grade table data WS calls.
     *
     * @param {Number} courseId     ID of the course to get the grades from.
     * @param {Number} userId       ID of the user to get the grades from.
     * @param {Number} [groupId]    ID of the group to get the grades from. Default: 0.
     * @return {String}         Cache key.
     */
    function getGradeItemsCacheKey(courseId, userId, groupId) {
        groupId = groupId || 0;
        return 'mmaGrades:items:' + courseId + ':' + userId + ':' + groupId;
    }

    /**
     * Invalidates grade table data WS calls.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#invalidateGradesTableData
     * @param {Number} courseId Course ID.
     * @param {Number} userId   User ID.
     * @param {Number}  [siteId]   Site id (empty for current site).
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateGradesTableData = function(courseId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getGradesTableCacheKey(courseId, userId));
        });
    };

    /**
     * Invalidates grade items data WS calls.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#invalidateGradeItemsData
     * @param {Number}  courseId   Course ID.
     * @param {Number}  userId     User ID.
     * @param {Number}  [groupId]  Group ID. Default 0.
     * @param {Number}  [siteId]   Site id (empty for current site).
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateGradeItemsData = function(courseId, userId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getGradeItemsCacheKey(courseId, userId, groupId));
        });
    };

    /**
     * Returns whether or not the plugin is enabled for a certain site.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Boolean}         True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('gradereport_user_get_grades_table');
        });
    };

    /**
     * Returns whether or not the grade addon is enabled for a certain course.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#isPluginEnabledForCourse
     * @param {Number} courseId  Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabledForCourse = function(courseId, siteId) {
        if (!courseId) {
            return $q.reject();
        }

        return $mmCourses.getUserCourse(courseId, true, siteId).then(function(course) {
            if (course && typeof course.showgrades != 'undefined' && course.showgrades == 0) {
                return false;
            }
            return true;
        });
    };

    /**
     * Returns whether or not the grade addon is enabled for a certain user.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#isPluginEnabledForUser
     * @param  {Number} courseId Course ID.
     * @param  {Number} userId   User ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabledForUser = function(courseId, userId) {
        // We don't use the getGradesTable function to prevent formatting the table.
        var data = {
                courseid: courseId,
                userid: userId
            };
        return $mmSite.read('gradereport_user_get_grades_table', data, {}).then(function() {
            return true;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Get the grades for a certain course.
     * For now we only support gradereport_user_get_grades_table. It returns the complete grades table.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#getGradesTable
     * @param {Number} courseId ID of the course to get the grades from.
     * @param {Number} userId   ID of the user to get the grades from.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise to be resolved when the grades table is retrieved.
     */
    self.getGradesTable = function(courseId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {

            $log.debug('Get grades for course ' + courseId + ' and user ' + userId);

            var data = {
                    courseid : courseId,
                    userid   : userId
                },
                preSets = {
                    cacheKey: getGradesTableCacheKey(courseId, userId)
                };

            return site.read('gradereport_user_get_grades_table', data, preSets).then(function (table) {
                if (table && table.tables && table.tables[0]) {
                    return table.tables[0];
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get the grade items for a certain course.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#getGradeItems
     * @param {Number} courseId     ID of the course to get the grades from.
     * @param {Number} userId       ID of the user to get the grades from.
     * @param {Number} [groupId]    ID of the group to get the grades from. Default 0.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise to be resolved when the grades are retrieved.
     */
    self.getGradeItems = function(courseId, userId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            $log.debug('Get grades for course ' + courseId + ', user ' + userId);

            var data = {
                    courseid : courseId,
                    userid   : userId,
                    groupid  : groupId || 0
                },
                preSets = {
                    cacheKey: getGradeItemsCacheKey(courseId, userId, groupId)
                };

            return site.read('gradereport_user_get_grade_items', data, preSets).then(function(grades) {
                if (grades && grades.usergrades && grades.usergrades[0]) {
                    return grades.usergrades[0];
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get the grade items for a certain module. Keep in mind that may have more than one item to include outcomes and scales.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#getGradeModuleItems
     * @param {Number} courseId     ID of the course to get the grades from.
     * @param {Number} moduleId     ID of the module to get the grades from.
     * @param {Number} userId       ID of the user to get the grades from.
     * @param {Number} [groupId]    ID of the group to get the grades from.
     * @param {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}            Promise to be resolved when the grades are retrieved.
     */
    self.getGradeModuleItems = function(courseId, moduleId, userId, groupId, siteId) {
        return self.getGradeItems(courseId, userId, groupId, siteId).then(function(grades) {
            if (grades && grades.gradeitems) {
                var items = [];
                for (var x in grades.gradeitems) {
                    if (grades.gradeitems[x].cmid == moduleId) {
                        items.push(grades.gradeitems[x]);
                    }
                }
                if (items.length > 0) {
                    return items;
                }
            }
            return $q.reject();
        });
    };

    return self;
});
