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
.factory('$mmText', function($q, $mmLang, $translate, $state) {

    var self = {},
        element = document.createElement('div'); // Fake element to use in some functions, to prevent re-creating it each time.

    /**
     * Given a list of sentences, build a message with all of them wrapped in <p>.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#buildMessage
     * @param  {String[]} messages Messages to show.
     * @return {String}            Message with all the messages.
     */
    self.buildMessage = function(messages) {
        var result = '';
        angular.forEach(messages, function(message) {
            if (message) {
                result = result + '<p>' + message + '</p>';
            }
        });
        return result;
    };

    /**
     * Convert size in bytes into human readable format
     * http://codeaid.net/javascript/convert-size-in-bytes-to-human-readable-format-(javascript)
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#bytesToSize
     * @param {Number} bytes         Number of bytes to convert.
     * @param {Number} [precision=2] Number of digits after the decimal separator.
     * @return {String}              Size in human readable format.
     */
    self.bytesToSize = function(bytes, precision) {

        if (typeof bytes == 'undefined' || bytes < 0) {
            return $translate.instant('mm.core.notapplicable');
        }

        if (typeof precision == 'undefined' || precision < 0) {
            precision = 2;
        }

        var keys = ['mm.core.sizeb', 'mm.core.sizekb', 'mm.core.sizemb', 'mm.core.sizegb', 'mm.core.sizetb'];
        var units = $translate.instant(keys);
        var posttxt = 0;
        if (bytes >= 1024) {
            while (bytes >= 1024) {
                posttxt++;
                bytes = bytes / 1024;
            }
            bytes = Number(Math.round(bytes+'e+'+precision) + 'e-'+precision); // Round to "precision" decimals if needed.
        }
        return $translate.instant('mm.core.humanreadablesize', {size: Number(bytes), unit: units[keys[posttxt]]});
    };

    /**
     * Function to clean HTML tags.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#cleanTags
     * @param  {String}  text         The text to be cleaned.
     * @param  {Boolean} [singleLine] True if new lines should be removed (all the text in a single line).
     * @return {String}               Text cleaned.
     */
    self.cleanTags = function(text, singleLine) {
        // First, we use a regexpr.
        text = text.replace(/(<([^>]+)>)/ig,"");
        // Then, we rely on the browser. We need to wrap the text to be sure is HTML.
        text = angular.element('<p>').html(text).text(); // Get directive's content.
        // Recover or remove new lines.
        text = self.replaceNewLines(text, singleLine ? ' ' : '<br />');
        return text;
    };

    /**
     * Replace all the new lines on a certain text.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#replaceNewLines
     * @param  {String}  text     The text to be treated.
     * @param  {Boolean} newValue Text to place on each new line.
     * @return {String}           Treated text.
     */
    self.replaceNewLines = function(text, newValue) {
        return text.replace(/(?:\r\n|\r|\n)/g, newValue);
    };

    /**
     * Formats a text, treating multilang tags and cleaning HTML if needed.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#formatText
     * @param  {String} text             Text to format.
     * @param  {Boolean} clean           True if HTML tags should be removed, false otherwise.
     * @param  {Boolean} [singleLine]    True if new lines should be removed. Only valid if clean is true.
     * @param  {Number}  [shortenLength] Number of characters to shorten the text.
     * @return {Promise}                 Promise resolved with the formatted text.
     */
    self.formatText = function(text, clean, singleLine, shortenLength) {
        return self.treatMultilangTags(text).then(function(formatted) {
            if (clean) {
                formatted = self.cleanTags(formatted, singleLine);
            }
            if (shortenLength && parseInt(shortenLength) > 0) {
                formatted = self.shortenText(formatted, parseInt(shortenLength));
            }
            return formatted;
        });
    };

    /**
     * Shortens a text to length and adds an ellipsis.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#shortenText
     * @param  {String} text The text to be shortened.
     * @param  {Number} length The desired length.
     * @return {String} Shortened text.
     */
    self.shortenText = function(text, length) {
        if (text.length > length) {
            text = text.substr(0, length);

            // Now, truncate at the last word boundary (if exists).
            var lastWordPos = text.lastIndexOf(' ');
            if (lastWordPos > 0) {
                text = text.substr(0, lastWordPos);
            }
            text += '&hellip;';
        }
        return text;
    };

    /**
     * Shows a text on a new State
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#expandText
     * @param  {String} title              Title of the new state.
     * @param  {String} text               Content of the text to be expanded.
     * @param  {Boolean} replaceLineBreaks Replace line breaks by br tag. Default: false.
     * @param  {String} [component]        Component to link the embedded files to.
     * @param  {Mixed} [componentId]       An ID to use in conjunction with the component.
     */
    self.expandText = function(title, text, replaceLineBreaks, component, componentId) {
        if (text.length > 0) {
            // Open a new state with the interpolated contents.
            $state.go('site.mm_textviewer', {
                title: title,
                content: text,
                replacelinebreaks: replaceLineBreaks,
                component: component,
                componentId: componentId
            });
        }
    };

    /**
     * Treat the multilang tags from a HTML code, leaving only the current language.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#treatMultilangTags
     * @param {String} text   The text to be formatted.
     * @param {String} siteId ID of the site to use. If not set, use current site.
     * @return {Promise}      Promise resolved with the formatted text.
     */
    self.treatMultilangTags = function(text) {
        if (!text) {
            return $q.when('');
        }

        return $mmLang.getCurrentLanguage().then(function(language) {
            // Match the current language
            var currentLangRe = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>', 'g'),
                anyLangRE = /<(?:lang|span)[^>]+lang="[a-zA-Z0-9_-]+"[^>]*>(.*?)<\/(?:lang|span)>/g;

            if (!text.match(currentLangRe)) {
                // Current lang not found. Try to find the first language.
                var matches = text.match(anyLangRE);
                if (matches && matches[0]) {
                    language = matches[0].match(/lang="([a-zA-Z0-9_-]+)"/)[1];
                    currentLangRe = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>', 'g');
                } else {
                    // No multi-lang tag found, stop.
                    return text;
                }
            }
            // Extract contents of current language.
            text = text.replace(currentLangRe, '$1');
            // Delete the rest of languages
            text = text.replace(anyLangRE, '');
            return text;
        });
    };

    /**
     * Escape an HTML text. This implementation is based on PHP's htmlspecialchars.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#escapeHTML
     * @param  {String} text Text to escape.
     * @return {String}      Escaped text.
     */
    self.escapeHTML = function(text) {
        if (typeof text == 'undefined' || text === null || (typeof text == 'number' && isNaN(text))) {
            return '';
        } else if (typeof text != 'string') {
            return '' + text;
        }

        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    /**
     * Decode an escaped HTML text. This implementation is based on PHP's htmlspecialchars_decode.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#decodeHTML
     * @param  {String} text Text to decode.
     * @return {String}      Decoded text.
     */
    self.decodeHTML = function(text) {
        if (typeof text == 'undefined' || text === null || (typeof text == 'number' && isNaN(text))) {
            return '';
        } else if (typeof text != 'string') {
            return '' + text;
        }

        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, ' ');
    };

    /**
     * Decode HTML entities in a text. Equivalent to PHP html_entity_decode.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#decodeHTMLEntities
     * @param  {String} text Text to decode.
     * @return {String}      Decoded text.
     */
    self.decodeHTMLEntities = function(text) {
        if (text && typeof text === 'string') {
            element.innerHTML = text;
            text = element.textContent;
            element.textContent = '';
        }

        return text;
    };

    /**
     * Add or remove 'www' from a URL. The url needs to have http or https protocol.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#addOrRemoveWWW
     * @param {String} url URL to modify.
     * @return             Modified URL.
     */
    self.addOrRemoveWWW = function(url) {
        if (typeof url == 'string') {
            if (url.match(/http(s)?:\/\/www\./)) {
                // Already has www. Remove it.
                url = url.replace('www.', '');
            } else {
                url = url.replace('https://', 'https://www.');
                url = url.replace('http://', 'http://www.');
            }
        }
        return url;
    };

    /**
     * Remove protocol and www from a URL.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#removeProtocolAndWWW
     * @param  {String} url URL to treat.
     * @return {String}     Treated URL.
     */
    self.removeProtocolAndWWW = function(url) {
        // Remove protocol.
        url = url.replace(/.*?:\/\//g, '');
        // Remove www.
        url = url.replace(/^www./, '');
        return url;
    };

    /**
     * Gets a username from a URL like: user@mysite.com.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#getUsernameFromUrl
     * @param  {String} url URL to treat.
     * @return {String}     Username. Undefined if no username found.
     */
    self.getUsernameFromUrl = function(url) {
        if (url.indexOf('@') > -1) {
            // Get URL without protocol.
            var withoutProtocol = url.replace(/.*?:\/\//, ''),
                matches = withoutProtocol.match(/[^@]*/);

            // Make sure that @ is at the start of the URL, not in a param at the end.
            if (matches && matches.length && !matches[0].match(/[\/|?]/)) {
                return matches[0];
            }
        }
    };

    /**
     * Replace all characters that cause problems with files in Android and iOS.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#removeSpecialCharactersForFiles
     * @param  {String} text Text to treat.
     * @return {String}      Treated text.
     */
    self.removeSpecialCharactersForFiles = function(text) {
        return text.replace(/[#:\/\?\\]+/g, '_');
    };

    /**
     * Given a URL, returns what's after the last '/' without params.
     * Example:
     * http://mysite.com/a/course.html?id=1 -> course.html
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#getLastFileWithoutParams
     * @param  {String} url URL to treat.
     * @return {String}     Last file without params.
     */
    self.getLastFileWithoutParams = function(url) {
        var filename = url.substr(url.lastIndexOf('/') + 1);
        if (filename.indexOf('?') != -1) {
            filename = filename.substr(0, filename.indexOf('?'));
        }
        return filename;
    };

    /**
     * If a number has only 1 digit, add a leading zero to it.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#twoDigits
     * @param  {Number|String} num Number to convert.
     * @return {String}            Number with leading zeros.
     */
    self.twoDigits = function(num) {
        if (num < 10) {
            return '0' + num;
        } else {
            return '' + num; // Convert to string for coherence.
        }
    };

    /**
     * Escapes some characters in a string to be used as a regular expression.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#escapeForRegex
     * @param  {String} text Text to escape.
     * @return {String}      Escaped text.
     */
    self.escapeForRegex = function(text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    };

    /**
     * Count words in a text.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#countWords
     * @param  {String} text Text to count.
     * @return {Number}      Number of words.
     */
    self.countWords = function(text) {
        // Clean HTML scripts and tags.
        text = text.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
        text = text.replace(/<\/?(?!\!)[^>]*>/gi, '');
        // Decode HTML entities.
        text = self.decodeHTMLEntities(text);
        // Replace underscores (which are classed as word characters) with spaces.
        text = text.replace(/_/gi, " ");
        // Remove any characters that shouldn't be treated as word boundaries.
        text = text.replace(/[\'"’-]/gi, "");
        // Remove dots and commas from within numbers only.
        text = text.replace(/([0-9])[.,]([0-9])/gi, '$1$2');

        return text.split(/\w\b/gi).length - 1;
    };

    /**
     * Get the pluginfile URL to replace @@PLUGINFILE@@ wildcards.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#getTextPluginfileUrl
     * @param  {Object[]} files Files to extract the URL from. They need to have the URL in a 'fileurl' attribute.
     * @return {String}         Pluginfile URL, false if no files found.
     */
    self.getTextPluginfileUrl = function(files) {
        if (files && files.length) {
            var fileURL = files[0].fileurl;
            // Remove text after last slash (encoded or not).
            return fileURL.substr(0, Math.max(fileURL.lastIndexOf('/'), fileURL.lastIndexOf('%2F')));
        }

        return false;
    };

    /**
     * Replace @@PLUGINFILE@@ wildcards with the real URL in a text.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#replacePluginfileUrls
     * @param  {String} text    Text to treat.
     * @param  {Object[]} files Files to extract the pluginfile URL from. They need to have the URL in a 'fileurl' attribute.
     * @return {String}         Treated text.
     */
    self.replacePluginfileUrls = function(text, files) {
        if (text) {
            var fileURL = self.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(/@@PLUGINFILE@@/g, fileURL);
            }
        }
        return text;
    };

    /**
     * Replace pluginfile URLs with @@PLUGINFILE@@ wildcards.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#restorePluginfileUrls
     * @param  {String} text    Text to treat.
     * @param  {Object[]} files Files to extract the pluginfile URL from.  They need to have the URL in a 'fileurl' attribute.
     * @return {String}         Treated text.
     */
    self.restorePluginfileUrls = function(text, files) {
        if (text) {
            var fileURL = self.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(new RegExp(self.escapeForRegex(fileURL), 'g'), '@@PLUGINFILE@@');
            }
        }
        return text;
    };

    /**
     * Get the protocol from a URL.
     * E.g. http://www.google.com returns 'http'.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#getUrlProtocol
     * @param  {String} url URL to treat.
     * @return {String}     Protocol, undefined if no protocol found.
     */
    self.getUrlProtocol = function(url) {
        if (!url) {
            return;
        }

        var matches = url.match(/^([^\/:\.\?]*):\/\//);
        if (matches && matches[1]) {
            return matches[1];
        }
    };

    /**
     * Get the scheme from a URL. Please notice that, if a URL has protocol, it will return the protocol.
     * E.g. javascript:doSomething() returns 'javascript'.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmText#getUrlScheme
     * @param  {String} url URL to treat.
     * @return {String}     Scheme, undefined if no scheme found.
     */
    self.getUrlScheme = function(url) {
        if (!url) {
            return;
        }

        var matches = url.match(/^([a-z][a-z0-9+\-.]*):/);
        if (matches && matches[1]) {
            return matches[1];
        }
    };

    return self;
});
