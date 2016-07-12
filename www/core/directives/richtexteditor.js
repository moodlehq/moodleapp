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
 * Directive to display a rich text editor if enabled.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmRichTextEditor
 * @description
 * If enabled, this directive will show a rich text editor. Otherwise it'll show a regular textarea.
 *
 * This directive requires an OBJECT model. The text written in the editor or textarea will be stored inside
 * a "text" property in that object. This is to ensure 2-way data-binding, since using a string as a model
 * could be easily broken.
 *
 * Example:
 * <mm-rich-text-editor model="newpost" placeholder="{{ 'mma.mod_forum.message' | translate }}" scroll-handle="mmaScrollHandle">
 * </mm-rich-text-editor>
 *
 * In the example above, the text written in the editor will be stored in newpost.text.
 *
 * Accepts the following attributes:
 *
 * @param {Object} model           Model where to store the text. It'll be placed in a "text" property.
 * @param {String} [placeholder]   Placeholder to set in textarea if rich text editor is disabled.
 * @param {Object} [options]       Options to pass to the editor. It can be used to override default options.
 * @param {Object} [tabletOptions] Options to pass to the editor when run in a tablet. Has priority over "options" param.
 * @param {Object} [phoneOptions]  Options to pass to the editor when run in a phone. Has priority over "options" param.
 * @param {String} [scrollHandle]  Name of the scroll handle of the page containing the editor, to scroll to editor when focused.
 */
