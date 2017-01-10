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

angular.module('mm.core.settings')

/**
 * Controller to handle the app 'General' section in settings.
 *
 * @module mm.core.settings
 * @ngdoc controller
 * @name mmSettingsGeneralCtrl
 */
.controller('mmSettingsGeneralCtrl', function($scope, $mmLang, $ionicHistory, $mmEvents, $mmConfig, mmCoreEventLanguageChanged,
            mmCoreSettingsReportInBackground, mmCoreConfigConstants, mmCoreSettingsRichTextEditor,
            $mmUtil) {

    $scope.langs = mmCoreConfigConstants.languages;

    $mmLang.getCurrentLanguage().then(function(currentLanguage) {
        $scope.selectedLanguage = currentLanguage;
    });

    $scope.languageChanged = function(newLang) {
        $mmLang.changeCurrentLanguage(newLang).finally(function() {
            // Clear cached views.
            $ionicHistory.clearCache();
            $mmEvents.trigger(mmCoreEventLanguageChanged);
        });
    };

    $scope.rteSupported = $mmUtil.isRichTextEditorSupported();
    if ($scope.rteSupported) {
        $mmConfig.get(mmCoreSettingsRichTextEditor, true).then(function(richTextEditorEnabled) {
            $scope.richTextEditor = richTextEditorEnabled;
        });

        $scope.richTextEditorChanged = function(richTextEditor) {
            $mmConfig.set(mmCoreSettingsRichTextEditor, richTextEditor);
        };
    }

    if (localStorage && localStorage.getItem && localStorage.setItem) {
        $scope.showReport = true;
        $scope.reportInBackground = parseInt(localStorage.getItem(mmCoreSettingsReportInBackground), 10) === 1;

        $scope.reportChanged = function(inBackground) {
            localStorage.setItem(mmCoreSettingsReportInBackground, inBackground ? '1' : '0');
        };
    } else {
        $scope.showReport = false;
    }
});
