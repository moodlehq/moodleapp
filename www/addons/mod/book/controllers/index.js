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

angular.module('mm.addons.mod_book')

/**
 * Book index controller.
 *
 * @module mm.addons.mod_book
 * @ngdoc controller
 * @name mmaModBookIndexCtrl
 */
.controller('mmaModBookIndexCtrl', function($scope, $stateParams, $mmUtil, $mmCourseHelper, $mmaModBook, $log, mmaModBookComponent,
            $mmText, $ionicPopover, $mmApp, $q, $mmCourse, $ionicScrollDelegate, $translate, $mmaModBookPrefetchHandler) {
    $log = $log.getInstance('mmaModBookIndexCtrl');

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        chapters,
        currentChapter,
        contentsMap;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModBookComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;
    $scope.loaded = false;
    $scope.refreshIcon = 'spinner';

    // Convenience function to load a book chapter.
    function loadChapter(chapterId) {
        currentChapter = chapterId;
        $ionicScrollDelegate.scrollTop();

        return $mmaModBook.getChapterContent(contentsMap, chapterId, module.id).then(function(content) {
            $scope.content = content;
            $scope.previousChapter = $mmaModBook.getPreviousChapter(chapters, chapterId);
            $scope.nextChapter = $mmaModBook.getNextChapter(chapters, chapterId);

            // Chapter loaded, log view. We don't return the promise because we don't want to block the user for this.
            $mmaModBook.logView(module.instance, chapterId).then(function() {
                // Module is completed when last chapter is viewed, so we only check completion if the last is reached.
                if (!$scope.nextChapter) {
                    $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
                }
            });
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_book.errorchapter', true);
            return $q.reject();
        }).finally(function() {
            $scope.loaded = true;
            $scope.refreshIcon = 'ion-refresh';
            $ionicScrollDelegate.resize(); // Call resize to recalculate scroll area.
        });
    }

    // Convenience function to download book contents and load the current chapter.
    function fetchContent(chapterId, refresh) {
        var downloadFailed = false,
            promises = [];

        // Try to get the book data.
        promises.push($mmaModBook.getBook(courseId, module.id).then(function(book) {
            $scope.title = book.name || $scope.title;
            $scope.description = book.intro || $scope.description;
        }).catch(function() {
            // Ignore errors since this WS isn't available in some Moodle versions.
        }));

        // Download content. This function also loads module contents if needed.
        promises.push($mmaModBookPrefetchHandler.download(module, courseId).catch(function() {
            // Mark download as failed but go on since the main files could have been downloaded.
            downloadFailed = true;

            if (!module.contents.length) {
                // Try to load module contents for offline usage.
                return $mmCourse.loadModuleContents(module, courseId).catch(function(error) {
                    // Error getting module contents, fail.
                    $scope.loaded = true;
                    $scope.refreshIcon = 'ion-refresh';
                    $mmUtil.showErrorModalDefault(error, 'mm.course.errorgetmodule', true);
                    return $q.reject();
                });
            }
        }));

        return $q.all(promises).then(function() {
            contentsMap = $mmaModBook.getContentsMap(module.contents);
            chapters = $mmaModBook.getTocList(module.contents);
            $scope.toc = chapters;

            if (typeof currentChapter == 'undefined') {
                currentChapter = $mmaModBook.getFirstChapter(chapters);
            }

            // Show chapter.
            return loadChapter(chapterId || currentChapter).then(function() {
                if (downloadFailed && $mmApp.isOnline()) {
                    // We could load the main file but the download failed. Show error message.
                    $mmUtil.showErrorModal('mm.core.errordownloadingsomefiles', true);
                }

                // All data obtained, now fill the context menu.
                $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModBookComponent);
            });
        });
    }

    $scope.doRefresh = function() {
        if ($scope.loaded) {
            $scope.refreshIcon = 'spinner';

            return $mmaModBook.invalidateContent(module.id, courseId).finally(function() {
                return fetchContent(currentChapter, true);
            }).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Function to load a chapter.
    $scope.loadChapter = function(chapterId) {
        $scope.popover.hide();
        $scope.loaded = false;
        $scope.refreshIcon = 'spinner';
        loadChapter(chapterId);
    };

    // Menu popover.
    $ionicPopover.fromTemplateUrl('addons/mod/book/templates/toc.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.popover = popover;

        $scope.openToc = function($event) {
            popover.show($event);
        };
    });

    // Confirm and Remove action.
    $scope.removeFiles = function() {
        $mmCourseHelper.confirmAndRemove(module, courseId);
    };

    // Context Menu Prefetch action.
    $scope.prefetch = function() {
        $mmCourseHelper.contextMenuPrefetch($scope, module, courseId);
    };
    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModBookComponent, module.id);
    };


    fetchContent();
});
