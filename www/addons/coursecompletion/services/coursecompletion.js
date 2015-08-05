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

angular.module('mm.addons.coursecompletion')

/**
 * Course completion factory.
 *
 * @module mm.addons.coursecompletion
 * @ngdoc service
 * @name $mmaCourseCompletion
 */
.factory('$mmaCourseCompletion', function($mmSite, $log, $q, $mmCourses) {
    $log = $log.getInstance('$mmaCourseCompletion');

    var self = {};

    /**
     * Returns whether or not the user can mark a course as self completed.
     * It can if it's configured in the course and it hasn't been completed yet.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletion#canMarkSelfCompleted
     * @param {Number} userid     User ID.
     * @param {Object} completion Course completion.
     * @return {Boolean}          True if user can mark course as self completed, false otherwise.
     */
    self.canMarkSelfCompleted = function(userid, completion) {
        var selfCompletionActive = false,
            alreadyMarked = false;

        if ($mmSite.getUserId() != userid) {
            return false;
        }

        angular.forEach(completion.completions, function(criteria) {
            if (criteria.type === 1) {
                // Self completion criteria found.
                selfCompletionActive = true;
                alreadyMarked = criteria.complete;
            }
        });

        return selfCompletionActive && !alreadyMarked;
    };

    /**
     * Get completed status text. The language code returned is meant to be translated.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletion#getCompletedStatusText
     * @param {Object} completion Course completion.
     * @return {Promise}          Language code of the text to show.
     */
    self.getCompletedStatusText = function(completion) {
        if (completion.completed) {
            return 'mma.coursecompletion.completed';
        } else {
            // Let's calculate status.
            var hasStarted = false;
            angular.forEach(completion.completions, function(criteria) {
                if (criteria.timecompleted || criteria.complete) {
                    hasStarted = true;
                }
            });
            if (hasStarted) {
                return 'mma.coursecompletion.inprogress';
            } else {
                return 'mma.coursecompletion.notyetstarted';
            }
        }
    };

    /**
     * Get course completion status for a certain course and user.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletion#getCompletion
     * @param {Number} courseid Course ID.
     * @param {Number} [userid] User ID. If not defined, use current user.
     * @return {Promise}        Promise to be resolved when the completion is retrieved.
     */
    self.getCompletion = function(courseid, userid) {
        userid = userid || $mmSite.getUserId();

        $log.debug('Get completion for course ' + courseid + ' and user ' + userid);

        var data = {
                courseid : courseid,
                userid: userid
            },
            preSets = {
                cacheKey: getCompletionCacheKey(courseid, userid)
            };

        return $mmSite.read('core_completion_get_course_completion_status', data, preSets).then(function(data) {
            if (data.completionstatus) {
                return data.completionstatus;
            }
            return $q.reject();
        });
    };

    /**
     * Get cache key for get completion WS calls.
     *
     * @param {Number} courseid Course ID.
     * @param {Number} userid   User ID.
     * @return {String}         Cache key.
     */
    function getCompletionCacheKey(courseid, userid) {
        return 'mmaCourseCompletion:view:' + courseid + ':' + userid;
    }

    /**
     * Invalidates view course completion WS call.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletion#invalidateCourseCompletion
     * @param {Number} courseid Course ID.
     * @param {Number} [userid] User ID. If not defined, use current user.
     * @return {Promise} Promise resolved when the list is invalidated.
     */
    self.invalidateCourseCompletion = function(courseid, userid) {
        userid = userid || $mmSite.getUserId();
        return $mmSite.invalidateWsCacheForKey(getCompletionCacheKey(courseid, userid));
    };

    /**
     * Returns whether or not the view course completion plugin is enabled for the current site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletion#isPluginViewEnabled
     * @return {Boolean} True if plugin enabled, false otherwise.
     */
    self.isPluginViewEnabled = function() {
        if (!$mmSite.isLoggedIn()) {
            return false;
        } else if (!$mmSite.wsAvailable('core_completion_get_course_completion_status')) {
            return false;
        }

        return true;
    };

    /**
     * Returns whether or not the view course completion plugin is enabled for a certain course.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletion#isPluginViewEnabledForCourse
     * @param {Number} courseId Course ID.
     * @return {Boolean}        True if plugin enabled, false otherwise.
     */
    self.isPluginViewEnabledForCourse = function(courseId) {
        if (!courseId) {
            return false;
        }

        var course = $mmCourses.getStoredCourse(courseId);

        if (course && typeof course.enablecompletion != 'undefined' && !course.enablecompletion) {
            return  false;
        }

        return true;
    };

    /**
     * Returns whether or not the self completion is available in current site.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletion#isSelfCompletionAvailable
     * @return {Boolean} True if self completion is available, false otherwise.
     */
    self.isSelfCompletionAvailable = function() {
        return $mmSite.wsAvailable('core_completion_mark_course_self_completed');
    };

    /**
     * Mark a course as self completed.
     *
     * @module mm.addons.coursecompletion
     * @ngdoc method
     * @name $mmaCourseCompletion#markCourseAsSelfCompleted
     * @param {Number} courseid Course ID.
     * @return {Promise}        Resolved on success.
     */
    self.markCourseAsSelfCompleted = function(courseid) {
        var params = {
            courseid: courseid
        };

        return $mmSite.write('core_completion_mark_course_self_completed', params).then(function(response) {
            if (!response.status) {
                return $q.reject();
            }
        });
    };

    return self;
});
