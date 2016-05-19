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
.factory('$mmaModUrl', function($mmSite, $mmUtil, $q, $mmContentLinksHelper) {
    var self = {};

    /**
     * Report a URL as being viewed.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrl#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                urlid: id
            };
            return $mmSite.write('mod_url_view_url', params);
        }
        return $q.reject();
    };

    /**
     * Opens a URL.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrl#open
     * @param {String} url The URL to go to.
     */
    self.open = function(url) {
        var modal = $mmUtil.showModalLoading();
        $mmContentLinksHelper.handleLink(url).then(function(treated) {
            if (!treated) {
                $mmUtil.openInBrowser(url);
            }
        }).finally(function() {
            modal.dismiss();
        });
    };

    return self;
});
