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

angular.module('mm.addons.frontpage')

/**
 * Directive to render frontpage item news.
 *
 * @module mm.addons.frontpage
 * @ngdoc directive
 * @name mmaFrontpageItemNews
 */
.directive('mmaFrontpageItemNews', function($mmCourse, $state, $mmSite, $mmAddonManager, $mmCourseDelegate) {
    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/frontpage/templates/frontpageitemnews.html',
        link: function(scope) {
            // Get number of news items to show.
            return $mmSite.getConfig('newsitems').catch(function() {
                // Ignore errors for not present settings assuming newsitems will be 0.
                return $q.when(0);
            }).then(function(newsitems) {
                if (!newsitems) {
                    return;
                }
                var courseId = $mmSite.getInfo().siteid || 1;

                $mmaModForum = $mmAddonManager.get('$mmaModForum');
                if ($mmaModForum) {
                    return $mmaModForum.getCourseForums(courseId).then(function(forums) {
                        for (var x in forums) {
                            if (forums[x].type == 'news') {
                                return forums[x];
                            }
                        }
                    }).then(function(forum) {
                        if (forum) {
                            return $mmCourse.getModuleBasicInfo(forum.cmid).then(function(module) {
                                scope.show = true;
                                scope.module = module;
                                scope.module._controller =
                                    $mmCourseDelegate.getContentHandlerControllerFor(module.modname, module, courseId,
                                        module.section);
                            });
                        }
                    });
                }
            });
        }
    };
});
