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
 * Directive to handle external content.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmExternalContent
 * @description
 * Directive to handle external content.
 *
 * This directive should be used with any element that links to external content
 * which we want to have available when the app is offline. Typically images and links.
 *
 * It uses {@link $mmFilepool} in the background.
 *
 * Attributes accepted:
 *     - siteid: Reference to the site ID if different than the site the user is connected to.
 *
 * @todo We can't detect changes in files from external repositories. A solution would be to always download them,
 * but we could increase the data usage A LOT if we're always downloading the embedded files.
 */
.directive('mmExternalContent', function($log, $mmFilepool, $mmSite, $mmSitesManager, $mmUtil, $q, $mmApp, $ionicPlatform) {
    $log = $log.getInstance('mmExternalContent');

    /**
     * Add a new source with a certain URL.
     *
     * @param {Object} dom Current source element. The new source will be a sibling of this element.
     * @param {String} url URL to use in the source.
     */
    function addSource(dom, url) {
        if (dom.tagName !== 'SOURCE') {
            return;
        }

        var e = document.createElement('source'),
            type = dom.getAttribute('type');
        e.setAttribute('src', url);
        if (type) {
            if (ionic.Platform.isAndroid() && type == 'video/quicktime') {
                // Fix for VideoJS/Chrome bug https://github.com/videojs/video.js/issues/423 .
                e.setAttribute('type', 'video/mp4');
            } else {
                e.setAttribute('type', type);
            }
        }
        dom.parentNode.insertBefore(e, dom);
    }

    /**
     * Handle external content, setting the right URL.
     *
     * @param  {String} siteId        Site ID.
     * @param  {Object} dom           DOM element.
     * @param  {String} targetAttr    Attribute to modify.
     * @param  {String} url           Original URL to treat.
     * @param  {String} [component]   Component
     * @param  {Number} [componentId] Component ID.
     * @return {Promise}              Promise resolved if the element is successfully treated.
     */
    function handleExternalContent(siteId, dom, targetAttr, url, component, componentId) {

        if (dom.tagName == 'VIDEO' && dom.textTracks && targetAttr != 'poster') {
            // It's a video with subtitles. In iOS, subtitles position is wrong so it needs to be fixed.
            dom.textTracks.onaddtrack = function(event) {
                if (event.track) {
                    event.track.oncuechange = function() {
                        var line = $ionicPlatform.isTablet() || ionic.Platform.isAndroid() ? 90 : 80;
                        // Position all subtitles to a percentage of video height.
                        angular.forEach(event.track.cues, function(cue) {
                            cue.snapToLines = false;
                            cue.line = line;
                            cue.size = 100; // This solves some Android issue.
                        });
                        // Delete listener.
                        event.track.oncuechange = null;
                    };
                }
            };
        }

        if (!url || !url.match(/^https?:\/\//i) || (dom.tagName === 'A' && !$mmUtil.isDownloadableUrl(url))) {
            $log.debug('Ignoring non-downloadable URL: ' + url);
            if (dom.tagName === 'SOURCE') {
                // Restoring original src.
                addSource(dom, url);
            }
            return $q.reject();
        }

        // Get the webservice pluginfile URL, we ignore failures here.
        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (!site.canDownloadFiles() && $mmUtil.isPluginFileUrl(url)) {
                angular.element(dom).remove(); // Remove element since it'll be broken.
                return $q.reject();
            }

            // Download images, tracks and posters if size is unknown.
            var fn,
                downloadUnknown = dom.tagName == 'IMG' || dom.tagName == 'TRACK' || targetAttr == 'poster';

            if (targetAttr === 'src' && dom.tagName !== 'SOURCE' && dom.tagName !== 'TRACK') {
                fn = $mmFilepool.getSrcByUrl;
            } else {
                fn = $mmFilepool.getUrlByUrl;
            }

            return fn(siteId, url, component, componentId, 0, true, downloadUnknown).then(function(finalUrl) {
                $log.debug('Using URL ' + finalUrl + ' for ' + url);
                if (dom.tagName === 'SOURCE') {
                    // The browser does not catch changes in SRC, we need to add a new source.
                    addSource(dom, finalUrl);
                } else {
                    dom.setAttribute(targetAttr, finalUrl);
                }

                // Set events to download big files (not downloaded automatically).
                if (finalUrl.indexOf('http') === 0 && targetAttr != 'poster' &&
                            (dom.tagName == 'VIDEO' || dom.tagName == 'AUDIO' || dom.tagName == 'A' || dom.tagName == 'SOURCE')) {
                    var eventName = dom.tagName == 'A' ? 'click' : 'play';

                    if (dom.tagName == 'SOURCE') {
                        dom = $mmUtil.closest(dom, 'video,audio');
                        if (!dom) {
                            return;
                        }
                    }

                    angular.element(dom).on(eventName, function() {
                        // User played media or opened a downloadable link.
                        // Download the file if in wifi and it hasn't been downloaded already (for big files).
                        if (!$mmApp.isNetworkAccessLimited()) {
                            fn(siteId, url, component, componentId, undefined, false);
                        }
                    });
                }
            });
        });
    }

    return {
        restrict: 'A',
        scope: {
            siteid: '='
        },
        link: function(scope, element, attrs) {
            var dom = element[0],
                siteid = scope.siteid || $mmSite.getId(),
                component = attrs.component,
                componentId = attrs.componentId,
                targetAttr,
                sourceAttr,
                observe = false;

            if (dom.tagName === 'A') {
                targetAttr = 'href';
                sourceAttr = 'href';
                if (attrs.hasOwnProperty('ngHref')) {
                    observe = true;
                }

            } else if (dom.tagName === 'IMG') {
                targetAttr = 'src';
                sourceAttr = 'src';
                if (attrs.hasOwnProperty('ngSrc')) {
                    observe = true;
                }

            } else if (dom.tagName === 'AUDIO' || dom.tagName === 'VIDEO' || dom.tagName === 'SOURCE' || dom.tagName === 'TRACK') {
                targetAttr = 'src';
                sourceAttr = 'targetSrc';
                if (attrs.hasOwnProperty('ngSrc')) {
                    observe = true;
                }

                if (dom.tagName === 'VIDEO' && attrs.poster) {
                    // Handle poster.
                    handleExternalContent(siteid, dom, 'poster', attrs.poster, component, componentId);
                }

            } else {
                // Unsupported tag.
                $log.warn('Directive attached to non-supported tag: ' + dom.tagName);
                return;
            }

            if (observe) {
                attrs.$observe(targetAttr, function(url) {
                    if (!url) {
                        return;
                    }
                    handleExternalContent(siteid, dom, targetAttr, url, component, componentId);
                });
            } else {
                handleExternalContent(siteid, dom, targetAttr, attrs[sourceAttr] || attrs[targetAttr], component, componentId);
            }

        }
    };
});
