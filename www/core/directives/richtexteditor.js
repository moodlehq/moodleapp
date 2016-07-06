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
 * <mm-rich-text-editor model="newpost" placeholder="{{ 'mma.mod_forum.message' | translate }}"></mm-rich-text-editor>
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
 */
.directive('mmRichTextEditor', function($mmConfig, $ionicPlatform, $mmLang, mmCoreSettingsRichTextEditor, $ionicModal, $mmApp, $timeout) {

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
            phoneOptions: '=?'
        },
        link: function(scope, element) {

            scope.editorReady = function() {
                var collapser = document.querySelector('.cke_toolbox_collapser');
                angular.element(collapser).on('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var toolbox = document.querySelector('.cke_bottom');
                    angular.element(toolbox).toggleClass('cke_expanded');
                    $timeout(function() {
                        if (angular.element(toolbox).hasClass('cke_expanded')) {
                            $mmApp.openKeyboard();
                        }
                    });
                });
            };

            // More customization in http://docs.ckeditor.com/#!/api/CKEDITOR.config-cfg-customConfig
            var defaultOptions = {
                allowedContent: true,
                defaultLanguage: 'en',
                height: 300,
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
            };

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
                            //defaultOptions.height = '100%';
                            scope.editorOptions = angular.extend(defaultOptions, scope.options, scope.phoneOptions);
                        }
                    });
                }
            });
        }
    };
});
