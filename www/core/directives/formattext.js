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
 *     -not-adapt-img: True if we don't want to adapt images to the screen size and add the "openfullimage" icon.
 *     -watch: True if the variable used inside the directive should be watched for changes. If the variable data is retrieved
 *             asynchronously, this value must be set to true, or the directive should be inside a ng-if, ng-repeat or similar.
 *     -clean: True if all HTML tags should be removed, false otherwise.
 *     -singleline: True if new lines should be removed (all the text in a single line). Only valid if clean is true.
 *     -newlines-on-fullview: Indicate if new lines should be replaced by <br> on fullview.
 *     -fullview-on-click: Indicate if should open a new state with the full contents on click. Only applied if "max-height" is set
 *         and the content has been collapsed.
 *     -expand-title: Page title to used in fullview. Default: Description.
 *
 * The following attributes are replacing the deprecated ones. If any of the following is specified, the deprecated will be ignored:
 *     -max-height: Indicates the max height in pixels to render the content box. It should be 50 at least to make sense.
 *         Using this parameter will force display: block to calculate height better. If you want to avoid this use class="inline"
 *         at the same time to use display: inline-block.
 *
 * The following attributes has ben deprecated on version 3.2.1:
 *     -shorten: If shorten is present, max-height="100" will be applied.
 *     -expand-on-click: This attribute will be discarded. The text will be expanded if shortened and fullview-on-click not true.
 */
