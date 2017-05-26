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
 * IMPORTANT: Due to a limitation in Angular ui-router, the left pane state and the right pane state should NOT have
 * parameters with the same name but different value. It can cause unexpected behaviors.
 * Example: if the left pane loads a state with param 'courseid', then all the states that can be loaded in the right pane
 * should avoid having a parameter named 'courseid'. The right pane state can have a 'courseid' param only if it will always
 * have the same value than in left pane state.
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
                return angular.copy(scope.$eval(value));
            } catch(ex) {
                $log.error('Error evaluating string: ' + param);
            }
        }
    }

    // Function taken from uiSref directive.
    function parseStateRef(ref, current) {
      var preparsed = ref.match(/^\s*({[^}]*})\s*$/), parsed;
      if (preparsed) ref = current + '(' + preparsed[1] + ')';
      parsed = ref.replace(/\n/g, " ").match(/^([^(]+?)\s*(\((.*)\))?$/);
      if (!parsed || parsed.length !== 4) return false;
      return { state: parsed[1], paramExpr: parsed[3] || null };
    }

    /**
     * Fill state params to prevent problems with missing params. For each param not defined, applies the default value.
     * Example: If there are 2 states, one with params {timecreated: 1} and the other with params {},
     * Ionic thinks they are the same since the "timecreated" is inherited if it's not defined.
     *
     * @param  {Object} stateParams State params to fill.
     * @param  {Object} state       State where to get the default params.
     * @return {Void}
     */
    function fillStateParams(stateParams, state) {
        if (!stateParams || !state || !state.params) {
            return;
        }

        angular.forEach(state.params, function(defaultValue, name) {
            if (typeof stateParams[name] == 'undefined') {
                stateParams[name] = defaultValue;
            }
        });
    }

    return {
        restrict: 'A',
        require: '^mmSplitView',
        link: function(scope, element, attrs, splitViewController) {
            var sref = attrs.mmSplitViewLink ? parseStateRef(attrs.mmSplitViewLink, $state.current.name) : false,
                menuState = splitViewController.getMenuState(),
                stateName,
                stateParams,
                stateParamsString,
                tabletStateName,
                stateParamsFilled = false;

            if (sref) {
                stateName = sref.state; // E.g. site.mm_user-profile
                tabletStateName = menuState + '.' + stateName.substr(stateName.lastIndexOf('.') + 1);

                stateParamsString = sref.paramExpr; // E.g. {courseid: courseid, userid: userid}
                stateParams = scopeEval(scope, stateParamsString);

                // Watch for changes on stateParams.
                scope.$watch(stateParamsString, function(newVal) {
                    stateParams = angular.copy(newVal);
                    // Fill state params to prevent problems with missing params.
                    fillStateParams(stateParams, $state.get(tabletStateName));
                }, true);

                element.on('click', function(event) {
                    event.stopPropagation();
                    event.preventDefault();

                    if (!stateParamsFilled) {
                        // Fill state params to prevent problems with missing params.
                        fillStateParams(stateParams, $state.get(tabletStateName));
                        stateParamsFilled = true;
                    }

                    if ($ionicPlatform.isTablet()) {
                        if (!$state.get(tabletStateName)) {
                            // State doesn't exists. Let's create it.
                            if (!createTabletState(stateName, tabletStateName, splitViewController.getComponent())) {
                                return;
                            }
                        }

                        // Set this link as candidate to load. This is used when the split view blocks view changes.
                        splitViewController.setCandidateLink(element);

                        // Load the state.
                        $state.go(tabletStateName, stateParams, {location:'replace'}).then(function() {
                            // State change success, now mark the link as loaded.
                            splitViewController.setLink(element);
                            splitViewController.clearMarkedLinks();
                            element.addClass('mm-split-item-selected');
                        });
                    } else {
                        $state.go(stateName, stateParams);
                    }
                });
            } else {
                $log.error('Invalid sref ' + attrs.mmSplitViewLink + '.');
            }
        }
    };
});
