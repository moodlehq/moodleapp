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
 * It requires to receive a "plugin" scope variable indicating the plugin to render the feedback.
 */
.directive('mmaModAssignFeedbackPlugin', function($compile, $injector, $mmaModAssign, mmaModAssignComponent) {
    return {
        restrict: 'E',
        templateUrl: 'addons/mod/assign/templates/feedbackplugin.html',
        link: function(scope, element, attributes) {
            var plugin = scope.plugin,
                container = element[0].querySelector('.mma-mod-assign-feedback-container');

            if (!plugin || !container) {
                return;
            }

            scope.assignComponent = mmaModAssignComponent;

            // Dash to Camel case plugin name.
            var pluginname = plugin.type.charAt(0).toUpperCase() + plugin.type.substr(1).toLowerCase();
            // Check if Directive exists.
            if ($injector.has('mmaModAssignFeedback' + pluginname + 'Directive')) {

                // Configs are only used in Directives.
                scope.configs = {};
                angular.forEach(scope.assign.configs, function(config) {
                    if (config.subtype == 'assignfeedback' && config.plugin == plugin.type) {
                        scope.configs[config.name] = config.value;
                    }
                });

                // Add the directive to the element.
                container.setAttribute('mma-mod-assign-feedback-' + plugin.type, '');
                // Compile the new directive.
                $compile(container)(scope);
            } else {
                scope.text = $mmaModAssign.getSubmissionPluginText(plugin);
                scope.files = $mmaModAssign.getSubmissionPluginAttachments(plugin);
                scope.notsupported = true;
            }
        }
    };
});
