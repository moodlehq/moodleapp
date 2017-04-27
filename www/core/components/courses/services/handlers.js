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

angular.module('mm.core.courses')

/**
 * Courses handlers factory.
 *
 * @module mm.core.courses
 * @ngdoc service
 * @name $mmCoursesHandlers
 */
.factory('$mmCoursesHandlers', function($mmSite, $state, $mmCourses, $q, $mmUtil, $translate, $timeout, $mmCourse, $mmSitesManager,
            mmCoursesEnrolInvalidKey, $mmContentLinkHandlerFactory) {

    var self = {};

    /**
     * Content links handler for list of courses.
     * It can show the list of available courses or in a certain category. It will show My Courses in old sites.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCoursesHandlers#myCoursesLinksHandler
     */
    self.coursesLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/course\/?(index\.php.*)?$/, '$mmSideMenuDelegate_mmCourses');

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.coursesLinksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                var state = 'site.mm_courses', // By default, go to My Courses (old Moodles).
                    stateParams = {};

                if ($mmCourses.isGetCoursesByFieldAvailable()) {
                    if (params.categoryid && $mmCourses.isGetCategoriesAvailable()) {
                        state = 'site.mm_coursescategories';
                        stateParams.categoryid = parseInt(params.categoryid, 10);
                    } else {
                        state = 'site.mm_availablecourses';
                    }
                }

                // Always use redirect to make it the new history root (to avoid "loops" in history).
                $state.go('redirect', {
                    siteid: siteId || $mmSite.getId(),
                    state: state,
                    params: stateParams
                });
            }
        }];
    };

    /**
     * Content links handler for view/enrol a course.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCoursesHandlers#courseLinksHandler
     */
    self.courseLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /((\/enrol\/index\.php)|(\/course\/enrol\.php)|(\/course\/view\.php)).*([\?\&]id=\d+)/);

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.courseLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        courseId = parseInt(params.id, 10);

        if (!courseId) {
            return false;
        }

        // Get the course id of Site Home.
        return $mmSitesManager.getSiteHomeId(siteId).then(function(siteHomeId) {
           return courseId != siteHomeId;
       });
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.courseLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = parseInt(params.id, 10);

        return [{
            action: function(siteId) {
                siteId = siteId || $mmSite.getId();
                if (siteId == $mmSite.getId()) {
                    actionEnrol(courseId, url);
                } else {
                    // Use redirect to make the course the new history root (to avoid "loops" in history).
                    $state.go('redirect', {
                        siteid: siteId,
                        state: 'site.mm_course',
                        params: {courseid: courseId}
                    });
                }
            }
        }];
    };

    /**
     * Action to perform when an enrol link is clicked.
     *
     * @param  {Number} courseId Course ID.
     * @param  {String} url      Treated URL.
     * @return {Void}
     */
    function actionEnrol(courseId, url) {
        var modal = $mmUtil.showModalLoading(),
            isEnrolUrl = !!url.match(/(\/enrol\/index\.php)|(\/course\/enrol\.php)/);

        // Check if user is enrolled in the course.
        $mmCourses.getUserCourse(courseId).catch(function() {
            // User is not enrolled in the course. Check if can self enrol.
            return canSelfEnrol(courseId).then(function() {
                var promise;
                modal.dismiss();

                // The user can self enrol. If it's not a enrolment URL we'll ask for confirmation.
                promise = isEnrolUrl ? $q.when() : $mmUtil.showConfirm($translate('mm.courses.confirmselfenrol'));

                return promise.then(function() {
                    // Enrol URL or user confirmed.
                    return selfEnrol(courseId).catch(function(error) {
                        if (typeof error == 'string') {
                            $mmUtil.showErrorModal(error);
                        }
                        return $q.reject();
                    });
                }, function() {
                    // User cancelled. Check if the user can view the course contents (guest access or similar).
                    return $mmCourse.getSections(courseId, false, true);
                });
            }, function(error) {
                // Can't self enrol. Check if the user can view the course contents (guest access or similar).
                return $mmCourse.getSections(courseId, false, true).catch(function() {
                    // Error. Show error message and allow the user to open the link in browser.
                    modal.dismiss();
                    if (typeof error != 'string') {
                        error = $translate.instant('mm.courses.notenroled');
                    }

                    var body = $translate('mm.core.twoparagraphs',
                                    {p1: error, p2: $translate.instant('mm.core.confirmopeninbrowser')});
                    $mmUtil.showConfirm(body).then(function() {
                        $mmSite.openInBrowserWithAutoLogin(url);
                    });
                    return $q.reject();
                });
            });
        }).then(function() {
            modal.dismiss();
            // Use redirect to make the course the new history root (to avoid "loops" in history).
            $state.go('redirect', {
                siteid: $mmSite.getId(),
                state: 'site.mm_course',
                params: {courseid: courseId}
            });
        });
    }

    /**
     * Check if a user can be "automatically" self enrolled in a course.
     *
     * @param  {Number} courseId Course ID.
     * @return {Promise}         Promise resolved if user is can be enrolled in a course, rejected otherwise.
     */
    function canSelfEnrol(courseId) {
        // Check if self enrolment is enabled.
        if (!$mmCourses.isSelfEnrolmentEnabled()) {
            return $q.reject();
        }

        // Check that the course has self enrolment enabled.
        return $mmCourses.getCourseEnrolmentMethods(courseId).then(function(methods) {
            var isSelfEnrolEnabled = false,
                instances = 0;
            angular.forEach(methods, function(method) {
                if (method.type == 'self' && method.status) {
                    isSelfEnrolEnabled = true;
                    instances++;
                }
            });

            if (!isSelfEnrolEnabled || instances != 1) {
                // Self enrol not enabled or more than one instance.
                return $q.reject();
            }
        });
    }

    /**
     * Try to self enrol a user in a course.
     *
     * @param  {Number} courseId Course ID.
     * @param  {String} password Password.
     * @return {Promise}         Promiser esolved when the user is enrolled, rejected otherwise.
     */
    function selfEnrol(courseId, password) {
        var modal = $mmUtil.showModalLoading();
        return $mmCourses.selfEnrol(courseId, password).then(function() {
            // Success self enrolling the user, invalidate the courses list.
            return $mmCourses.invalidateUserCourses().catch(function() {
                // Ignore errors.
            }).then(function() {
                // For some reason, if we get the course list right after self enrolling
                // we won't retrieve the new course. Let's delay it a bit.
                return $timeout(function() {}, 4000).finally(function() {
                    modal.dismiss();
                });
            });

        }).catch(function(error) {
            modal.dismiss();
            if (error && error.code === mmCoursesEnrolInvalidKey) {
                // Invalid password. Allow the user to input password.
                var title = $translate.instant('mm.courses.selfenrolment'),
                    body = ' ', // Empty message.
                    placeholder = $translate.instant('mm.courses.password');

                if (typeof password != 'undefined') {
                    // The user attempted a password. Show an error message.
                    $mmUtil.showErrorModal(error.message);
                }

                return $mmUtil.showPrompt(body, title, placeholder).then(function(password) {
                    return selfEnrol(courseId, password);
                });
            } else {
                return $q.reject(error);
            }
        });
    }

    /**
     * Content links handler for Dashboard. For now, it will always go to My Courses.
     *
     * @module mm.core.courses
     * @ngdoc method
     * @name $mmCoursesHandlers#dashboardLinksHandler
     */
    self.dashboardLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/my\/?$/, '$mmSideMenuDelegate_mmCourses');

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.dashboardLinksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                // Always use redirect to make it the new history root (to avoid "loops" in history).
                $state.go('redirect', {
                    siteid: siteId || $mmSite.getId(),
                    state: 'site.mm_courses'
                });
            }
        }];
    };

    return self;
});
