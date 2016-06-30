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

angular.module('mm.addons.mod_assign')

/**
 * Directive to render a feedback plugin.
 *
 * @module mm.addons.mod_assign
 * @ngdoc directive
 * @name mmaModAssignFeedbackPlugin
 * @description
 * Directive to render feedback plugin.
 *
 * It requires to receive a "plugin" scope variable indicating the plugin to render the feedback.
 *
 * Parameters received by this directive and shared with the directive to render the plugin (if any):
 *
 * @param {Object} assign     The assign.
 * @param {Object} submission The submission.
 * @param {Object} plugin     The plugin to render.
 *
 * Also, the directives to render the plugin will receive the following parameters in the scope:
 *
 * @param {String} assignComponent Assignment component.
 * @param {Object} configs         Plugin configs.
 */
.directive('mmaModAssignFeedbackPlugin', function($compile, $mmaModAssignFeedbackDelegate, $mmaModAssign, mmaModAssignComponent) {
    return {
        restrict: 'E',
        scope: {
            assign: '=',
            plugin: '=',
            submission: '=',
            edit: '@?'
        },
        templateUrl: 'addons/mod/assign/templates/feedbackplugin.html',
        link: function(scope, element, attributes) {
            var plugin = scope.plugin,
                container = element[0].querySelector('.mma-mod-assign-feedback-container'),
                directive;

            if (!plugin || !container) {
                return;
            }

            scope.assignComponent = mmaModAssignComponent;

            // Check if the plugin has defined its own directive to render itself.
            directive = $mmaModAssignFeedbackDelegate.getDirectiveForPlugin(plugin);

            if (directive) {
                // Configs are only used in directives.
                scope.configs = {};
                angular.forEach(scope.assign.configs, function(config) {
                    if (config.subtype == 'assignfeedback' && config.plugin == plugin.type) {
                        scope.configs[config.name] = config.value;
                    }
                });

                // Add the directive to the element.
                container.setAttribute(directive, '');
                // Compile the new directive.
                $compile(container)(scope);
            } else {
                // Helper data and fallback.
                scope.text = $mmaModAssign.getSubmissionPluginText(plugin);
                scope.files = $mmaModAssign.getSubmissionPluginAttachments(plugin);
                scope.notSupported = $mmaModAssignFeedbackDelegate.isPluginSupported(plugin.type);
            }
        }
    };
});