.directive('mmFormatText', function($interpolate, $mmText, $compile, $translate, $mmUtil) {

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
     * Add class to adapt media to a certain element.
     *
     * @param {Object} el Dom element to add the class to.
     */
    function addMediaAdaptClass(el) {
        angular.element(el).addClass('mm-media-adapt-width');
    }

    /**
     * Returns the element width in pixels.
     *
     * @param  {Object}  element DOM element to get width from.
     * @return {Number}          The width of the element in pixels. When 0 is returned it means the element is not visible.
     */
    function getElementWidth(element) {
        var width = $mmUtil.getElementWidth(element);

        if (!width) {
            // All elements inside are floating or inline. Change display mode to allow calculate the width.
            var angElement = angular.element(element),
                parentWidth = $mmUtil.getElementWidth(element.parentNode, true, false, false, true),
                previousDisplay = angElement.css('display');

            angElement.css('display', 'inline-block');

            width = $mmUtil.getElementWidth(element);

            // If width is incorrectly calculated use parent width instead.
            if (parentWidth > 0 && (!width || width > parentWidth)) {
                width = parentWidth;
            }

            angElement.css('display', previousDisplay);
        }

        return parseInt(width, 10);
    }

    /**
     * Returns the element height in pixels.
     *
     * @param  {Object}  elementAng Angular DOM element to get height from.
     * @return {Number}             The height of the element in pixels. When 0 or false is returned it means the element
     *                                  is not visible.
     */
    function getElementHeight(elementAng) {
        var element = elementAng[0],
            height;

        // Disable media adapt to correctly calculate the height.
        elementAng.removeClass('mm-enabled-media-adapt');

        height = $mmUtil.getElementHeight(element);

        elementAng.addClass('mm-enabled-media-adapt');

        return parseInt(height, 10) || false;
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
        var maxHeight = false;

        if (typeof text == 'undefined') {
            element.removeClass('opacity-hide');
            return;
        }

        text = $interpolate(text)(scope); // "Evaluate" scope variables.
        text = text.trim();

        if (typeof attrs.maxHeight != "undefined") {
            // Using new params.
            maxHeight = parseInt(attrs.maxHeight || 0, 10) || false;
        } else if (typeof attrs.shorten != "undefined") {
            // Using deprecated params.
            console.warn("mm-format-text: shorten attribute is deprecated please use max-height and expand-in-fullview instead.");
            maxHeight = 100;
        }

        formatContents(scope, element, attrs, text).then(function(fullText) {
            if (maxHeight && fullText != "") {
                // Render text before calculating text to get the proper height.
                renderText(scope, element, fullText);
                // Height cannot be calculated if the element is not shown while calculating.
                // Force shorten if it was previously shortened.
                //@todo: Work on calculate this height better.
                var height = element.css('max-height') ? false : getElementHeight(element);

                // If cannot calculate height, shorten always.
                if (!height || height > maxHeight) {
                    var expandInFullview = $mmUtil.isTrueOrOne(attrs.fullviewOnClick) || false;

                    fullText += '<div class="mm-show-more">' + $translate.instant('mm.core.showmore') + '</div>';

                    if (expandInFullview) {
                        element.addClass('mm-expand-in-fullview');
                    }
                    element.addClass('mm-text-formatted mm-shortened');
                    element.css('max-height', maxHeight + 'px');

                    element.on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var target = e.target;

                        if (tagsToIgnore.indexOf(target.tagName) === -1 || (target.tagName === 'A' &&
                                !target.getAttribute('href'))) {
                            if (!expandInFullview) {
                                // Change class.
                                element.toggleClass('mm-shortened');
                            } else {
                                // Open a new state with the interpolated contents.
                                $mmText.expandText(attrs.expandTitle || $translate.instant('mm.core.description'), text,
                                    attrs.newlinesOnFullview, attrs.component, attrs.componentId);
                            }
                        } else {
                            // Open a new state with the interpolated contents.
                            $mmText.expandText(attrs.expandTitle || $translate.instant('mm.core.description'), text,
                                attrs.newlinesOnFullview, attrs.component, attrs.componentId);
                        }
                    });
                }
            }
            element.addClass('mm-enabled-media-adapt');

            renderText(scope, element, fullText, attrs.afterRender);
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
    function formatContents(scope, element, attrs, text) {

        var siteId = scope.siteid,
            component = attrs.component,
            componentId = attrs.componentId;

        // Apply format text function.
        return $mmText.formatText(text, attrs.clean, attrs.singleline).then(function(formatted) {

            var el = element[0],
                dom = angular.element('<div>').html(formatted), // Convert the content into DOM.
                images = dom.find('img');

            // Walk through the content to find the links and add our directive to it.
            // Important: We need to look for links first because in 'img' we add new links without mm-link.
            angular.forEach(dom.find('a'), function(anchor) {
                anchor.setAttribute('mm-link', '');
                anchor.setAttribute('capture-link', true);
                addExternalContent(anchor, component, componentId, siteId);
            });

            if (images && images.length > 0) {
                // If cannot calculate element's width, use a medium number to avoid false adapt image icons appearing.
                var elWidth = getElementWidth(el) || 100;

                // Walk through the content to find images, and add our directive.
                angular.forEach(images, function(img) {
                    addMediaAdaptClass(img);
                    addExternalContent(img, component, componentId, siteId);
                    if (!attrs.notAdaptImg) {
                        // Check if image width has been adapted. If so, add an icon to view the image at full size.
                        var imgWidth = getElementWidth(img),
                            // Wrap the image in a new div with position relative.
                            container = angular.element('<span class="mm-adapted-img-container"></span>'),
                            jqImg = angular.element(img);

                        container.css('float', img.style.float); // Copy the float to correctly position the search icon.
                        if (jqImg.hasClass('atto_image_button_right')) {
                            container.addClass('atto_image_button_right');
                        } else if (jqImg.hasClass('atto_image_button_left')) {
                            container.addClass('atto_image_button_left');
                        }
                        jqImg.wrap(container);

                        if (imgWidth > elWidth) {
                            var label = $mmText.escapeHTML($translate.instant('mm.core.openfullimage')),
                                imgSrc = $mmText.escapeHTML(img.getAttribute('src'));
                            jqImg.after('<a href="#" class="mm-image-viewer-icon" mm-image-viewer img="' + imgSrc +
                                            '" aria-label="' + label + '"><i class="icon ion-ios-search-strong"></i></a>');
                        }
                    }
                });
            }

            angular.forEach(dom.find('audio'), function(el) {
                treatMedia(el, component, componentId, siteId);
                if (ionic.Platform.isIOS()) {
                    // Set data-tap-disabled="true" to make slider work in iOS.
                    el.setAttribute('data-tap-disabled', true);
                }
            });
            angular.forEach(dom.find('video'), function(el) {
                treatVideoFilters(el);
                treatMedia(el, component, componentId, siteId);
                // Set data-tap-disabled="true" to make controls work in Android (see MOBILE-1452).
                el.setAttribute('data-tap-disabled', true);
            });
            angular.forEach(dom.find('iframe'), addMediaAdaptClass);

            // Treat selects in iOS.
            if (ionic.Platform.isIOS()) {
                angular.forEach(dom.find('select'), function(select) {
                    select.setAttribute('mm-ios-select-fix', '');
                });
            }

            // Handle buttons with inner links.
            angular.forEach(dom[0].querySelectorAll('.button'), function(button) {
                // Check if it has a link inside.
                if (button.querySelector('a')) {
                    angular.element(button).addClass('mm-button-with-inner-link');
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
        element.removeClass('opacity-hide');
        $compile(element.contents())(scope);
        // Call the after render function.
        if (afterRender && scope[afterRender]) {
            scope[afterRender](scope);
        }
    }

    // Convenience function to extract YouTube Id to translate to embedded video.
    // Based on http://stackoverflow.com/questions/3452546/javascript-regex-how-to-get-youtube-video-id-from-url
    function youtubeGetId(url) {
        var regExp = /^.*(?:(?:youtu.be\/)|(?:v\/)|(?:\/u\/\w\/)|(?:embed\/)|(?:watch\?))\??v?=?([^#\&\?]*).*/;
        var match = url.match(regExp);
        return (match && match[1].length == 11)? match[1] : false;
    }

    /**
     * Treat video filters. Currently only treating youtube video using video JS.
     *
     * @param  {Object} el           DOM element.
     */
    function treatVideoFilters(el) {
        // Treat Video JS Youtube video links and translate them to iframes.
        if (!angular.element(el).hasClass('video-js')) {
            return;
        }

        var data = JSON.parse(el.getAttribute('data-setup') || el.getAttribute('data-setup-lazy') || '{}'),
            youtubeId = data.techOrder && data.techOrder[0] && data.techOrder[0] == 'youtube' && data.sources && data.sources[0] &&
                data.sources[0].src && youtubeGetId(data.sources[0].src);

        if (!youtubeId) {
            return;
        }

        var iframe = document.createElement('iframe');
        iframe.id = el.id;
        iframe.src = 'https://www.youtube.com/embed/' + youtubeId;
        iframe.setAttribute('frameborder', 0);
        iframe.width = '100%';
        iframe.height = 300;

        // Replace video tag by the iframe.
        el.parentNode.insertBefore(iframe, el);
        el.parentNode.removeChild(el);
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
        angular.forEach(angular.element(el).find('track'), function(track) {
            addExternalContent(track, component, componentId, siteId);
        });
    }

    return {
        restrict: 'EA',
        scope: true,
        link: function(scope, element, attrs) {
            element.addClass('opacity-hide'); // Hide contents until they're treated.
            var content = element.html(); // Get directive's content.

            if (attrs.watch) {
                // Watch the variable inside the directive.
                var matches = content.match(extractVariableRegex);
                if (matches && typeof matches[1] == 'string') {
                    var variable = matches[1].trim();
                    scope.$watch(variable, function() {
                        formatAndRenderContents(scope, element, attrs, content);
                    });
                } else {
                    // Variable not found, just format the original content.
                    formatAndRenderContents(scope, element, attrs, content);
                }
            } else {
                formatAndRenderContents(scope, element, attrs, content);
            }
        }
    };
});
