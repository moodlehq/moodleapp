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
 * Controller to handle search courses.
 *
 * @module mm.core.courses
 * @ngdoc controller
 * @name mmCoursesSearchCtrl
 */
.controller('mmCoursesSearchCtrl', function($scope, $mmCourses, $q, $mmUtil) {

    var page = 0,
    	currentSearch = '';

    $scope.searchText = '';

    // Convenience function to search courses.
    function searchCourses(refresh) {
        if (refresh) {
            page = 0;
        }

        return $mmCourses.search(currentSearch, page).then(function(response) {
            if (page === 0) {
                $scope.courses = response.courses;
            } else {
                $scope.courses = $scope.courses.concat(response.courses);
            }
            $scope.total = response.total;

            page++;
            $scope.canLoadMore = $scope.courses.length < $scope.total;
        }).catch(function(message) {
            $scope.canLoadMore = false;
            $mmUtil.showErrorModalDefault(message, 'mm.courses.errorsearching', true);
            return $q.reject();
        });
    }

    $scope.search = function(text) {
        currentSearch = text;
        $scope.courses = undefined;

    	var modal = $mmUtil.showModalLoading('mm.core.searching', true);
    	searchCourses(true).finally(function() {
            modal.dismiss();
    	});
    };

    $scope.loadMoreResults = function() {
    	searchCourses();
    };
});
