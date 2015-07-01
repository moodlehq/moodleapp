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
.controller('mmaModBookIndexCtrl', function($scope, $stateParams, $mmUtil, $mmaModBook, $mmSite, $log, mmaModBookComponent,
                                            $ionicPopover) {
    $log = $log.getInstance('mmaModBookIndexCtrl');

    var module = $stateParams.module || {};

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModBookComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;
    $scope.loaded = false;

    var chapters = $mmaModBook.getTocList(module.contents);
    var firstChapter = $mmaModBook.getFirstChapter(chapters);
    $scope.previousChapter = 0;
    $scope.nextChapter = $mmaModBook.getNextChapter(chapters, firstChapter);


    function fetchContent() {
        // Show first chapter.
        return $mmaModBook.getChapterContent(module.contents, firstChapter, module.id).then(function(content) {
            $scope.content = content;
        }).catch(function() {
            $mmUtil.showErrorModal('mma.mod_book.errorchapter');
        }).finally(function() {
            $scope.loaded = true;
        });
    }

    $scope.doRefresh = function() {
        $mmaModBook.invalidateContent(module.id).then(function() {
            return fetchContent();
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.loadChapter = function(chapterId) {
        $scope.popover.hide();
        $scope.loaded = false;
        $mmaModBook.getChapterContent(module.contents, chapterId, module.id).then(function(content) {
            $scope.content = content;
            $scope.previousChapter = $mmaModBook.getPreviousChapter(chapters, chapterId);
            $scope.nextChapter = $mmaModBook.getNextChapter(chapters, chapterId);
        }).catch(function() {
            $mmUtil.showErrorModal('mma.mod_book.errorchapter', true);
        }).finally(function() {
            $scope.loaded = true;
        });
    };

    // Menu popover.
    $scope.toc = chapters;
    $ionicPopover.fromTemplateUrl('addons/mod_book/templates/toc.html', {
        scope: $scope,
    }).then(function(popover) {
        $scope.popover = popover;
    });


    fetchContent().then(function() {
        if (module.instance) {
            $mmSite.write('mod_book_view_book', {
                urlid: module.instance
            });
        }
    });
});
