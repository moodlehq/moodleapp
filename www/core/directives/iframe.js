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

.constant('mmCoreIframeTimeout', 15000)

/**
 * Directive to display content in an iframe.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmIframe
 * @description
 * Accepts the following attributes:
 *
 * @param {String} src          The source of the iframe.
 * @param {Function} [loaded]   Function to call when the iframe is loaded.
 * @param {Mixed} [width=100%]  Width of the iframe. If not defined, use 100%.
 * @param {Mixed} [height=100%] Height of the iframe. If not defined, use 100%.
 */
.directive('mmIframe', function($log, $mmUtil, $mmText, $mmSite, $mmFS, $timeout, mmCoreIframeTimeout) {
    $log = $log.getInstance('mmIframe');

    var tags = ['iframe', 'frame', 'object', 'embed'];

    /**
     * Intercept window.open in a frame and its subframes, shows an error modal instead.
     * Search links (<a>) and open them in browser or InAppBrowser if needed.
     *
     * @param  {DOMElement} element Element to treat.
     * @return {Void}
     */
    function treatFrame(element) {
        if (element) {
            // Redefine window.open in this element and sub frames, it might have been loaded already.
            redefineWindowOpen(element);
            // Treat links.
            treatLinks(element);

            element.on('load', function() {
                // Element loaded, redefine window.open and treat links again.
                redefineWindowOpen(element);
                treatLinks(element);
            });
        }
    }

    /**
     * Redefine the open method in the contentWindow of an element and the sub frames.
     *
     * @param  {DOMElement} element Element to treat.
     * @return {Void}
     */
    function redefineWindowOpen(element) {
        var el = element[0],
            contentWindow = element.contentWindow || el.contentWindow;

        if (!contentWindow && el && el.contentDocument) {
            // It's probably an <object>. Try to get the window.
            contentWindow = el.contentDocument.defaultView;
        }

        if (!contentWindow && el && el.getSVGDocument) {
            // It's probably an <embed>. Try to get the window.
            try {
                var svgDoc = el.getSVGDocument();
                if (svgDoc && svgDoc.defaultView) {
                    contents = angular.element(svgdoc);
                    contentWindow = svgdoc.defaultView;
                } else if (el.window) {
                    contentWindow = el.window;
                } else if (el.getWindow) {
                    contentWindow = el.getWindow();
                }
            } catch (ex) {
                // Error accessing document.
            }
        }

        if (contentWindow) {
            // Intercept window.open.
            contentWindow.open = function (url) {
                var scheme = $mmText.getUrlScheme(url);
                if (!scheme) {
                    // It's a relative URL, use the frame src to create the full URL.
                    var src = element[0] && (element[0].src || element[0].data);
                    if (src) {
                        var dirAndFile = $mmFS.getFileAndDirectoryFromPath(src);
                        if (dirAndFile.directory) {
                            url = $mmFS.concatenatePaths(dirAndFile.directory, url);
                        } else {
                            $log.warn('Cannot get iframe dir path to open relative url', url, element);
                            return {}; // Return empty "window" object.
                        }
                    } else {
                        $log.warn('Cannot get iframe src to open relative url', url, element);
                        return {}; // Return empty "window" object.
                    }
                }

                if (url.indexOf('cdvfile://') === 0 || url.indexOf('file://') === 0) {
                    // It's a local file.
                    $mmUtil.openFile(url).catch(function(error) {
                        $mmUtil.showErrorModal(error);
                    });
                } else {
                    // It's an external link, we will open with browser. Check if we need to auto-login.
                    if (!$mmSite.isLoggedIn()) {
                        // Not logged in, cannot auto-login.
                        $mmUtil.openInBrowser(url);
                    } else {
                        $mmSite.openInBrowserWithAutoLoginIfSameSite(url);
                    }
                }

                return {}; // Return empty "window" object.
            };
        }

        // Search sub frames.
        try {
            var contents = element.contents();
            angular.forEach(tags, function(tag) {
                angular.forEach(contents.find(tag), function(subelement) {
                    treatFrame(angular.element(subelement));
                });
            });
        } catch (ex) {
            // Error getting iframe contents, probably due to a cross-origin problem.
        }
    }

    /**
     * Search links (<a>) and open them in browser or InAppBrowser if needed.
     * Only links that haven't been treated by SCORM Javascript will be treated.
     *
     * @param  {DOMElement} element Element to treat.
     * @return {Void}
     */
    function treatLinks(element) {
        var links;
        try {
            links = element.contents().find('a');
        } catch (ex) {
            // Error getting iframe contents, probably due to a cross-origin problem.
        }

        angular.forEach(links, function(el) {
            var href = el.href;

            // Check that href is not null.
            if (href) {
                var scheme = $mmText.getUrlScheme(href);
                if (scheme && scheme == 'javascript') {
                    // Javascript links should be treated by the SCORM Javascript.
                    // There's nothing to be done with these links, so they'll be ignored.
                    return;
                } else if (scheme && scheme != 'file' && scheme != 'filesystem') {
                    // Scheme suggests it's an external resource, open it in browser.
                    angular.element(el).on('click', function(e) {
                        // If the link's already prevented by SCORM JS then we won't open it in browser.
                        if (!e.defaultPrevented) {
                            e.preventDefault();
                            if (!$mmSite.isLoggedIn()) {
                                $mmUtil.openInBrowser(href);
                            } else {
                                $mmSite.openInBrowserWithAutoLoginIfSameSite(href);
                            }
                        }
                    });
                } else if (el.target == '_parent' || el.target == '_top' || el.target == '_blank') {
                    // Opening links with _parent, _top or _blank can break the app. We'll open it in InAppBrowser.
                    angular.element(el).on('click', function(e) {
                        // If the link's already prevented by SCORM JS then we won't open it in InAppBrowser.
                        if (!e.defaultPrevented) {
                            e.preventDefault();
                            $mmUtil.openFile(href).catch(function(error) {
                                $mmUtil.showErrorModal(error);
                            });
                        }
                    });
                } else if (ionic.Platform.isIOS() && (!el.target || el.target == '_self')) {
                    // In cordova ios 4.1.0 links inside iframes stopped working. We'll manually treat them.
                    angular.element(el).on('click', function(e) {
                        // If the link's already prevented by SCORM JS then we won't treat it.
                        if (!e.defaultPrevented) {
                            if (element[0].tagName.toLowerCase() == 'object') {
                                e.preventDefault();
                                element.attr('data', href);
                            } else {
                                e.preventDefault();
                                element.attr('src', href);
                            }
                        }
                    });
                }
            }
        });
    }

    return {
        restrict: 'E',
        templateUrl: 'core/templates/iframe.html',
        scope: {
            src: '=',
            loaded: '&?'
        },
        link: function(scope, element, attrs) {
            var url = (scope.src && scope.src.toString()) || '',  // Convert $sce URLs to string URLs.
                iframe = angular.element(element.find('iframe')[0]);

            scope.width = $mmUtil.formatPixelsSize(attrs.iframeWidth) || '100%';
            scope.height = $mmUtil.formatPixelsSize(attrs.iframeHeight) || '100%';

            // Show loading only with external URLs.
            scope.loading = !!url.match(/^https?:\/\//i);

            treatFrame(iframe);

            if (scope.loading) {
                iframe.on('load', function() {
                    scope.loading = false;
                    scope.loaded && scope.loaded(); // Notify iframe was loaded.
                    $timeout(); // Use $timeout to force a digest and update the view.
                });

                iframe.on('error', function() {
                    scope.loading = false;
                    $mmUtil.showErrorModal('mm.core.errorloadingcontent', true);
                    $timeout(); // Use $timeout to force a digest and update the view.
                });

                $timeout(function() {
                    scope.loading = false;
                }, mmCoreIframeTimeout);
            }
        }
    };
});
