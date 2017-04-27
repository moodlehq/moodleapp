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

angular.module('mm.core.sidemenu')

/**
 * Factory containing side menu related methods.
 *
 * @module mm.core.sidemenu
 * @ngdoc service
 * @name $mmSideMenu
 */
.factory('$mmSideMenu', function($log, $mmLang, $mmSitesManager, mmCoreConfigConstants) {
    $log = $log.getInstance('$mmSideMenu');

    var self = {},
        scope;

    /**
     * Get a list of custom menu items for a certain site.
     *
     * @module mm.core.sidemenu
     * @ngdoc method
     * @name $mmSideMenu#getCustomMenuItems
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Object[]}        List of custom menu items.
     */
    self.getCustomMenuItems = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var itemsString = site.getStoredConfig('tool_mobile_custommenuitems'),
                items,
                position = 0, // Position of each item, to keep the same order as it's configured.
                map = {},
                result = [];

            if (!itemsString || typeof itemsString != 'string') {
                // Setting not valid.
                return result;
            }

            // Add items to the map.
            items = itemsString.split(/(?:\r\n|\r|\n)/);
            angular.forEach(items, function(item) {
                var values = item.split('|'),
                    id,
                    label = values[0] ? values[0].trim() : values[0],
                    url = values[1] ? values[1].trim() : values[1],
                    type = values[2] ? values[2].trim() : values[2],
                    lang = (values[3] ? values[3].trim() : values[3]) || 'none',
                    icon = values[4] ? values[4].trim() : values[4];

                if (!label || !url || !type) {
                    // Invalid item, ignore it.
                    return;
                }

                id = url + '#' + type;
                if (!icon) {
                    // Icon not defined, use default one.
                    icon = type == 'embedded' ? 'ion-qr-scanner' : 'ion-link';
                }

                if (!map[id]) {
                    // New entry, add it to the map.
                    map[id] = {
                        url: url,
                        type: type,
                        position: position,
                        labels: {}
                    };
                    position++;
                }

                map[id].labels[lang.toLowerCase()] = {
                    label: label,
                    icon: icon
                };
            });

            if (!position) {
                // No valid items found, stop.
                return result;
            }

            return $mmLang.getCurrentLanguage().then(function(currentLang) {
                var fallbackLang = mmCoreConfigConstants.default_lang || 'en';

                // Get the right label for each entry and add it to the result.
                angular.forEach(map, function(entry) {
                    var data = entry.labels[currentLang] || entry.labels.none || entry.labels[fallbackLang];
                    if (!data) {
                        // No valid label found, get the first one.
                        data = entry.labels[Object.keys(entry.labels)[0]];
                    }

                    result[entry.position] = {
                        url: entry.url,
                        type: entry.type,
                        label: data.label,
                        icon: data.icon
                    };
                });

                return result;
            });
        });
    };

    /**
     * Hide the right side menu.
     *
     * @module mm.core.sidemenu
     * @ngdoc method
     * @name $mmSideMenu#hideRightSideMenu
     * @return {Boolean} True in success, false otherwise.
     */
    self.hideRightSideMenu = function() {
        if (!scope) {
            return false;
        }

        if (!scope.rightSideMenu) {
            scope.rightSideMenu = {};
        }
        scope.rightSideMenu.show = false;

        return true;
    };

    /**
     * Set scope that will determine if right side menu is shown.
     *
     * @module mm.core.sidemenu
     * @ngdoc method
     * @name $mmSideMenu#setScope
     * @param {Object} scp Scope to set.
     */
    self.setScope = function(scp) {
        scope = scp;
    };

    /**
     * Show the right side menu using a certain template and data.
     * The template should get all the data from the 'rsmScope' property in the scope.
     *
     * @module mm.core.sidemenu
     * @ngdoc method
     * @name $mmSideMenu#showRightSideMenu
     * @param {String} template URL of the template to load in the side menu.
     * @param {Object} data     Data to add to the right side menu scope. It will be set in a 'rsmScope' property.
     * @return {Boolean}        True in success, false otherwise.
     */
    self.showRightSideMenu = function(template, data) {
        if (!template || !scope) {
            return false;
        }

        if (!scope.rightSideMenu) {
            scope.rightSideMenu = {};
        }

        scope.rightSideMenu.show = true;
        scope.rightSideMenu.template = template;
        scope.rsmScope = data;

        return true;
    };

    return self;

})

.run(function($rootScope, $mmSideMenu) {
    // Hide right side menu everytime we change state.
    $rootScope.$on('$stateChangeStart', function(event, toState) {
        // Check we're not loading split view contents.
        if (toState.name.split('.').length == 2) {
            $mmSideMenu.hideRightSideMenu();
        }
    });
});
