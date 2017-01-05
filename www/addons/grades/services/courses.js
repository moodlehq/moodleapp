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
 * Service to handle courses grades.
 *
 * @module mm.addons.grades
 * @ngdoc service
 * @name $mmaCoursesGrades
 */
.factory('$mmaCoursesGrades', function($q, $log, $mmSite, $mmCourses, $mmSitesManager, $mmCourses) {

    $log = $log.getInstance('$mmaCoursesGrades');

    var self = {};

    /**
     * Get cache key for courses grade WS calls.
     *
     * @return {String}         Cache key.
     */
    function getCoursesGradesCacheKey() {
        return 'mmaGrades:coursesgrades';
    }

    /**
     * Invalidates courses grade data WS calls.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaCoursesGrades#invalidateCoursesGradesData
     * @param {Number}  [siteId]   Site id (empty for current site).
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateCoursesGradesData = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getCoursesGradesCacheKey());
        });
    };

    /**
     * Returns whether or not the plugin is enabled for a certain site.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaCoursesGrades#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Boolean}         True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (!site.wsAvailable('gradereport_overview_get_course_grades')) {
                return false;
            }
            // Now check that the configurable mygradesurl is pointing to the gradereport_overview plugin.
            return site.getConfig('mygradesurl').then(function(url) {
                return url.indexOf('/grade/report/overview/') !== -1;
            });
        });
    };

    /**
     * Get the grades for a certain course.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaCoursesGrades#getGrades
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise to be resolved when the grades are retrieved.
     */
    self.getGrades = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {

            $log.debug('Get course grades');

            var data = {},
                preSets = {
                    cacheKey: getCoursesGradesCacheKey()
                };

            return site.read('gradereport_overview_get_course_grades', data, preSets).then(function (data) {
                if (data && data.grades) {
                    return data.grades;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get course data for grades since they only have courseid.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaCoursesGrades#getGradesCourseData
     * @param  {Object[]} grades  Grades to get the data for.
     * @return {Promise}         Promise always resolved. Resolve param is the formatted grades.
     */
    self.getGradesCourseData = function(grades) {

        // We ommit to use $mmCourses.getUserCourse for performance reasons.
        return $mmCourses.getUserCourses(true).then(function(courses){

            var indexedCourses = {};
            angular.forEach(courses, function(course) {
                indexedCourses[course.id] = course;
            });

            angular.forEach(grades, function(grade) {
                if (typeof indexedCourses[grade.courseid] != 'undefined') {
                    grade.coursefullname = indexedCourses[grade.courseid].fullname;
                }
            });
            return grades;
        });
    };

    return self;
});
