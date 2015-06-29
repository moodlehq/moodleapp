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

angular.module('mm.addons.mod_url')

/**
 * URL service.
 *
 * @module mm.addons.mod_url
 * @ngdoc service
 * @name $mmaModUrl
 */
.factory('$mmaModUrl', function($mmSite, $mmUtil) {
    var self = {};

    /**
     * Opens a URL.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrl#open
     * @param {Number} instanceId The URL module instance ID.
     * @param {String} url The URL to go to.
     */
    self.open = function(instanceId, url) {

        if (instanceId) {
            // Older instances might not have declared instanceId.
            $mmSite.write('mod_url_view_url', {
                urlid: instanceId
            });
        }

        $mmUtil.openInBrowser(url);
    };

    return self;
});
