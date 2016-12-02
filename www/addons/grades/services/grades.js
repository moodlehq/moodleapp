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
.factory('$mmaGrades', function($q, $log, $mmSite, $mmCourses, $mmSitesManager, $mmUtil, $mmText) {

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
     * Returns whether or not WS Grade Items is avalaible.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#isGradeItemsAvalaible
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Boolean}         True if ws is avalaible, false otherwise.
     */
    self.isGradeItemsAvalaible = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('gradereport_user_get_grade_items');
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
     * @param  {Number}  courseId             ID of the course to get the grades from.
     * @param  {Number}  [userId]             ID of the user to get the grades from.
     * @param  {String}  [siteId]             Site ID. If not defined, current site.
     * @param  {Boolean} [ignoreCache=false]  True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise}                      Promise to be resolved when the grades table is retrieved.
     */
    self.getGradesTable = function(courseId, userId, siteId, ignoreCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            $log.debug('Get grades for course ' + courseId + ' and user ' + userId);

            var data = {
                    courseid : courseId,
                    userid   : userId
                },
                preSets = {
                    cacheKey: getGradesTableCacheKey(courseId, userId)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

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
     * @param  {Number}  courseId             ID of the course to get the grades from.
     * @param  {Number}  [userId]             ID of the user to get the grades from. If not defined use site's current user.
     * @param  {Number}  [groupId]            ID of the group to get the grades from. Default 0.
     * @param  {String}  [siteId]             Site ID. If not defined, current site.
     * @param  {Boolean} [ignoreCache=false]  True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise}                      Promise to be resolved when the grades are retrieved.
     */
    self.getGradeItems = function(courseId, userId, groupId, siteId, ignoreCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            $log.debug('Get grades for course ' + courseId + ', user ' + userId);

            var data = {
                    courseid : courseId,
                    userid   : userId,
                    groupid  : groupId || 0
                },
                preSets = {
                    cacheKey: getGradeItemsCacheKey(courseId, userId, groupId)
                };

            if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

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
     * @param  {Number}  courseId             ID of the course to get the grades from.
     * @param  {Number}  moduleId             ID of the module to get the grades from.
     * @param  {Number}  [userId]             ID of the user to get the grades from. If not defined use site's current user.
     * @param  {Number}  [groupId]            ID of the group to get the grades from.
     * @param  {String}  [siteId]             Site ID. If not defined, current site.
     * @param  {Boolean} [ignoreCache=false]  True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise}                      Promise to be resolved when the grades are retrieved.
     */
    function getGradeModuleItems(courseId, moduleId, userId, groupId, siteId, ignoreCache) {
        return self.getGradeItems(courseId, userId, groupId, siteId, ignoreCache).then(function(grades) {
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
    }

    /**
     * Gets a module grade and feedback from the gradebook.
     * Fallback function only used if 'gradereport_user_get_grade_items' WS is not avalaible Moodle < 3.2.
     *
     * @param  {Number}  courseId             Course ID.
     * @param  {Number}  moduleId             Quiz module ID.
     * @param  {Number}  [userId]             User ID. If not defined use site's current user.
     * @param  {String}  [siteId]             Site ID. If not defined, current site.
     * @param  {Boolean} [ignoreCache=false]  True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise}                      Promise resolved with an object containing the grade and the feedback.
     */
    function getGradesItemFromTable(courseId, moduleId, userId, siteId, ignoreCache) {
        return self.getGradesTable(courseId, userId, siteId, ignoreCache).then(function(table) {
            // Search the module we're looking for.
            var regex = /href="([^"]*\/mod\/[^"|^\/]*\/[^"|^\.]*\.php[^"]*)/, // Find href containing "/mod/xxx/xxx.php".
                matches,
                hrefParams,
                entry,
                items = [];

            for (var i = 0; i < table.tabledata.length; i++) {
                entry = table.tabledata[i];
                if (entry.itemname && entry.itemname.content) {
                    matches = entry.itemname.content.match(regex);
                    if (matches && matches.length) {
                        hrefParams = $mmUtil.extractUrlParams(matches[1]);
                        if (hrefParams && hrefParams.id == moduleId) {
                            var item = {};
                            angular.forEach(entry, function(value, name) {
                                if (value && value.content) {
                                    // Add formatted on name for compatibility.
                                    switch (name) {
                                        case 'grade':
                                            var grade = parseFloat(value.content);
                                            if (!isNaN(grade)) {
                                                item.gradeformatted = grade;
                                            }
                                            break;
                                        case 'percentage':
                                        case 'range':
                                            name += 'formatted';
                                        default:
                                            item[name] = $mmText.decodeHTML(value.content).trim();
                                    }
                                }
                            });
                            items.push(item);
                        }
                    }
                }
            }

            if (items.length > 0) {
                return items;
            }

            return $q.reject();
        });
    }

    /**
     * Get the grade items for a certain module. Keep in mind that may have more than one item to include outcomes and scales.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#getGradeModuleItems
     * @param  {Number}  courseId             ID of the course to get the grades from.
     * @param  {Number}  moduleId             ID of the module to get the grades from.
     * @param  {Number}  [userId]             ID of the user to get the grades from. If not defined use site's current user.
     * @param  {Number}  [groupId]            ID of the group to get the grades from. Not used for old gradebook table.
     * @param  {String}  [siteId]             Site ID. If not defined, current site.
     * @param  {Boolean} [ignoreCache=false]  True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise}                      Promise to be resolved when the grades are retrieved.
     */
    self.getGradeModuleItems = function(courseId, moduleId, userId, groupId, siteId, ignoreCache) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            return self.isGradeItemsAvalaible(siteId).then(function(enabled) {
                if (enabled) {
                    return getGradeModuleItems(courseId, moduleId, userId, groupId, siteId, ignoreCache).catch(function() {
                        // FallBack while solving MDL-57255.
                        return getGradesItemFromTable(courseId, moduleId, userId, siteId, ignoreCache);
                    });
                } else {
                    return getGradesItemFromTable(courseId, moduleId, userId, siteId, ignoreCache);
                }
            });
        });
    };

    /**
     * Get the grade items for a certain module. Keep in mind that may have more than one item to include outcomes and scales.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#getGradeModuleItems
     * @param  {Number}  courseId     ID of the course to get the grades from.
     * @param  {Number}  moduleId     ID of the module to get the grades from.
     * @param  {Number}  [userId]     ID of the user to get the grades from. If not defined use site's current user.
     * @param  {Number}  [groupId]    ID of the group to get the grades from. Not used for old gradebook table.
     * @param  {String}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise}              Promise to be resolved when the grades are retrieved.
     */
    self.invalidateGradeModuleItems = function(courseId, userId, groupId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            return self.isGradeItemsAvalaible(siteId).then(function(enabled) {
                if (enabled) {
                    return self.invalidateGradeItemsData(courseId, userId, groupId, siteId);
                } else {
                    return self.invalidateGradesTableData(courseId, userId, siteId);
                }
            });
        });
    };

    return self;
});
