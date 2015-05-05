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

angular.module('mm.core.course')

/**
 * Factory containing course related methods.
 *
 * @module mm.core.course
 * @ngdoc service
 * @name $mmCourse
 */
.factory('$mmCourse', function($mmSite, $translate, $q) {
    var self = {};

    /**
     * Return a specific section.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getSection
     * @param {Number} courseid The course ID.
     * @param {Number} sectionid The section ID.
     * @return {Promise} The reject contains the error message, else contains the section.
     */
    self.getSection = function(courseid, sectionid) {
        var deferred = $q.defer();

        if (sectionid < 0) {
            deferred.reject('Invalid section ID');
            return deferred.promise;
        }

        self.getSections(courseid).then(function(sections) {
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].id == sectionid) {
                    deferred.resolve(sections[i]);
                    break;
                }
            }
            deferred.reject('Unkown section');
        }, function(error) {
            deferred.reject(error);
        });

        return deferred.promise;
    };

    /**
     * Get the course sections.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getSections
     * @param {Number} courseid The course ID.
     * @return {Promise} The reject contains the error message, else contains the sections.
     */
    self.getSections = function(courseid) {
        return $mmSite.read('core_course_get_contents', {
            courseid: courseid,
            options: []
        });
    };

    return self;
});
