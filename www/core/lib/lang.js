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
 * @name $mmLang
 * @module mm.core
 * @description
 * This service allows to add new languages strings.
 */
.factory('$mmLang', function($translate, $translatePartialLoader, $mmConfig, $cordovaGlobalization, $q, mmCoreConfigConstants) {

    var self = {},
        fallbackLanguage = mmCoreConfigConstants.default_lang || 'en',
        currentLanguage, // Save current language in a variable to speed up the get function.
        customStrings = {},
        customStringsRaw;

    /**
     * Change current language.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#changeCurrentLanguage
     * @param {String} language New language to use.
     * @return {Promise}        Promise resolved when the change is finished.
     */
    self.changeCurrentLanguage = function(language) {
        var p1 = $translate.use(language),
            p2 = $mmConfig.set('current_language', language);
        moment.locale(language);
        currentLanguage = language;
        return $q.all([p1, p2]);
    };

    /**
     * Clear current custom strings.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#clearCustomStrings
     * @return {Void}
     */
    self.clearCustomStrings = function() {
        customStrings = {};
        customStringsRaw = '';
    };

    /**
     * Get all current custom strings.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#getAllCustomStrings
     * @return {Object} Custom strings.
     */
    self.getAllCustomStrings = function() {
        return customStrings;
    };

    /**
     * Get current language.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#getCurrentLanguage
     * @return {Promise} Promise resolved with the current language.
     */
    self.getCurrentLanguage = function() {

        if (typeof currentLanguage != 'undefined') {
            return $q.when(currentLanguage);
        }

        // Get current language from config (user might have changed it).
        return $mmConfig.get('current_language').then(function(language) {
            return language;
        }, function() {
            // User hasn't defined a language. If default language is forced, use it.
            if (mmCoreConfigConstants.forcedefaultlanguage && mmCoreConfigConstants.forcedefaultlanguage !== 'false') {
                return mmCoreConfigConstants.default_lang;
            }

            try {
                // No forced language, try to get current language from cordova globalization.
                return $cordovaGlobalization.getPreferredLanguage().then(function(result) {
                    var language = result.value.toLowerCase();
                    if (language.indexOf('-') > -1) {
                        // Language code defined by locale has a dash, like en-US or es-ES. Check if it's supported.
                        if (mmCoreConfigConstants.languages && typeof mmCoreConfigConstants.languages[language] == 'undefined') {
                            // Code is NOT supported. Fallback to language without dash. E.g. 'en-US' would fallback to 'en'.
                            language = language.substr(0, language.indexOf('-'));

                        }
                    }
                    return language;
                }, function() {
                    // Error getting locale. Use default language.
                    return fallbackLanguage;
                });
            } catch(err) {
                // Error getting locale. Use default language.
                return fallbackLanguage;
            }
        }).then(function(language) {
            currentLanguage = language; // Save it for later.
            return language;
        });
    };

    /**
     * Get current custom strings.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#getCustomStrings
     * @param  {String} [lang] The language to get. If not defined, return current language.
     * @return {Object}        Custom strings.
     */
    self.getCustomStrings = function(lang) {
        lang = lang || currentLanguage;

        return customStrings[lang];
    };

    /**
     * Load certain custom strings.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#loadCustomStrings
     * @param  {String} Custom strings to load (tool_mobile_customlangstrings).
     * @return {Void}
     */
    self.loadCustomStrings = function(strings) {
        if (strings == customStringsRaw) {
            // Strings haven't changed, stop.
            return;
        }

        // Reset current values.
        self.clearCustomStrings();

        if (!strings || typeof strings != 'string') {
            return;
        }

        var list = strings.split(/(?:\r\n|\r|\n)/);
        angular.forEach(list, function(entry) {
            var values = entry.split('|'),
                lang;

            if (values.length < 3) {
                // Not enough data, ignore the entry.
                return;
            }

            lang = values[2];

            if (!customStrings[lang]) {
                customStrings[lang] = {};
            }

            customStrings[lang][values[0]] = values[1];
        });
    };

    /**
     * Register a folder to search language files into it.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#registerLanguageFolder
     * @param  {String} path Path of the folder to use.
     * @return {Promise}     Promise resolved when all the language files to be used are loaded.
     */
    self.registerLanguageFolder = function(path) {
        $translatePartialLoader.addPart(path);
        // We refresh the languages one by one because if we refresh all of them at once and 1 file isn't found
        // then no language will be loaded. This way if 1 language file is missing only that language won't be refreshed.
        var promises = [];
        promises.push($translate.refresh(currentLanguage));
        if (currentLanguage !== fallbackLanguage) {
            // Refresh fallback language.
            promises.push($translate.refresh(fallbackLanguage));
        }
        return $q.all(promises);
    };

    /**
     * Translates an error message and returns a rejected promise with the translated message.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#translateAndReject
     * @param  {String} errorkey            Key of the message to show.
     * @param  {Object} [translateParams]   Translate params to use when translating.
     * @return {Promise}                    Rejected promise.
     */
    self.translateAndReject = function(errorkey, translateParams) {
        return $translate(errorkey, translateParams).then(function(errorMessage) {
            return $q.reject(errorMessage);
        }, function() {
            return $q.reject(errorkey);
        });
    };

    /**
     * Translates an error message and rejects a deferred with the translated message.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#translateAndRejectDeferred
     * @param  {Object} deferred Deferred object to reject.
     * @param  {String} errorkey Key of the message to show.
     */
    self.translateAndRejectDeferred = function(deferred, errorkey) {
        $translate(errorkey).then(function(errorMessage) {
            deferred.reject(errorMessage);
        }, function() {
            deferred.reject(errorkey);
        });
    };

    return self;
})

