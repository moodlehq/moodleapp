angular.module('mm.core')

.directive('mmFormatText', function($interpolate) {

    return {
        restrict: 'E', // Restrict to <mm-format-text></mm-format-text>.
        scope: true,
        transclude: true,
        controller: function($q, md5, $mmSite, $mmSitesManager, $mmUtil) {
            /**
             * Formats the text to be displayed, setting links to be opened in new browser, fixing URLs,
             * downloading images and replacing their URLs, etc.
             *
             * @param {String} text     The text to be formatted.
             * @param {String} siteId   ID of the site to use. If not set, use current site.
             * @param {Boolean} clean   True if the HTML tags should be removed, false otherwise.
             * @param {Number} courseId Id of the course to use to download images. If not set, use '1'.
             */
            this.formatText = function(text, siteId, clean, courseId) {
                var deferred = $q.defer();

                if (!text) {
                    deferred.reject();
                    return deferred.promise;
                }

                if (!courseId) {
                    courseId = 1;
                }

                // Links should open in new browser.
                text = text.replace(/<a([^>]+)>/g,"<a target=\"_blank\" $1>");

                // Turn ng-src to src.
                text = text.replace(/ng-src/g, 'src');

                // Multilang tags (TODO)
                // Match the current language
                // var re = new RegExp('<(?:lang|span)[^>]+lang="' + MM.lang.current + '"[^>]*>(.*?)<\/(?:lang|span)>',"g");
                // text = text.replace(re, "$1");
                // Delete the rest of languages
                // text = text.replace(/<(?:lang|span)[^>]+lang="([a-zA-Z0-9_-]+)"[^>]*>(.*?)<\/(?:lang|span)>/g,"");

                // Get the siteurl based on siteId. If siteId is undefined, use current site.
                return $mmSitesManager.getSiteURL(siteId).then(function(siteurl) {

                    // TeX filter. (Special case for labels mainly).
                    var ft = text.match(/\$\$(.+?)\$\$/);
                    if (ft && typeof(siteurl) !== 'undefined') {
                        text = text.replace(/\$\$(.+?)\$\$/g, function(full, match) {
                            if (!match) {
                                return '';
                            }
                            var md5 = md5.createHash(match);
                            return '<img src="' + siteurl + "/filter/tex/pix.php/" + md5 + '">';
                        });
                    }

                    if (typeof(siteurl) === 'undefined') {
                        deferred.resolve(text);
                        return deferred.promise;
                    }

                    // Replace the pluginfile download links with the correct ones.
                    // Escape the special chars in the site URL (we use the site url as part of the pattern)
                    // and accept both http and https.
                    var urlToMatch = siteurl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/http(s)?/, 'http(s)?');

                    // Add the missing part of the reg. expr. We only download pluginfile images.
                    var expr = new RegExp(urlToMatch + "[^\"']*pluginfile[^\"']*", "gi");
                    var matches = text.match(expr);
                    var promises = [];
                    angular.forEach(matches, function(match) {
                        var promise = $mmSitesManager.getMoodleFilePath(match, courseId, siteId);
                        promises.push(promise);
                        promise.then(function(url) {
                            text = text.replace(match, url);
                        });
                    });

                    function cleanTextIfNeeded() {
                        if (clean) {
                            return $mmUtil.cleanTags(text);
                        } else {
                            return text;
                        }
                    }

                    return $q.all(promises).then(function() {
                        return cleanTextIfNeeded();
                    }, function() {
                        return cleanTextIfNeeded();
                    });
                });
            };
        },
        compile: function(element, attrs, transclude) {
            return function(scope, linkElement, linkAttrs, ctrl) { // Link function.
                transclude(scope, function(clone) {
                    var content = angular.element('<div>').append(clone).html(); // Get directive's content.
                    var interpolated = $interpolate(content)(scope); // "Evaluate" scope variables.

                    // IMPORTANT: In order for $interpolate to work, the scope variables need to be set when mm-format-text
                    // is applied. If the variables need to be fetched asynchronously, mm-format-text needs to be inside a
                    // ng-repeat, ng-if or similar to delay its execution until the data is obtained.

                    var siteid = attrs.siteid;
                    if (typeof(siteid) !== 'undefined') {
                        siteid = $interpolate(siteid)(scope); // "Evaluate" siteurl.
                    }

                    ctrl.formatText(interpolated, siteid, attrs.clean, attrs.courseid).then(function(text) {
                        // Use replaceWith instead of html to delete the format-text tags.
                        linkElement.replaceWith(text);
                    });
                });
            }
        }
    };
});