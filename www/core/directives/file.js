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
 * @param {Object} file                   Required. Object with the following attributes:
 *                                            'filename': Name of the file.
 *                                            'fileurl' or 'url': File URL.
 * @param {String} [component]            Component the file belongs to.
 * @param {Number} [componentId]          Component ID.
 * @param {Boolean} [alwaysRefresh=false] True if refreshs icon should be always shown, false otherwise.
 */
.directive('mmFile', function($q, $mmUtil, $mmFilepool, $mmSite, $mmApp, $mmEvents) {

    /**
     * Convenience function to get the file state and set scope variables based on it.
     *
     * @param  {Object} scope          Directive's scope.
     * @param  {String} siteid         Site ID.
     * @param  {String} fileurl        File URL.
     * @param  {Boolean} alwaysRefresh True if refresh button should be always shown, false if it should be shown if outdated.
     * @return {Void}
     */
    function getState(scope, siteid, fileurl, alwaysRefresh) {
        return $mmFilepool.getFileStateByUrl(siteid, fileurl).then(function(state) {
            scope.isDownloaded = state === $mmFilepool.FILEDOWNLOADED || state === $mmFilepool.FILEOUTDATED;
            scope.isDownloading = state === $mmFilepool.FILEDOWNLOADING;
            if (alwaysRefresh) {
                scope.showDownload = true;
            } else {
                scope.showDownload = state === $mmFilepool.FILENOTDOWNLOADED || state === $mmFilepool.FILEOUTDATED;
            }
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
     * @param  {Boolean} alwaysRefresh True if refresh button should be always shown, false if it should be shown if outdated.
     * @return {Promise}               Promise resolved when file is downloaded.
     */
    function downloadFile(scope, siteid, fileurl, component, componentid, alwaysRefresh) {
        scope.isDownloading = true;
        return $mmFilepool.downloadUrl(siteid, fileurl, true, component, componentid).then(function(localUrl) {
            getState(scope, siteid, fileurl, alwaysRefresh); // Update state.
            return localUrl;
        }, function() {
            $mmUtil.showErrorModal('mm.core.errordownloadingfile', true);
            return getState(scope, siteid, fileurl, alwaysRefresh).then(function() {
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
            var fileurl = $mmSite.fixPluginfileURL(scope.file.fileurl || scope.file.url),
                filename = scope.file.filename,
                siteid = $mmSite.getId(),
                component = attrs.component,
                componentid = attrs.componentId,
                alwaysRefresh = attrs.alwaysRefresh,
                eventName = $mmFilepool.getFileEventNameByUrl(siteid, fileurl);

            scope.filename = filename;
            scope.fileicon = $mmUtil.getFileIcon(filename);
            getState(scope, siteid, fileurl, alwaysRefresh);

            var observer = $mmEvents.on(eventName, function(data) {
                getState(scope, siteid, fileurl, alwaysRefresh);
                if (!data.success) {
                    $mmUtil.showErrorModal('mm.core.errordownloadingfile', true);
                }
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
                    downloadFile(scope, siteid, fileurl, component, componentid, alwaysRefresh).then(function(localUrl) {
                        $mmUtil.openFile(localUrl);
                    });
                } else {
                    // File doesn't need to be opened, add it to queue.
                    $mmFilepool.invalidateFileByUrl(siteid, fileurl).finally(function() {
                        scope.isDownloading = true;
                        $mmFilepool.addToQueueByUrl(siteid, fileurl, component, componentid);
                    });
                }
            }

            scope.$on('$destroy', function() {
                observer.off();
            });
        }
    };
});
