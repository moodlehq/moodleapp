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
 * Controller to handle the course categoriess list.
 *
 * @module mm.core.courses
 * @ngdoc controller
 * @name mmCourseCategoriesCtrl
 */
.controller('mmCourseCategoriesCtrl', function($scope, $stateParams, $mmCourses, $mmUtil, $q, $mmSite) {

    var categoryId = $stateParams.categoryid || 0;

    // Convenience function to fetch categories.
    function fetchCategories() {
        return $mmCourses.getCategories(categoryId, true).then(function(cats) {
            $scope.currentCategory = false;

            angular.forEach(cats, function(cat, index) {
                if (cat.id == categoryId) {
                    $scope.currentCategory = cat;
                    // Delete current Category to avoid problems with the formatTree.
                    delete cats[index];
                }
            });

            // Sort by depth and sortorder to avoid problems formatting Tree.
            cats.sort(function(a,b) {
                if (a.depth == b.depth) {
                    return (a.sortorder > b.sortorder) ? 1 : ((b.sortorder > a.sortorder) ? -1 : 0);
                }
                return a.depth > b.depth ? 1 : -1;
            });

            $scope.categories = $mmUtil.formatTree(cats, 'parent', 'id', categoryId);

            if ($scope.currentCategory) {
                $scope.title = $scope.currentCategory.name;

                return $mmCourses.getCoursesByField('category', categoryId).then(function(courses) {
                    $scope.courses = courses;
                }, function(error) {
                    $mmUtil.showErrorModalDefault(error, 'mm.courses.errorloadcourses', true);
                });
            }
        }, function(error) {
            $mmUtil.showErrorModalDefault(error, 'mm.courses.errorloadcategories', true);
        });
    }

    fetchCategories().finally(function() {
        $scope.categoriesLoaded = true;
    });

    $scope.refreshCategories = function() {
        var promises = [];

        promises.push($mmCourses.invalidateUserCourses());
        promises.push($mmCourses.invalidateCategories(categoryId, true));
        promises.push($mmCourses.invalidateCoursesByField('category', categoryId));
        promises.push($mmSite.invalidateConfig());

        $q.all(promises).finally(function() {
            fetchCategories(true).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };
});
