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
 * Directive to display content in an iframe.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmIframe
 * @description
 * Accepts the following attributes:
 *
 * @param {String} src          The source of the iframe.
 * @param {Mixed} [width=100%]  Width of the iframe. If not defined, use 100%.
 * @param {Mixed} [height=100%] Height of the iframe. If not defined, use 100%.
 */
.directive('mmIframe', function($mmUtil) {

    return {
        restrict: 'E',
        template: '<div class="iframe-wrapper"><iframe class="mm-iframe" ng-style="{\'width\': width, \'height\': height}" ng-src="{{src}}"></iframe></div>',
        scope: {
            src: '='
        },
        link: function(scope, element, attrs) {
            scope.width = $mmUtil.formatPixelsSize(attrs.iframeWidth) || '100%';
            scope.height = $mmUtil.formatPixelsSize(attrs.iframeHeight) || '100%';

            var iframe = angular.element(element.find('iframe')[0]);
            iframe.on('load', function() {
                angular.forEach(iframe.contents().find('a'), function(el) {
                    var href = el.getAttribute('href');
                    if (href && href.indexOf('http') === 0) { // Check that href is not null.
                        angular.element(el).on('click', function(e) {
                            $mmUtil.openInBrowser(href);
                            e.preventDefault();
                        });
                    }
                });
            });

        }
    };
});
