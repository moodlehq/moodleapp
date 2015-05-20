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
 * @ngdoc service
 * @name $mmText
 * @module mm.core
 * @description
 * This service provides functions related to text, like formatting texts from Moodle.
 */
.factory('$mmText', function($q, $mmSite, $mmLang, $translate) {

    var self = {};

    /**
     * Convert size in bytes into human readable format
     * http://codeaid.net/javascript/convert-size-in-bytes-to-human-readable-format-(javascript)
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#bytesToSize
     * @param {Number} bytes     Number of bytes to convert.
     * @param {Number} precision Number of digits after the decimal separator.
     * @return {Promise}         Promise resolved with the size in human readable format.
     */
    self.bytesToSize = function(bytes, precision) {

        if (typeof(bytes) === 'undefined' || bytes < 0) {
            return $translate('mm.core.notapplicable');
        }

        var keys = ['mm.core.bytes', 'mm.core.kb', 'mm.core.mb', 'mm.core.gb', 'mm.core.tb'];
        return $translate(keys).then(function(translations) {
            var posttxt = 0;
            if (bytes >= 1024) {
                while( bytes >= 1024 ) {
                    posttxt++;
                    bytes = bytes / 1024;
                }
                bytes = Math.round(bytes, precision);
            }
            return $translate('mm.core.humanreadablesize', {size: Number(bytes), unit: translations[keys[posttxt]]});
        });
    };

    /**
     * Function to clean HTML tags.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#cleanTags
     * @param  {String} text The text to be cleaned.
     * @return {String}      Text cleaned.
     */
    self.cleanTags = function(text) {
        // First, we use a regexpr.
        text = text.replace(/(<([^>]+)>)/ig,"");
        // Then, we rely on the browser. We need to wrap the text to be sure is HTML.
        text = angular.element('<p>').html(text).text(); // Get directive's content.
        // Recover new lines.
        text = text.replace(/(?:\r\n|\r|\n)/g, '<br />');
        return text;
    };

    /**
     * Formats a text, treating multilang tags and cleaning HTML if needed.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#formatText
     * @param  {String} text   Text to format.
     * @param  {Boolean} clean True if HTML tags should be removed, false otherwise.
     * @return {Promise}       Promise resolved with the formatted text.
     */
    self.formatText = function(text, clean) {
        return self.treatMultilangTags(text).then(function(formatted) {
            if (clean) {
                return self.cleanTags(formatted);
            }
            return formatted;
        });
    };

    /**
     * Treat the multilang tags from a HTML code, leaving only the current language.
     *
     * @param {String} text   The text to be formatted.
     * @param {String} siteId ID of the site to use. If not set, use current site.
     * @return {Promise}      Promise resolved with the formatted text.
     */
    self.treatMultilangTags = function(text) {

        var deferred = $q.defer();

        if (!text) {
            deferred.resolve('');
            return deferred.promise;
        }

        return $mmLang.getCurrentLanguage().then(function(language) {
            // Multilang tags.
            // Match the current language
            var re = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>',"g");
            text = text.replace(re, "$1");
            // Delete the rest of languages
            text = text.replace(/<(?:lang|span)[^>]+lang="([a-zA-Z0-9_-]+)"[^>]*>(.*?)<\/(?:lang|span)>/g,"");
            return text;
        });
    };

    return self;
});
