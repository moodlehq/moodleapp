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
 * Directive to render attachments and allow adding more attachments or deleting the current attachments.
 * All the changes done will be applied to the "files" scope array, no file will be uploaded.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmAttachments
 * @description
 *
 * This directive will allow modifying the attachments. All the changes will be applied to the "files"
 * scope array, this directive won't update anything, so the module using this directive should be the one
 * uploading and moving the files.
 *
 * All the files added will be copied to the app temporary folder, so they should be deleted after uploading them
 * or if the user cancels the action.
 *
 * Example usage:
 *
 * <mm-attachments files="files" max-size="{{maxSize}}" max-submissions="{{maxSubmissions}}"
 *     component="{{component}}" component-id="{{assign.id}}"></mm-attachments>
 *
 * Parameters accepted:
 *
 * @param {Object[]} files          List of attachments.
 * @param {Number} [maxSize]        Maximum size for attachments. Use 0, -1 or undefined for unknown size.
 * @param {Number} [maxSubmissions] Maximum number of attachments. Use -1 or undefined for unknown limit.
 * @param {String} [component]      Component the downloaded files will be linked to.
 * @param {Mixed} [componentId]     Component ID the downloaded files will be linked to.
 * @param {Boolean} [allowOffline]  True to allow selecting files in offline.
 */
.directive('mmAttachments', function($mmText, $translate, $ionicScrollDelegate, $mmUtil, $mmApp, $mmFileUploaderHelper, $q) {
    return {
        restrict: 'E',
        priority: 100,
        templateUrl: 'core/templates/attachments.html',
        scope: {
            files: '=',
            maxSize: '@?',
            maxSubmissions: '@?',
            component: '@?',
            componentId: '@?',
            allowOffline: '@?'
        },
        link: function(scope) {
            var allowOffline = scope.allowOffline && scope.allowOffline !== 'false';
                maxSize = parseInt(scope.maxSize, 10);
            maxSize = !isNaN(maxSize) && maxSize > 0 ? maxSize : -1;

            if (maxSize == -1) {
                scope.maxSizeReadable = $translate.instant('mm.core.unknown');
            } else {
                scope.maxSizeReadable = $mmText.bytesToSize(maxSize, 2);
            }

            if (typeof scope.maxSubmissions == 'undefined' || scope.maxSubmissions < 0) {
                scope.maxSubmissions = $translate.instant('mm.core.unknown');
                scope.unlimitedFiles = true;
            }

            scope.add = function() {
                if (!allowOffline && !$mmApp.isOnline()) {
                    $mmUtil.showErrorModal('mm.fileuploader.errormustbeonlinetoupload', true);
                } else {
                    return $mmFileUploaderHelper.selectFile(maxSize, allowOffline).then(function(result) {
                        scope.files.push(result);
                    });
                }
            };

            scope.delete = function(index, askConfirm) {
                var promise;
                if (askConfirm) {
                    promise = $mmUtil.showConfirm($translate.instant('mm.core.confirmdeletefile'));
                } else {
                    promise = $q.when();
                }

                promise.then(function() {
                    // Remove the file from the list.
                    scope.files.splice(index, 1);
                    $ionicScrollDelegate.resize(); // Resize scroll area.
                });
            };

            scope.renamed = function(index, file) {
                scope.files[index] = file;
            };
        }
    };
});
