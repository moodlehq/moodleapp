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

angular.module('mm.addons.mod_wiki')

/**
 * Wiki map controller.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc controller
 * @name mmaModWikiMapCtrl
 */
.controller('mmaModWikiMapCtrl', function($scope, mmaModWikiSubwikiPagesLoaded) {
    $scope.map = [];

    $scope.constructMap = function(subwikiPages) {
        var initialLetter = false,
            letter = {};

        $scope.map = [];

        angular.forEach(subwikiPages, function(page) {
            // Should we create a new grouping?
            if (page.title.charAt(0).toLocaleUpperCase() !== initialLetter) {
                initialLetter = page.title.charAt(0).toLocaleUpperCase();
                letter = {label: initialLetter, pages: []};

                $scope.map.push(letter);
            }

            // Add the subwiki to the currently active grouping.
            letter.pages.push(page);
        });
    };

    var obsLoaded = $scope.$on(mmaModWikiSubwikiPagesLoaded, function(event, subwikiPages) {
        $scope.constructMap(subwikiPages);
    });

    $scope.constructMap($scope.subwikiPages);

    $scope.$on('$destroy', obsLoaded);
});
