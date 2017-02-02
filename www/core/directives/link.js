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
 * Directive to open a link in external browser.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmLink
 *
 * @param {Boolean} [captureLink=false] If the link needs to be captured by the app.
 * @param {Boolean} [inApp=false]       True to open in embedded browser, false to open in system browser.
 * @param {String} [autoLogin=check] If the link should be open with auto-login. Accepts the following values:
 *                                   "yes" -> Always auto-login.
 *                                   "no" -> Never auto-login.
 *                                   "check" -> Auto-login only if it points to the current site. Default value.
 */
.directive('mmLink', function($mmUtil, $mmContentLinksHelper, $location, $mmSite) {

    /**
     * Convenience function to correctly navigate, open file or url in the browser.
     *
     * @param  {String} href              HREF to be opened.
     * @param  {Mixed} [inApp]            True to open in embedded browser, false to open in system browser.
     * @param  {String} [autoLogin=check] Whether to auto-login. "yes", "no" or "check".
     */
    function navigate(href, inApp, autoLogin) {
        inApp = inApp && inApp !== 'false';
        autoLogin = autoLogin || 'check';

        if (href.indexOf('cdvfile://') === 0 || href.indexOf('file://') === 0) {
            // We have a local file.
            $mmUtil.openFile(href).catch(function(error) {
                $mmUtil.showErrorModal(error);
            });
        } else if (href.charAt(0) == '#'){
            href = href.substr(1);
            // In site links
            if (href.charAt(0) == '/') {
                $location.url(href);
            } else {
                // Look for id or name
                $mmUtil.scrollToElement(document, "#" + href + ", [name='" + href + "']");
            }
        } else {
            // It's an external link, we will open with browser. Check if we need to auto-login.
            if (!$mmSite.isLoggedIn()) {
                // Not logged in, cannot auto-login.
                if (inApp) {
                    $mmUtil.openInApp(href);
                } else {
                    $mmUtil.openInBrowser(href);
                }
            } else if (autoLogin == 'yes') {
                if (inApp) {
                    $mmSite.openInAppWithAutoLogin(href);
                } else {
                    $mmSite.openInBrowserWithAutoLogin(href);
                }
            } else if (autoLogin == 'no') {
                if (inApp) {
                    $mmUtil.openInApp(href);
                } else {
                    $mmUtil.openInBrowser(href);
                }
            } else {
                if (inApp) {
                    $mmSite.openInAppWithAutoLoginIfSameSite(href);
                } else {
                    $mmSite.openInBrowserWithAutoLoginIfSameSite(href);
                }
            }
        }
    }

    return {
        restrict: 'A',
        priority: 100,
        link: function(scope, element, attrs) {
            element.on('click', function(event) {
                // If the event prevented default action, do nothing.
                if (!event.defaultPrevented) {
                    var href = element[0].getAttribute('href');
                    if (href) {
                        event.preventDefault();
                        event.stopPropagation();

                        if (attrs.captureLink && attrs.captureLink !== 'false') {
                            $mmContentLinksHelper.handleLink(href).then(function(treated) {
                                if (!treated) {
                                   navigate(href, attrs.inApp, attrs.autoLogin);
                                }
                            });
                        } else {
                            navigate(href, attrs.inApp, attrs.autoLogin);
                        }
                    }
                }
            });
        }
    };
});
