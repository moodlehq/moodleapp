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

angular.module('mm.core')

/**
 * Directive to select a site.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmSitePicker
 * @description
 * Directive to select a site.
 *
 * Example usage:
 * <mm-site-picker site-selected="changeSite(siteId)" initial-site="{{initialSite}}"></mm-site-picker>
 *
 * It's important that the parameter received by the site-selected function is named siteId, otherwise it won't work.
 *
 * Attributes:
 * @param {Function} siteSelected Required. Function called when a site is selected. It will receive a 'siteId' param.
 * @param {String} [initialSite]  Site to select at start. If not defined, current site will be selected.
 */
.directive('mmSitePicker', function($mmSitesManager, $mmSite, $translate, $mmText, $q) {

    return {
        restrict: 'E',
        templateUrl: 'core/templates/sitepicker.html',
        scope: {
            siteSelected: '&',
            initialSite: '@?'
        },
        link: function(scope) {
            scope.selectedSite = scope.initialSite || $mmSite.getId();

            // Load the sites.
            $mmSitesManager.getSites().then(function(sites) {
                var promises = [];

                sites.forEach(function(site) {
                    // Format the site name.
                    promises.push($mmText.formatText(site.sitename, true, true).catch(function() {
                        return site.sitename;
                    }).then(function(formatted) {
                        site.fullnameandsitename = $translate.instant('mm.core.fullnameandsitename',
                                {fullname: site.fullname, sitename: formatted});
                    }));
                });

                return $q.all(promises).then(function() {
                    scope.sites = sites;
                });
            });
        }
    };
});
