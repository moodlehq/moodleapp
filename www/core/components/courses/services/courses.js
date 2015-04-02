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

.constant('frontPage', {
    'id': 1,
    'shortname': '',
    'fullname': '',
    'enrolledusercount': 0,
    'idnumber': '',
    'visible': 1
})

.run(function($translate, frontPage) {
    $translate('mm.core.courses.frontpage').then(function(value) {
        frontPage.shortname = value;
        frontPage.fullname = value;
    });
})

/**
 * Service to handle site courses.
 *
 * @module mm.core.courses
 * @ngdoc service
 * @name $mmCourses
 */
.factory('$mmCourses', function($q, $log, $mmSite, frontPage) {

    var self = {};

    self.getUserCourses = function() {
        var siteinfo = $mmSite.getCurrentSiteInfo();

        if (typeof(siteinfo) === 'undefined' || typeof(siteinfo.userid) === 'undefined') {
            return $q.reject();
        }

        var data = {userid: siteinfo.userid};
        return $mmSite.read('core_enrol_get_users_courses', data).then(function(courses) {
            courses.unshift(frontPage);

            // TODO: MM._loadGroups(courses);

            // TODO: Store courses in DB.

            return courses;
        });
    }

    return self;
});
