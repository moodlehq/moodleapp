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
 *     -shorten: To shorten the text. If a number is supplied, it will shorten the text to that number of characters.
 *               If a percentage is supplied the number of characters to short will be the percentage of element's width.
 *               E.g. 50% of an element with 1000px width = 500 characters.
 *               If the element has no width it'll use 100 characters. If the attribute is empty it'll use 30% width.
 *     -expand-on-click: Indicate if contents should be expanded on click (undo shorten). Only applied if "shorten" is set.
 *     -fullview-on-click: Indicate if should open a new state with the full contents on click. Only applied if "shorten" is set.
 *     -not-adapt-img: True if we don't want to adapt images to the screen size and add the "openfullimage" icon.
 *     -watch: True if the variable used inside the directive should be watched for changes. If the variable data is retrieved
 *             asynchronously, this value must be set to true, or the directive should be inside a ng-if, ng-repeat or similar.
 */
.directive('mmFormatText', function($interpolate, $mmText, $compile, $translate, $state) {

    var extractVariableRegex = new RegExp('{{([^|]+)(|.*)?}}', 'i'),
        tagsToIgnore = ['AUDIO', 'VIDEO', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'];

    /**
     * Add mm-external-content and its extra attributes to a certain element.
     *
     * @param {Object} el            DOM element to add the attributes to.
     * @param {String} [component]   Component.
     * @param {Number} [componentId] Component ID.
     * @param {String} [siteId]      Site ID.
     */
    function addExternalContent(el, component, componentId, siteId) {
        el.setAttribute('mm-external-content', '');
        if (component) {
            el.setAttribute('component', component);
            if (componentId) {
                el.setAttribute('component-id', componentId);
            }
        }
        if (siteId) {
            el.setAttribute('siteid', siteId);
        }
    }

    /**
     * Returns the number of characters to shorten the text. If the text shouldn't be shortened, returns undefined.
     *
     * @param  {Object} element   Directive root DOM element.
     * @param  {String} [shorten] Shorten attribute. Can be undefined or a string: empty, number or a percentage.
     * @return {Number}           Number of characters to shorten the text to. Undefined if it shouldn't shorten.
     */
    function calculateShorten(element, shorten) {
        var multiplier;

        if (typeof shorten == 'string' && shorten.indexOf('%') > -1) {
            // It's a percentage. Extract the multiplier.
            multiplier = parseInt(shorten.replace(/%/g, '').trim()) / 100;
            if (isNaN(multiplier)) {
                multiplier = 0.3;
            }
        } else if (typeof shorten != 'undefined' && shorten === '') {
            // Not defined, use default value.
            multiplier = 0.3;
        } else {
            var number = parseInt(shorten);
            if (isNaN(number)) {
                return; // Return undefined so it's not shortened.
            } else {
                return number;
            }
        }

        var el = element[0],
            elWidth = el.offsetWidth || el.width || el.clientWidth;
        if (!elWidth) {
            // Cannot calculate element's width, use default value.
            return 100;
        } else {
            return Math.round(elWidth * multiplier);
        }
    }

    /**
     * Add class to adapt media to a certain element.
     *
     * @param {Object} el Dom element to add the class to.
     */
    function addMediaAdaptClass(el) {
        angular.element(el).addClass('mm-media-adapt-width');
    }

    /**
     * Format contents and render.
     *
     * @param  {Object} scope   Directive scope.
     * @param  {Object} element Directive root DOM element.
     * @param  {Object} attrs   Directive attributes.
     * @param  {String} text    Directive contents.
     * @return {Void}
     */
    function formatAndRenderContents(scope, element, attrs, text) {

        if (typeof text == 'undefined') {
            element.removeClass('hide');
            return;
        }

        attrs.shorten = calculateShorten(element, attrs.shorten);

        // If expandOnClick or fullviewOnClick are set we won't shorten the text on formatContents, we'll do it later.
        var shorten = (attrs.expandOnClick || attrs.fullviewOnClick) ? 0 : attrs.shorten;

        text = $interpolate(text)(scope); // "Evaluate" scope variables.
        text = text.trim();

        formatContents(scope, element, attrs, text, shorten).then(function(fullText) {
            if (attrs.shorten && (attrs.expandOnClick || attrs.fullviewOnClick)) {
                var shortened = $mmText.shortenText($mmText.cleanTags(fullText, false), parseInt(attrs.shorten)),
                    expanded = false;

                if (shortened.trim() === '') {
                    // The content could have images or media that were removed with shortenText. Check if that's the case.
                    var hasContent = false,
                        meaningfulTags = ['img', 'video', 'audio'];

                    angular.forEach(meaningfulTags, function(tag) {
                        if (fullText.indexOf('<'+tag) > -1) {
                            hasContent = true;
                        }
                    });

                    if (hasContent) {
                        // The content has meaningful tags. Show a placeholder to expand the content.
                        shortened = $translate.instant(attrs.expandOnClick ? 'mm.core.clicktohideshow' : 'mm.core.clicktoseefull');
                    }
                }

                element.on('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var target = e.target;
                    if (tagsToIgnore.indexOf(target.tagName) === -1 || (target.tagName === 'A' && !target.getAttribute('href'))) {
                        if (attrs.expandOnClick) {
                            // Expand/collapse.
                            expanded = !expanded;
                            element.html( expanded ? fullText : shortened);
                            if (expanded) {
                                $compile(element.contents())(scope);
                            }
                        } else {
                            // Open a new state with the interpolated contents.
                            $state.go('site.mm_textviewer', {
                                title: $translate.instant('mm.core.description'),
                                content: text
                            });
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
     * Apply formatText and set sub-directives.
     *
     * @param  {Object} scope     Directive scope.
     * @param  {Object} element   Directive root DOM element.
     * @param  {Object} attrs     Directive attributes.
     * @param  {String} text      Directive contents.
     * @param  {Number} [shorten] Number of characters to shorten contents to. If not defined, don't shorten the text.
     * @return {Promise}          Promise resolved with the formatted text.
     */
    function formatContents(scope, element, attrs, text, shorten) {

        var siteId = scope.siteid,
            component = attrs.component,
            componentId = attrs.componentId;

        // Apply format text function.
        return $mmText.formatText(text, attrs.clean, attrs.singleline, shorten).then(function(formatted) {

            var el = element[0],
                elWidth = el.offsetWidth || el.width || el.clientWidth,
                dom = angular.element('<div>').html(formatted); // Convert the content into DOM.

            // Walk through the content to find the links and add our directive to it.
            // Important: We need to look for links first because in 'img' we add new links without mm-link.
            angular.forEach(dom.find('a'), function(anchor) {
                anchor.setAttribute('mm-link', '');
                anchor.setAttribute('capture-link', true);
                addExternalContent(anchor, component, componentId, siteId);
            });

            // Walk through the content to find images, and add our directive.
            angular.forEach(dom.find('img'), function(img) {
                addMediaAdaptClass(img);
                addExternalContent(img, component, componentId, siteId);
                if (!attrs.notAdaptImg) {
                    // Check if image width has been adapted. If so, add an icon to view the image at full size.
                    var imgWidth = img.offsetWidth || img.width || img.clientWidth;
                    if (imgWidth > elWidth) {
                        // Wrap the image in a new div with position relative.
                        var div = angular.element('<div class="mm-adapted-img-container"></div>'),
                            jqImg = angular.element(img),
                            label = $mmText.escapeHTML($translate.instant('mm.core.openfullimage')),
                            imgSrc = $mmText.escapeHTML(img.getAttribute('src'));
                        img.style.float = ''; // Disable float since image will fill the whole width.
                        jqImg.wrap(div);
                        jqImg.after('<a href="#" class="mm-image-viewer-icon" mm-image-viewer img="' + imgSrc +
                                        '" aria-label="' + label + '"><i class="icon ion-ios-search-strong"></i></a>');
                    }
                }
            });

            angular.forEach(dom.find('audio'), function(el) {
                treatMedia(el, component, componentId, siteId);
            });
            angular.forEach(dom.find('video'), function(el) {
                treatMedia(el, component, componentId, siteId);
                // Set data-tap-disabled="true" to make controls work in Android (see MOBILE-1452).
                el.setAttribute('data-tap-disabled', true);
            });
            angular.forEach(dom.find('iframe'), addMediaAdaptClass);

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

    /**
     * Add media adapt class and mm-external-content to the media element and their child sources.
     *
     * @param  {Object} el           DOM element.
     * @param {String} [component]   Component.
     * @param {Number} [componentId] Component ID.
     * @param {String} [siteId]      Site ID.
     */
    function treatMedia(el, component, componentId, siteId) {
        addMediaAdaptClass(el);

        addExternalContent(el, component, componentId, siteId);
        angular.forEach(angular.element(el).find('source'), function(source) {
            source.setAttribute('target-src', source.getAttribute('src'));
            source.removeAttribute('src');
            addExternalContent(source, component, componentId, siteId);
        });
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