.directive('mmRichTextEditor', function($mmConfig, $ionicPlatform, $mmLang, mmCoreSettingsRichTextEditor, $timeout, $mmEvents,
            $window, $ionicScrollDelegate, $mmUtil, mmCoreEventKeyboardShow, mmCoreEventKeyboardHide) {

    var editorInitialHeight = 300;

    /**
     * Converts language code from "aa-bb" to "aa_BB".
     *
     * @param  {String} lang Language code.
     * @return {String}      Converted language code.
     */
    function changeLanguageCode(lang) {
        var split = lang.split('-');
        if (split.length > 1) {
            // Language has a dash. Convert it to underscore and uppercase second part.
            split[1] = split[1].toUpperCase();
            return split.join('_');
        } else {
            return lang;
        }
    }

    /**
     * Check if rich text editor is enabled based in settings and platform version.
     *
     * @return {Promise} Promise resolved with true if enabled and false otherwise.
     */
    function isRichTextEditorEnabled() {
        // Enabled for all platforms different from iOS and Android.
        if (!ionic.Platform.isIOS() && !ionic.Platform.isAndroid()) {
            return $mmConfig.get(mmCoreSettingsRichTextEditor, true);
        }

        // Check Android version >= 4.4
        if (ionic.Platform.isAndroid() && ionic.Platform.version() >= 4.4) {
            return $mmConfig.get(mmCoreSettingsRichTextEditor, true);
        }

        // Check iOS version > 6
        if (ionic.Platform.isIOS() && ionic.Platform.version() > 6) {
            return $mmConfig.get(mmCoreSettingsRichTextEditor, true);
        }

        return $q.when(false);
    }

    return {
        restrict: 'E',
        templateUrl: 'core/templates/richtexteditor.html',
        scope: {
            model: '=',
            placeholder: '@?',
            options: '=?',
            tabletOptions: '=?',
            phoneOptions: '=?',
            scrollHandle: '@?'
        },
        link: function(scope, element) {
            element = element[0];

            // More customization in http://docs.ckeditor.com/#!/api/CKEDITOR.config-cfg-customConfig
            var defaultOptions = {
                    allowedContent: true,
                    defaultLanguage: 'en',
                    height: editorInitialHeight,
                    toolbarCanCollapse: true,
                    toolbarStartupExpanded: false,
                    toolbar: [
                        {name: 'basicstyles', items: ['Bold', 'Italic']},
                        {name: 'styles', items: ['Format']},
                        {name: 'links', items: ['Link', 'Unlink']},
                        {name: 'lists', items: ['NumberedList', 'BulletedList']},
                        '/',
                        {name: 'document', items: ['Source', 'RemoveFormat']},
                        {name: 'tools', items: [ 'Maximize' ]}
                    ],
                    toolbarLocation: 'bottom',
                    removePlugins: 'elementspath,resize,pastetext,pastefromword,clipboard',
                    removeButtons: ''
                },
                scrollView,
                resized = false;

            if (scope.scrollHandle) {
                scrollView = $ionicScrollDelegate.$getByHandle(scope.scrollHandle);
            }

            // Check if we should use rich text editor.
            isRichTextEditorEnabled().then(function(enabled) {
                scope.richTextEditor = enabled;

                if (enabled) {
                    // Get current language to configure the editor.
                    $mmLang.getCurrentLanguage().then(function(lang) {
                        defaultOptions.language = changeLanguageCode(lang);

                        if ($ionicPlatform.isTablet()) {
                            scope.editorOptions = angular.extend(defaultOptions, scope.options, scope.tabletOptions);
                        } else {
                            scope.editorOptions = angular.extend(defaultOptions, scope.options, scope.phoneOptions);
                        }
                    });
                }
            });

            // Function called when editor is ready.
            scope.editorReady = function() {
                // Editor is ready, setup listeners.
                var collapser = element.querySelector('.cke_toolbox_collapser'),
                    firstButton = element.querySelector('.cke_toolbox_main .cke_toolbar:first-child'),
                    lastButton = element.querySelector('.cke_toolbox_main .cke_toolbar:last-child'),
                    toolbar = element.querySelector('.cke_bottom'),
                    editorEl = element.querySelector('.cke'),
                    contentsEl = element.querySelector('.cke_contents');

                // Setup collapser.
                if (firstButton && lastButton && collapser && toolbar) {
                    if (firstButton.offsetTop == lastButton.offsetTop) {
                        // Last button is in the same row as first button, hide the collapser.
                        angular.element(collapser).css('display', 'none');
                    }

                    angular.element(collapser).on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        angular.element(toolbar).toggleClass('cke_expanded');

                        if (resized) {
                            // Editor is resized and the toolbar height has changed, recalculate it.
                            resizeContent(editorEl, contentsEl, toolbar);
                        }
                    });
                }

                // Setup resize when keyboard opens.
                if (editorEl && contentsEl) {
                    setResizeWithKeyboard(editorEl, contentsEl, toolbar);
                }

                // Listen for event resize.
                ionic.on('resize', onResize, window);

                scope.$on('$destroy', function() {
                    ionic.off('resize', onResize, window);
                });

                // Window resized.
                function onResize() {
                    resizeContent(editorEl, contentsEl, toolbar);

                    if (firstButton.offsetTop == lastButton.offsetTop) {
                        // Last button is in the same row as first button, hide the collapser.
                        angular.element(collapser).css('display', 'none');
                    } else {
                        // Last button is NOT in the same row as first button, show the collapser.
                        angular.element(collapser).css('display', 'block');
                    }
                }
            };

            // Resize the editor to fill the visible screen size (except top bar).
            function resizeContent(editorEl, contentsEl, toolbar) {
                var topBarHeight = ionic.Platform.isIOS() ? 64 : 44,
                    editorHeight = editorEl.offsetHeight || editorEl.height || editorEl.clientHeight || editorInitialHeight,
                    contentVisibleHeight = $window.innerHeight - topBarHeight, // Visible screen minus top bar.
                    toolbarHeight = toolbar.offsetHeight || toolbar.height || toolbar.clientHeight,
                    editorContentNewHeight = contentVisibleHeight - toolbarHeight,
                    screenSmallerThanEditor = contentVisibleHeight > 0 && contentVisibleHeight < editorHeight && toolbarHeight > 0;

                // Don't resize if the content new height is too small or if the editor already fits in the screen.
                if (resized && !screenSmallerThanEditor) {
                    // The editor was resized but now it isn't needed anymore, undo the resize.
                    undoResize(editorEl, contentsEl);
                } else if (editorContentNewHeight > 50 && (resized || screenSmallerThanEditor)) {
                    // The visible screen size is lower than the editor size, resize editor to fill the screen.
                    angular.element(editorEl).css('height', contentVisibleHeight + 'px');
                    angular.element(contentsEl).css('height', editorContentNewHeight + 'px');
                    resized = true;

                    if (scrollView) {
                        $mmUtil.scrollToElement(editorEl, undefined, scrollView);
                    }
                }
            }

            // Undo resize.
            function undoResize(editorEl, contentsEl) {
                angular.element(editorEl).css('height', 'auto');
                angular.element(contentsEl).css('height', editorInitialHeight + 'px');
                resized = false;
            }

            // Set listeners to resize the editor to fill the visible screen size (except top bar).
            function setResizeWithKeyboard(editorEl, contentsEl, toolbar) {
                // if (ionic.Platform.isAndroid()) {
                    var obsShow,
                        obsHide;

                    obsShow = $mmEvents.on(mmCoreEventKeyboardShow, function() {
                        $timeout(function() {
                            resizeContent(editorEl, contentsEl, toolbar);
                        });
                    });

                    obsHide = $mmEvents.on(mmCoreEventKeyboardHide, function() {
                        if (resized) {
                            undoResize(editorEl, contentsEl);
                        }
                    });

                    scope.$on('$destroy', function() {
                        obsShow && obsShow.off && obsShow.off();
                        obsHide && obsHide.off && obsHide.off();
                    });
                // }
            }
        }
    };
});