.config(function($translateProvider, $translatePartialLoaderProvider, mmCoreConfigConstants) {

    $translateProvider.useLoader('$translatePartialLoader', {
        urlTemplate: '{part}/{lang}.json'
    });

    // Load the built language files from build/lang.
    $translatePartialLoaderProvider.addPart('build/lang');

    // Set fallback language and language to use until the app determines the right language to use.
    var lang = mmCoreConfigConstants.default_lang || 'en';
    $translateProvider.fallbackLanguage(lang);
    $translateProvider.preferredLanguage(lang);
})

.config(function($provide) {
    // Decorate $translate to use custom strings if needed.
    $provide.decorator('$translate', ['$delegate', '$q', '$injector', function($delegate, $q, $injector) {
        var $mmLang; // Inject it using $injector to prevent circular dependencies.

        // Redefine $translate default function.
        var newTranslate = function(translationId, interpolateParams, interpolationId, defaultTranslationText, forceLanguage) {
            var value = getCustomString(translationId, forceLanguage);
            if (value !== false) {
                return $q.when(value);
            }
            return $delegate(translationId, interpolateParams, interpolationId, defaultTranslationText, forceLanguage);
        };

        // Redefine $translate.instant.
        newTranslate.instant = function(translationId, interpolateParams, interpolationId, forceLanguage, sanitizeStrategy) {
            var value = getCustomString(translationId, forceLanguage);
            if (value !== false) {
                return value;
            }
            return $delegate.instant(translationId, interpolateParams, interpolationId, forceLanguage, sanitizeStrategy);
        };

        // Copy the rest of functions and properties.
        for (var name in $delegate) {
            if (name != 'instant') {
                newTranslate[name] = $delegate[name];
            }
        }

        return newTranslate;

        // Get a custom string.
        function getCustomString(translationId, forceLanguage) {
            if (!$mmLang) {
                $mmLang = $injector.get('$mmLang');
            }

            var customStrings = $mmLang.getCustomStrings(forceLanguage);
            if (customStrings && typeof customStrings[translationId] != 'undefined') {
                return customStrings[translationId];
            }

            return false;
        }
    }]);
})

.run(function($ionicPlatform, $translate, $mmLang, $mmSite, $mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated,
            mmCoreEventLogout) {
    $ionicPlatform.ready(function() {
        $mmLang.getCurrentLanguage().then(function(language) {
            $translate.use(language);
            moment.locale(language);
        });
    });

    $mmEvents.on(mmCoreEventLogin, loadCustomStrings);
    $mmEvents.on(mmCoreEventSiteUpdated, function(siteId) {
        if (siteId == $mmSite.getId()) {
            loadCustomStrings();
        }
    });
    $mmEvents.on(mmCoreEventLogout, function() {
        $mmLang.clearCustomStrings();
    });

    function loadCustomStrings() {
        var customStrings = $mmSite.getStoredConfig('tool_mobile_customlangstrings');
        if (typeof customStrings != 'undefined') {
            $mmLang.loadCustomStrings(customStrings);
        }
    }
});