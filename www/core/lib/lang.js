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
.factory('$mmLang', function($translate, $translatePartialLoader, $mmConfig, $cordovaGlobalization, $q) {

    var self = {},
        currentLanguage; // Save current language in a variable to speed up the get function.

    /**
     * Register a folder to search language files into it.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#registerLanguageFolder
     * @param  {String} path Path of the folder to use.
     * @return {Promise}     Promise resolved when file is loaded.
     */
    self.registerLanguageFolder = function(path) {
        $translatePartialLoader.addPart(path);
        return $translate.refresh();
    };

    /**
     * Get current language.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#getCurrentLanguage
     * @return {[type]} [description]
     */
    self.getCurrentLanguage = function() {

        if (typeof currentLanguage != 'undefined') {
            return $q.when(currentLanguage);
        }

        // Get default language from config.
        function getDefaultLanguage() {
            return $mmConfig.get('default_lang').then(function(language) {
                return language;
            }, function() {
                return 'en';
            });
        }

        // Get current language from config (user might have changed it).
        return $mmConfig.get('current_language').then(function(language) {
            return language;
        }, function() {
            try {
                // User hasn't defined a language. Get it from cordova globalization.
                return $cordovaGlobalization.getPreferredLanguage().then(function(result) {
                    var language = result.value.toLowerCase();
                    if (language.indexOf('-') > -1) {
                        // Language code defined by locale has a dash, like en-US or es-ES. Check if it's supported.
                        return $mmConfig.get('languages').then(function(languages) {
                            if (typeof languages[language] == 'undefined') {
                                // Code is NOT supported. Fallback to language without dash. E.g. 'en-US' would fallback to 'en'.
                                language = language.substr(0, language.indexOf('-'));
                            }
                            return language;
                        }, function() {
                            // Languages array not found (shouldn't happen).
                            return language;
                        });
                    } else {
                        return language;
                    }
                }, function() {
                    // Error getting locale. Use default language.
                    return getDefaultLanguage();
                });
            } catch(err) {
                // Error getting locale. Use default language.
                return getDefaultLanguage();
            }
        }).then(function(language) {
            currentLanguage = language; // Save it for later.
            return language;
        });
    };

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
        currentLanguage = language;
        return $q.all([p1, p2]);
    };

    /**
     * Translates an error message and returns a rejected promise with the translated message.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmLang#translateAndReject
     * @param  {String} errorkey Key of the message to show.
     * @return {Promise}         Rejected promise.
     */
    self.translateAndReject = function(errorkey) {
        return $translate(errorkey).then(function(errorMessage) {
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

.config(function($translateProvider, $translatePartialLoaderProvider) {

    $translateProvider.useLoader('$translatePartialLoader', {
        urlTemplate: '{part}/{lang}.json'
    });

    // Load the built language files from build/lang.
    $translatePartialLoaderProvider.addPart('build/lang');

    // Set fallback language.
    $translateProvider.fallbackLanguage('en');
    $translateProvider.preferredLanguage('en'); // Set English until we know which language to use.
})

.run(function($ionicPlatform, $translate, $mmLang) {
    $ionicPlatform.ready(function() {
        $mmLang.getCurrentLanguage().then(function(language) {
            $translate.use(language);
        });
    });
});