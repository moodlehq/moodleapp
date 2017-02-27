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
 * Directive to create select multiple form item.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmMultipleSelect
 * @description
 * Based on http://codepen.io/jdnichollsc/pen/qOrqqK?editors=001 and http://codepen.io/adexerivera/pen/oYKZoK?editors=1000
 *
 * Example usage:
 *     <mm-multiple-select title="{{title}}" options="categories" key-property="id" value-property="name"
 *     selected-property="selected"></mm-multiple-select>
 *
 * Parameters accepted:
 *
 * @param {String} title                            Title and label of the selector.
 * @param {Array}  options                          Options to be used in the selector. Each option must have a key and a value
 *                                                      property. Additionally selected property can be defined.
 * @param {String} [keyProperty="key"]              Name of the key property of the option to be sent to the server.
 * @param {String} [valueProperty="value"]          Name of the value property of the option to be shown, human readable.
 * @param {String} [selectedProperty="selected"]    Name of the selected property that indicates if the option is selected.
 */
.directive('mmMultipleSelect', function($ionicModal, $translate) {
    return {
        restrict: 'E',
        priority: 100,
        scope: {
            title: '@',
            options: '='
        },
        templateUrl: 'core/templates/multipleselect.html',
        link: function(scope, element, attrs) {

            var keyProperty = attrs.keyProperty || "key",
                valueProperty = attrs.valueProperty || "value",
                selectedProperty = attrs.selectedProperty || "selected",
                strSeparator = $translate.instant('mm.core.listsep') + " ";

            scope.optionsRender = [];
            scope.selectedOptions = getSelectedOptionsText();

            element.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (!scope.modal) {
                    $ionicModal.fromTemplateUrl('core/templates/multipleselectpopover.html', {
                        scope: scope,
                        animation: 'slide-in-up'
                    }).then(function(m) {
                        scope.modal = m;
                        scope.optionsRender = scope.options.map(function(option) {
                            return {
                                key: option[keyProperty],
                                value: option[valueProperty],
                                selected: option[selectedProperty] || false
                            };
                        });

                        scope.modal.show();
                    });
                } else {
                    scope.modal.show();
                }
            });

            scope.saveOptions = function() {
                angular.forEach(scope.optionsRender, function (tempOption){
                    for (var j = 0; j < scope.options.length; j++) {
                        var option = scope.options[j];
                        if (option[keyProperty] == tempOption.key) {
                            option[selectedProperty] = tempOption.selected;
                            return;
                        }
                    }
                });
                scope.selectedOptions = getSelectedOptionsText();

                scope.closeModal();
            };

            // Get string for selected options to be shown.
            function getSelectedOptionsText() {
                var selected = scope.options.filter(function(option) {
                    return !!option[selectedProperty];
                }).map(function(option) {
                    return option[valueProperty];
                });

                return selected.join(strSeparator);
            }

            scope.closeModal = function(){
                scope.modal.hide();
            };

            scope.$on('$destroy', function () {
                if (scope.modal){
                    scope.modal.remove();
                }
            });
        }
    };
});
