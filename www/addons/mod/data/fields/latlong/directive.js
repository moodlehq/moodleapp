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

angular.module('mm.addons.mod_data')

/**
 * Directive to render data latlong field.
 *
 * @module mm.addons.mod_data
 * @ngdoc directive
 * @name mmaModDataFieldLatlong
 */
.directive('mmaModDataFieldLatlong', function() {
    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/data/fields/latlong/template.html',
        link: function(scope) {
            scope.mode = scope.mode == 'list' ? 'show' : scope.mode;
            if (scope.value) {
                scope.north = (scope.value && parseFloat(scope.value.content)) || "";
                scope.east = (scope.value && parseFloat(scope.value.content1)) || "";

                if (scope.mode == 'show') {
                    if (scope.north != "" || scope.east != "") {
                        scope.north = scope.north ? parseFloat(scope.north).toFixed(4) : '0.0000';
                        scope.east = scope.east ? parseFloat(scope.east).toFixed(4) : '0.0000';
                        scope.latitude = scope.north < 0 ? -scope.north + '°S' : scope.north + '°N';
                        scope.longitude = scope.east < 0 ? -scope.east + '°W' : scope.east + '°E';

                        if (ionic.Platform.isIOS()) {
                            scope.link = "http://maps.apple.com/?ll=" + scope.north + "," + scope.east + "&near=" + scope.north + "," + scope.east;
                        } else {
                            scope.link = "geo:"+scope.north+","+scope.east;
                        }
                    }
                }
            }
        }
    };
});
