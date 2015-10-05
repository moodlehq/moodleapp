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
 * Directive to load a state in a split-view-content pane in tablet or in a new page in phone.
 * Requires being a child of mmSplitView.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmSplitViewLink
 * @description
 * Usage:
 * <... mm-split-view-link="site.mm_user-profile({courseid: courseid, userid: participant.id})" >
 *
 * This directive accepts a sref string that indicates the state to go to and the params. Scope variable need to be
 * inside curly brackets: {{variable_name}}.
 * In tablet, the new state contents will be loaded in split-pane contents pane.
 * In phone, the new state contents will be loaded in a new page.
 */
.directive('mmSplitViewLink', function($log, $ionicPlatform, $state, $mmApp) {
    $log = $log.getInstance('mmSplitViewLink');

    var srefRegex = new RegExp(/([^\(]*)(\(([^\)]*)\))?/);

    /**
     * Create a new state for tablet view (split-view). The state created will be exactly the same as the target state
     * (stateName), but changing the name and the view name.
     *
     * @param  {String} stateName       Name of the state to copy.
     * @param  {String} tabletStateName Name of the new state.
     * @param  {String} newViewName     Name of the new view.
     * @return {Boolean}                True if success, false otherwise.
     */
    function createTabletState(stateName, tabletStateName, newViewName) {
        var targetState = $state.get(stateName),
            newConfig,
            viewName;

        if (targetState) {
            newConfig = angular.copy(targetState);

            // Change first view name to 'tablet' so it's loaded in the split-view content pane.
            viewName = Object.keys(newConfig.views)[0];
            newConfig.views[newViewName] = newConfig.views[viewName];
            delete newConfig.views[viewName];
            delete newConfig['name'];

            $mmApp.createState(tabletStateName, newConfig);
            return true;
        } else {
            $log.error('State doesn\'t exist: '+stateName);
            return false;
        }
    }

    /**
     * Evaluate a string using scope.
     *
     * @param  {Object} scope Scope.
     * @param  {String} value String to eval.
     * @return {Mixed}        Evaluated value or undefined if not valid.
     */
    function scopeEval(scope, value) {
        if (typeof value == 'string') {
            try {
                return scope.$eval(value);
            } catch(ex) {
                $log.error('Error evaluating string: ' + param);
            }
        }
    }

    return {
        restrict: 'A',
        require: '^mmSplitView',
        link: function(scope, element, attrs, splitViewController) {
            var sref = attrs.mmSplitViewLink,
                menuState = splitViewController.getMenuState(),
                matches,
                stateName,
                stateParams,
                stateParamsString,
                tabletStateName;

            if (sref) {
                matches = sref.match(srefRegex);
                if (matches && matches.length) {
                    stateName = matches[1]; // E.g. site.mm_user-profile
                    tabletStateName = menuState + '.' + stateName.substr(stateName.lastIndexOf('.') + 1);

                    stateParamsString = matches[3]; // E.g. {courseid: courseid, userid: userid}
                    stateParams = scopeEval(scope, stateParamsString);

                    // Watch for changes on stateParams.
                    scope.$watch(stateParamsString, function(newVal) {
                        stateParams = newVal;
                    });

                    element.on('click', function(event) {
                        event.stopPropagation();
                        event.preventDefault();

                        if ($ionicPlatform.isTablet()) {
                            if (!$state.get(tabletStateName)) {
                                // State doesn't exists. Let's create it.
                                if (!createTabletState(stateName, tabletStateName, splitViewController.getComponent())) {
                                    return;
                                }
                            }
                            splitViewController.setLink(element); // Set last link loaded.
                            splitViewController.clearMarkedLinks();
                            element.addClass('mm-split-item-selected');
                            $state.go(tabletStateName, stateParams, {location:'replace'});
                        } else {
                            $state.go(stateName, stateParams);
                        }
                    });
                } else {
                    $log.error('Invalid sref.');
                }
            } else {
                $log.error('Invalid sref.');
            }
        }
    };
});
