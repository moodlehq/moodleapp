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
 * Directive to display a reCaptcha.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmRecaptcha
 * @description
 * Accepts the following attributes:
 *
 * @param {Object} model The model where to store the recaptcha response.
 * @param {String} publickey The site public key.
 * @param {Object} [modelValueName] Name of the model property where to store the response. Defaults to 'recaptcharesponse'.
 * @param {String} [siteurl] The site URL. If not defined, current site.
 * @param {String} [challengehash] The recaptcha challenge hash. Required for V1.
 * @param {String} [challengeimage] The recaptcha challenge image. Required for V1.
 * @param {Function} [requestCaptcha] Function to called to request another captcha. Only for V1.
 */
.directive('mmRecaptcha', function($log, $mmLang, $mmSite, $mmFS, $sce, $ionicModal, $timeout) {
    $log = $log.getInstance('mmIframe');

    /**
     * Setup the data and functions for the captcha.
     *
     * @param {Object} scope Directive scope.
     */
    function setupCaptcha(scope) {
        // Check if recaptcha is enabled (and which version).
        scope.recaptchaV1Enabled = !!(scope.publickey && scope.challengehash && scope.challengeimage);
        scope.recaptchaV2Enabled = !!(scope.publickey && !scope.challengehash && !scope.challengeimage);

        if (scope.recaptchaV2Enabled && !scope.initializedV2) {
            scope.initializedV2 = true;

            // Get the current language of the app.
            $mmLang.getCurrentLanguage().then(function(lang) {
                // Set the iframe src. We use an iframe because reCaptcha V2 doesn't work with file:// protocol.
                var untrustedUrl = $mmFS.concatenatePaths(scope.siteurl, 'webservice/recaptcha.php?lang=' + lang);
                scope.iframeSrc = $sce.trustAsResourceUrl(untrustedUrl);
            });

            // Modal to answer the recaptcha. This is because the size of the recaptcha is dynamic, so it could
            // cause problems if it was displayed inline.
            $ionicModal.fromTemplateUrl('core/templates/recaptchamodal.html', {
                scope: scope,
                animation: 'slide-in-up'
            }).then(function(m) {
                scope.modal = m;
            });

            // Close the recaptcha modal.
            scope.closeModal = function(){
                scope.modal.hide();
            };

            // Open the recaptcha modal.
            scope.answerRecaptchaV2 = function() {
                scope.modal.show();
            };

            // The iframe with the recaptcha was loaded.
            scope.iframeLoaded = function() {
                // Search the iframe.
                var iframe = scope.modal.modalEl.querySelector('iframe'),
                    contentWindow = iframe && iframe.contentWindow;

                if (contentWindow) {
                    // Set the callbacks we're interested in.
                    contentWindow.recaptchacallback = function(value) {
                        scope.expired = false;
                        scope.model[scope.modelValueName] = value;
                        scope.closeModal();
                    };
                    contentWindow.recaptchaexpiredcallback = function() {
                        // Verification expired. Check the checkbox again.
                        scope.expired = true;
                        scope.model[scope.modelValueName] = '';
                        $timeout(); // Use $timeout to force a digest and update the view.
                    };
                }
            };
        } else if (scope.recaptchaV1Enabled && !scope.initializedV1) {
            scope.initializedV1 = true;

            // Set the function to request another captcha.
            scope.requestCaptchaV1 = function() {
                scope.requestCaptcha && scope.requestCaptcha();
            };
        }

        scope.$on('$destroy', function() {
            scope.modal && scope.modal.remove();
        });
    }

    return {
        restrict: 'E',
        templateUrl: 'core/templates/recaptcha.html',
        scope: {
            model: '=',
            publickey: '@',
            modelValueName: '@?',
            siteurl: '@?',
            challengehash: '@?',
            challengeimage: '@?',
            requestCaptcha: '&?'
        },
        link: function(scope) {
            scope.siteurl = scope.siteurl || $mmSite.getURL();
            scope.modelValueName = scope.modelValueName || 'recaptcharesponse';
            scope.initializedV2 = false;
            scope.initializedV1 = false;

            setupCaptcha(scope);

            // If any of the values change, setup the captcha.
            scope.$watchGroup(['publickey', 'challengehash', 'challengeimage'], function() {
                setupCaptcha(scope);
            });

            scope.$on('mmCore:ResetRecaptchaV2', function() {
                // Reset the response.
                scope.model.recaptcharesponse = '';

                // Reload the iframe.
                var currentSrc = scope.iframeSrc;
                scope.iframeSrc = '';
                $timeout(function() {
                    scope.iframeSrc = currentSrc;
                });
            });
        }
    };
});
