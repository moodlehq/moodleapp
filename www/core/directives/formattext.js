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
 * Directive to format text rendered.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmFormatText
 * @description
 * Directive to format text rendered. Attributes it accepts:
 *     -siteid: Site ID to use.
 *     -component: The component for mmExternalContent
 *     -component-id: The component ID for mmExternalContent
 *     -after-render: Scope function to call once the content is renderered. Passes the current scope as argument.
 *     -clean: True if all HTML tags should be removed, false otherwise.
 *     -singleline: True if new lines should be removed (all the text in a single line). Only valid if clean is true.
 *     -shorten: Number of characters to shorten the text.
 *     -expand-on-click: Indicate if contents should be expanded on click (undo shorten). Only applied if "shorten" is set.
 *     -watch: True if the variable used inside the directive should be watched for changes. If the variable data is retrieved
 *             asynchronously, this value must be set to true, or the directive should be inside a ng-if, ng-repeat or similar.
 */
.directive('mmFormatText', function($interpolate, $mmText, $compile, $q) {

    var extractVariableRegex = new RegExp('{{([^|]+)(|.*)?}}', 'i'),
        tagsToIgnore = ['AUDIO', 'VIDEO', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'];

    /**
     * Format contents and render.
     *
     * @param  {Object} scope   Directive scope.
     * @param  {Object} element Directive root DOM element.
     * @param  {Object} attrs   Directive attributes.
     * @param  {String} text    Directive contents.
     * @return {Promise}        Promise resolved with the formatted text.
     */
    function formatAndRenderContents(scope, element, attrs, text) {
        // If expandOnClick is set we won't shorten the text on interpolateAndFormat, we'll do it later.
        var shorten = attrs.expandOnClick ? 0 : attrs.shorten;

        interpolateAndFormat(scope, element, attrs, text, shorten).then(function(fullText) {
            if (attrs.shorten && attrs.expandOnClick) {
                var shortened = $mmText.shortenText($mmText.cleanTags(fullText, false), parseInt(attrs.shorten)),
                    expanded = false;

                element.on('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var target = e.target;
                    if (tagsToIgnore.indexOf(target.tagName) === -1 || (target.tagName === 'A' && !target.getAttribute('href'))) {
                        expanded = !expanded;
                        element.html( expanded ? fullText : shortened);
                        if (expanded) {
                            $compile(element.contents())(scope);
                        }
                    }
                });

                renderText(scope, element, shortened, attrs.afterRender);
            } else {
                renderText(scope, element, fullText, attrs.afterRender);
            }
        });
    }

    /**
     * Interpolate contents, apply formatText and set sub-directives.
     *
     * @param  {Object} scope     Directive scope.
     * @param  {Object} element   Directive root DOM element.
     * @param  {Object} attrs     Directive attributes.
     * @param  {String} text      Directive contents.
     * @param  {Number} [shorten] Number of characters to shorten contents to. If not defined, don't shorten the text.
     * @return {Promise}          Promise resolved with the formatted text.
     */
    function interpolateAndFormat(scope, element, attrs, text, shorten) {

        var siteId = scope.siteid,
            component = attrs.component,
            componentId = attrs.componentId;

        if (typeof text == 'undefined') {
            element.removeClass('hide');
            return $q.reject();
        }

        text = $interpolate(text)(scope); // "Evaluate" scope variables.
        text = text.trim();

        // Apply format text function.
        return $mmText.formatText(text, attrs.clean, attrs.singleline, shorten).then(function(formatted) {

            // Convert the content into DOM.
            var dom = angular.element('<div>').html(formatted);

            // Walk through the content to find images, and add our directive.
            angular.forEach(dom.find('img'), function(img) {
                img.setAttribute('mm-external-content', '');
                if (component) {
                    img.setAttribute('component', component);
                    if (componentId) {
                        img.setAttribute('component-id', componentId);
                    }
                }
                if (siteId) {
                    img.setAttribute('siteid', siteId);
                }
            });

            // Walk through the content to find the links and add our directive to it.
            angular.forEach(dom.find('a'), function(anchor) {
                anchor.setAttribute('mm-external-content', '');
                anchor.setAttribute('mm-browser', '');
                if (component) {
                    anchor.setAttribute('component', component);
                    if (componentId) {
                        anchor.setAttribute('component-id', componentId);
                    }
                }
                if (siteId) {
                    anchor.setAttribute('siteid', siteId);
                }
            });

            return dom.html();
        });
    }

    /**
     * Render some text on the directive's element, compile it and call afterRender.
     *
     * @param  {Object} scope         Directive scope.
     * @param  {Object} element       Directive root DOM element.
     * @param  {String} text          Directive contents.
     * @param  {String} [afterRender] Scope function to call once the content is renderered.
     * @return {Void}
     */
    function renderText(scope, element, text, afterRender) {
        element.html(text);
        element.removeClass('hide');
        $compile(element.contents())(scope);
        // Call the after render function.
        if (afterRender && scope[afterRender]) {
            scope[afterRender](scope);
        }
    }

    return {
        restrict: 'E',
        scope: true,
        link: function(scope, element, attrs) {
            element.addClass('hide'); // Hide contents until they're treated.
            var content = element.html(); // Get directive's content.

            if (attrs.watch) {
                // Watch the variable inside the directive.
                var matches = content.match(extractVariableRegex);
                if (matches && typeof matches[1] == 'string') {
                    var variable = matches[1].trim();
                    scope.$watch(variable, function() {
                        formatAndRenderContents(scope, element, attrs, content);
                    });
                }
            } else {
                formatAndRenderContents(scope, element, attrs, content);
            }
        }
    };
});
