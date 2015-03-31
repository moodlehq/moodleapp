angular.module('mm.core')

.directive('formatText', function($interpolate) {

    return {
        restrict: 'E', // Restrict to <format-text></format-text>.
        scope: true,
        transclude: true,
        controller: function($q, md5, $mmSite, $mmSitesManager, $mmUtil) {
            /**
             * Formats the text to be displayed, setting links to be opened in new browser, fixing URLs,
             * downloading images and replacing their URLs, etc.
             *
             * @param {String} text     The text to be formatted.
             * @param {Boolean} clean   True if the HTML tags should be removed, false otherwise.
             * @param {Number} courseId Id of the course to use to download images. If not set, use '1'.
             */
            this.formatText = function(text, clean, courseId) {
                var deferred = $q.defer();

                if (!text) {
                    deferred.reject();
                    return deferred.promise;
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

                var currentSiteURL = $mmSite.getCurrentSiteURL();

                // TeX filter. (Special case for labels mainly).
                var ft = text.match(/\$\$(.+?)\$\$/);
                if (ft && typeof(currentSiteURL) !== 'undefined') {
                    text = text.replace(/\$\$(.+?)\$\$/g, function(full, match) {
                        if (!match) {
                            return '';
                        }
                        var md5 = md5.createHash(match);
                        return '<img src="' + currentSiteURL + "/filter/tex/pix.php/" + md5 + '">';
                    });
                }

                if (typeof(currentSiteURL) === 'undefined') {
                    deferred.resolve(text);
                    return deferred.promise;
                }

                // Replace the pluginfile download links with the correct ones.
                // Escape the special chars in the site URL (we use the site url as part of the pattern).
                var url = currentSiteURL.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

                // Add the missing part of the reg. expr. We replace src/links like "http://..." or 'http://...'
                var expr = new RegExp(url + "[^\"']*", "gi");
                if (!courseId) {
                    courseId = 1;
                }
                var matches = text.match(expr);
                var promises = [];
                angular.forEach(matches, function(match) {

                    var promise = $mmSitesManager.getMoodleFilePath(match, courseId);
                    promises.push(promise);
                    promise.then(function(url) {
                        text = text.replace(match, url);
                    });
                });

                return $q.all(promises).then(function() {
                    if (clean) {
                        return $mmUtil.cleanTags(text);
                    } else {
                        return text;
                    }
                });
            };
        },
        compile: function(element, attrs, transclude) {
            return function(scope, linkElement, linkAttrs, ctrl) { // Link function.
                transclude(scope, function(clone) {
                    var content = angular.element('<div>').append(clone).html(); // Get directive's content.
                    var interpolated = $interpolate(content)(scope); // "Evaluate" scope variables.
                    ctrl.formatText(interpolated, attrs.clean, attrs.courseid).then(function(text) {
                        // Use replaceWith instead of html to delete the format-text tags.
                        linkElement.replaceWith(text);
                    });
                });
            }
        }
    };
});