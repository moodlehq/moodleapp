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

angular.module('mm.addons.userprofilefield_menu')

/**
 * Menu user profile field handlers.
 *
 * @module mm.addons.userprofilefield_menu
 * @ngdoc service
 * @name $mmaUserProfileFieldMenuHandler
 */
.factory('$mmaUserProfileFieldMenuHandler', function() {

    var self = {};

    /**
     * Whether or not the field is enabled for the site.
     *
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Get the directive.
     *
     * @param {Object} field The profile field.
     * @return {String}      Directive's name.
     */
    self.getDirectiveName = function(field) {
        return 'mma-user-profile-field-menu';
    };

    return self;
});
