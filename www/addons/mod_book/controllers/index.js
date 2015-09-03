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
.controller('mmaModBookIndexCtrl', function($scope, $stateParams, $mmUtil, $mmaModBook, $log, mmaModBookComponent,
            $ionicPopover, $mmApp, $q, $mmCourse, $ionicScrollDelegate) {
    $log = $log.getInstance('mmaModBookIndexCtrl');

    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        currentChapter;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModBookComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;
    $scope.loaded = false;

    var chapters = $mmaModBook.getTocList(module.contents);
    currentChapter = $mmaModBook.getFirstChapter(chapters);

    // Convenience function to load a book chapter.
    function loadChapter(chapterId) {
        currentChapter = chapterId;
        $ionicScrollDelegate.scrollTop();
        return $mmaModBook.getChapterContent(module.contents, chapterId, module.id).then(function(content) {
            $scope.content = content;
            $scope.previousChapter = $mmaModBook.getPreviousChapter(chapters, chapterId);
            $scope.nextChapter = $mmaModBook.getNextChapter(chapters, chapterId);
        }).catch(function() {
            $mmUtil.showErrorModal('mma.mod_book.errorchapter', true);
            return $q.reject();
        }).finally(function() {
            $scope.loaded = true;
            $ionicScrollDelegate.resize(); // Call resize to recalculate scroll area.
        });
    }

    // Convenience function to download book contents and load the current chapter.
    function fetchContent(chapterId) {
        var downloadFailed = false;
        return $mmaModBook.downloadAllContent(module).catch(function() {
            // Mark download as failed but go on since the main files could have been downloaded.
            downloadFailed = true;
        }).finally(function() {
            // Show chapter.
            return loadChapter(chapterId).then(function() {
                if (downloadFailed && $mmApp.isOnline()) {
                    // We could load the main file but the download failed. Show error message.
                    $mmUtil.showErrorModal('mm.core.errordownloadingsomefiles', true);
                }
            });
        });
    }

    $scope.doRefresh = function() {
        $mmaModBook.invalidateContent(module.id).then(function() {
            return fetchContent(currentChapter);
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Function to load a chapter.
    $scope.loadChapter = function(chapterId) {
        $scope.popover.hide();
        $scope.loaded = false;
        loadChapter(chapterId);
    };

    // Menu popover.
    $scope.toc = chapters;
    $ionicPopover.fromTemplateUrl('addons/mod_book/templates/toc.html', {
        scope: $scope,
    }).then(function(popover) {
        $scope.popover = popover;
    });


    fetchContent(currentChapter).then(function() {
        $mmaModBook.logView(module.instance).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    });
});
