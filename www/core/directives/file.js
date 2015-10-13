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
 * Directive to handle a file (my files, attachments, etc.). The file is not downloaded automatically.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmFile
 * @description
 * Directive to handle files (my files, attachments, etc.). Shows the file name, icon (depending on mimetype) and a button
 * to download/refresh it.
 *
 * Attributes:
 * @param {Object} file            Required. Object with the following attributes:
 *                                     'filename': Name of the file.
 *                                     'fileurl' or 'url': File URL.
 * @param {String} [component]     Component the file belongs to.
 * @param {Number} [componentId]   Component ID.
 * @param {Boolean} [timemodified] If set, the value will be used to check if the file is outdated.
 */
.directive('mmFile', function($q, $mmUtil, $mmFilepool, $mmSite, $mmApp, $mmEvents) {

    /**
     * Convenience function to get the file state and set scope variables based on it.
     *
     * @param  {Object} scope          Directive's scope.
     * @param  {String} siteid         Site ID.
     * @param  {String} fileurl        File URL.
     * @param  {Number} [timemodified] File's timemodified.
     * @return {Void}
     */
    function getState(scope, siteid, fileurl, timemodified) {
        return $mmFilepool.getFileStateByUrl(siteid, fileurl, timemodified).then(function(state) {
            var canDownload = $mmSite.canDownloadFiles();
            scope.isDownloaded = state === $mmFilepool.FILEDOWNLOADED || state === $mmFilepool.FILEOUTDATED;
            scope.isDownloading = canDownload && state === $mmFilepool.FILEDOWNLOADING;
            scope.showDownload = canDownload && (state === $mmFilepool.FILENOTDOWNLOADED || state === $mmFilepool.FILEOUTDATED);
        });
    }

    /**
     * Convenience function to download a file.
     *
     * @param  {Object} scope          Directive's scope.
     * @param  {String} siteid         Site ID.
     * @param  {String} fileurl        File URL.
     * @param  {String} component      Component the file belongs to.
     * @param  {Number} componentid    Component ID.
     * @param  {Number} [timemodified] File's timemodified.
     * @return {Promise}               Promise resolved when file is downloaded.
     */
    function downloadFile(scope, siteid, fileurl, component, componentid, timemodified) {
        if (!$mmSite.canDownloadFiles()) {
            $mmUtil.showErrorModal('mm.core.cannotdownloadfiles', true);
            return $q.reject();
        }

        scope.isDownloading = true;
        return $mmFilepool.downloadUrl(siteid, fileurl, true, component, componentid, timemodified).then(function(localUrl) {
            getState(scope, siteid, fileurl, timemodified); // Update state.
            return localUrl;
        }, function() {
            return getState(scope, siteid, fileurl, timemodified).then(function() {
                if (scope.isDownloaded) {
                    return localUrl;
                } else {
                    return $q.reject();
                }
            });
        });
    }

    return {
        restrict: 'E',
        templateUrl: 'core/templates/file.html',
        scope: {
            file: '='
        },
        link: function(scope, element, attrs) {
            var fileurl = scope.file.fileurl || scope.file.url,
                filename = scope.file.filename,
                timemodified = attrs.timemodified || 0,
                siteid = $mmSite.getId(),
                component = attrs.component,
                componentid = attrs.componentId,
                observer;

            scope.filename = filename;
            scope.fileicon = $mmUtil.getFileIcon(filename);
            getState(scope, siteid, fileurl, timemodified);

            $mmFilepool.getFileEventNameByUrl(siteid, fileurl).then(function(eventName) {
                observer = $mmEvents.on(eventName, function(data) {
                    getState(scope, siteid, fileurl, timemodified);
                    if (!data.success) {
                        $mmUtil.showErrorModal('mm.core.errordownloading', true);
                    }
                });
            });

            scope.download = function(e, openAfterDownload) {
                e.preventDefault();
                e.stopPropagation();

                if (scope.isDownloading) {
                    return;
                }

                if (!$mmApp.isOnline() && (!openAfterDownload || (openAfterDownload && !scope.isDownloaded))) {
                    $mmUtil.showErrorModal('mm.core.networkerrormsg', true);
                    return;
                }

                if (openAfterDownload) {
                    // File needs to be opened now. If file needs to be downloaded, skip the queue.
                    downloadFile(scope, siteid, fileurl, component, componentid, timemodified).then(function(localUrl) {
                        $mmUtil.openFile(localUrl);
                    });
                } else {
                    // File doesn't need to be opened, add it to queue.
                    $mmFilepool.invalidateFileByUrl(siteid, fileurl).finally(function() {
                        scope.isDownloading = true;
                        $mmFilepool.addToQueueByUrl(siteid, fileurl, component, componentid, timemodified);
                    });
                }
            }

            scope.$on('$destroy', function() {
                if (observer && observer.off) {
                    observer.off();
                }
            });
        }
    };
});
