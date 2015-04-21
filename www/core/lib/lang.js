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
.factory('$mmLang', function($translate, $translatePartialLoader, $mmConfig) {

    var self = {};

    /**
     * Register a folder to search language files into it.
     *
     * @param  {String} path Path of the folder to use.
     */
    self.registerLanguageFolder = function(path) {
        $translatePartialLoader.addPart(path);
    };

    self.changeCurrentLanguage = function(language) {
        $translate.use(language);
        $mmConfig.set('current_language', language);
    };

    /**
     * Translates an error message and rejects a deferred with the translated message.
     *
     * @param  {Object} deferred Deferred object to reject.
     * @param  {String} errorkey Key of the message to show.
     */
    self.translateErrorAndReject = function(deferred, errorkey) {
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

.run(function($ionicPlatform, $translate, $cordovaGlobalization, $mmConfig) {
    $ionicPlatform.ready(function() {

        // Get current language.
        $mmConfig.get('current_language').then(function(language) {
            $translate.use(language);
        }, function() {
            $cordovaGlobalization.getPreferredLanguage().then(function(result) {
                var language = result.value;
                // For now we won't support codes like en-US or es-US defined by locale.
                if (language.indexOf('-') > -1) {
                    language = language.substr(0, language.indexOf('-'));
                }
                $translate.use(language);
            }, function() {
                $translate.use('en');
            });
        });

    });
});