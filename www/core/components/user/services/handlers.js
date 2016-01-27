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
         * Whether or not the handler is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return true;
        };

        /**
         * Get actions to perform with the link.
         *
         * @param {String} url URL to treat.
         * @return {Object[]}  List of actions. See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(url) {
            // Check it's a user URL.
            if (url.indexOf('grade/report/user') == -1 &&
                    (url.indexOf('/user/view.php') > -1 || url.indexOf('/user/profile.php') > -1)) {
                var params = $mmUtil.extractUrlParams(url);
                if (typeof params.id != 'undefined') {
                    // Return actions.
                    return [{
                        message: 'mm.core.view',
                        icon: 'ion-eye',
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

        return self;
    };

    return self;
});
