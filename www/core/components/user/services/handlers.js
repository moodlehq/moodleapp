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

angular.module('mm.core.user')

/**
 * User handlers factory.
 *
 * @module mm.core.user
 * @ngdoc service
 * @name $mmUserHandlers
 */
.factory('$mmUserHandlers', function($mmUtil, $mmContentLinksHelper) {

    var self = {};

    /**
     * Content links handler.
     *
     * @module mm.core.user
     * @ngdoc method
     * @name $mmUserHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {};

        /**
         * Get actions to perform with the link.
         *
         * @param {String[]} siteIds Site IDs the URL belongs to.
         * @param {String} url       URL to treat.
         * @return {Object[]}        List of actions. See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(siteIds, url) {
            // Check it's a user URL.
            if (url.indexOf('grade/report/user') == -1 &&
                    (url.indexOf('/user/view.php') > -1 || url.indexOf('/user/profile.php') > -1)) {
                var params = $mmUtil.extractUrlParams(url);
                if (typeof params.id != 'undefined') {
                    // Return actions.
                    return [{
                        message: 'mm.core.view',
                        icon: 'ion-eye',
                        sites: siteIds,
                        action: function(siteId) {
                            var stateParams = {
                                courseid: params.course,
                                userid: parseInt(params.id, 10)
                            };
                            $mmContentLinksHelper.goInSite('site.mm_user-profile', stateParams, siteId);
                        }
                    }];
                }
            }
            return [];
        };

        /**
         * Check if the URL is handled by this handler. If so, returns the URL of the site.
         *
         * @param  {String} url URL to check.
         * @return {String}     Site URL. Undefined if the URL doesn't belong to this handler.
         */
        self.handles = function(url) {
            // Accept any of these patterns.
            var patterns = ['/user/view.php', '/user/profile.php'];
            // Verify it's not a grade URL.
            if (url.indexOf('grade/report/user') == -1) {
                for (var i = 0; i < patterns.length; i++) {
                    var position = url.indexOf(patterns[i]);
                    if (position > -1) {
                        return url.substr(0, position);
                    }
                }
            }
        };

        return self;
    };

    return self;
});
