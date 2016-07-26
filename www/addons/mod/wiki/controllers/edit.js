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

angular.module('mm.addons.mod_wiki')

/**
 * Wiki edit page controller.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc controller
 * @name mmaModWikiEditCtrl
 */
.controller('mmaModWikiEditCtrl', function($q, $scope, $stateParams, $mmUtil, $state, $mmaModWiki, $translate, $ionicHistory,
        $mmCourse, $ionicPlatform, $rootScope, mmaModWikiRenewLockTimeout, $interval, $mmText, mmaModWikiComponent) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        subwikiId = $stateParams.subwikiid || null,
        wikiId = null,
        pageId = $stateParams.pageid || null,
        section = $stateParams.section || null,
        originalBackFunction = $rootScope.$ionicGoBack,
        unregisterHardwareBack,
        originalContent = null,
        editing = false,
        version = false,
        groupId,
        userId,
        rteEnabled,
        subwikiFiles,
        renewLockInterval;

    $scope.saveAndGoParams = false; // See $ionicView.afterLeave.
    $scope.component = mmaModWikiComponent;
    $scope.componentId = module.id;

    $scope.page = {
        title: $stateParams.pagetitle ? $stateParams.pagetitle.replace(/\+/g, " ") : null,
        text: ""
    };

    $scope.canEditTitle = !$stateParams.pagetitle;

    $scope.title = $scope.page.title ? $translate.instant('mma.mod_wiki.editingpage', {'$a': $scope.page.title}) :
        $translate.instant('mma.mod_wiki.newpagehdr');

    $scope.save = function() {
        var text = $scope.page.text,
            promise,
            modal = $mmUtil.showModalLoading('mm.core.sending', true);

        if (rteEnabled) {
            text = $mmText.restorePluginfileUrls(text, subwikiFiles);
        }

        if (editing) {
            promise = $mmaModWiki.editPage(pageId, text, section).then(function() {
                // Invalidate page since it changed.
                return $mmaModWiki.invalidatePage(pageId).then(function() {
                    return gotoPage();
                });
            });
        } else {
            if (!$scope.page.title) {
                return $mmUtil.showModal('mm.core.notice', 'mma.mod_wiki.titleshouldnotbeempty');
            }

            promise = $mmaModWiki.newPage(subwikiId, $scope.page.title, text).then(function(createdId) {
                pageId = createdId;

                return $mmaModWiki.getPageContents(pageId).then(function(pageContents) {
                    wikiId = pageContents.wikiid;
                    subwikiId = pageContents.subwikiid;
                    // Invalidate subwiki pages since there are new.
                    return $mmaModWiki.invalidateSubwikiPages(pageContents.wikiid).then(function() {
                        return gotoPage();
                    });
                });
            });
        }

        return promise.catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error saving wiki data.');
            }

            return $ionicHistory.goBack();
        }).finally(function() {
            modal.dismiss();
        });
    };

    // Just ask to confirm the lost of data.
    function cancel() {
        var promise;

        if ((editing && originalContent == $scope.page.text) || (!editing && !$scope.page.text && !$scope.page.title)) {
            promise = $q.when();
        } else {
            // Show confirmation if some data has been modified.
            promise = $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }

        return promise.then(function() {
            return $ionicHistory.goBack();
        });
    }

    // Check if we need to navigate to a new state.
    function gotoPage() {
        return retrieveModuleInfo(wikiId).then(function() {
            var backView = $ionicHistory.backView();

            // We cannot precissely detect when the state is the same but this is close to it.
            if (!editing || backView.stateName != 'site.mod_wiki' || backView.stateParams.moduleid != module.id ||
                    backView.stateParams.pageid != pageId) {
                // Setting that will do the app navigate to the page.
                $scope.saveAndGoParams = {
                    module: module,
                    moduleid: module.id,
                    courseid: courseId,
                    pageid: pageId,
                    pagetitle: $scope.page.title,
                    wikiid: wikiId,
                    subwikiid: subwikiId
                };
            }

            return $ionicHistory.goBack();
        }).catch(function() {
            //Go back if fails.
            return $ionicHistory.goBack();
        });
    }

    // Renew lock and control versions.
    function renewLock() {
        $mmaModWiki.getPageForEditing(pageId, section).then(function(response) {
            if (response.version && version != response.version) {
                $scope.wrongVersionLock = true;
            }
        });
    }

    // Convenience function to get wiki page data.
    function fetchWikiPageData() {
        var promise, canEdit = false;

        if ($mmaModWiki.isPluginEnabledForEditing()) {
            if (pageId) {
                $scope.canEditTitle = false;
                editing = true;
                // Get page contents to obtain title and editing permission
                promise = $mmaModWiki.getPageContents(pageId).then(function(pageContents) {
                    $scope.page.title = pageContents.title;
                    wikiId = pageContents.wikiid;
                    subwikiId = pageContents.subwikiid;
                    $scope.title = $translate.instant('mma.mod_wiki.editingpage', {'$a': $scope.page.title});
                    canEdit = pageContents.caneditpage;
                    groupId = pageContents.groupid;
                    userId = pageContents.userid;

                    // Check if rich text editor is enabled.
                    return $mmUtil.isRichTextEditorEnabled();
                }).then(function(enabled) {
                    rteEnabled = enabled;

                    if (enabled) {
                        // Get subwiki files, needed to replace URLs for rich text editor.
                        return $mmaModWiki.getSubwikiFiles(wikiId, groupId, userId);
                    }
                }).then(function(files) {
                    subwikiFiles = files;

                    // Get editable text of the page/section.
                    return $mmaModWiki.getPageForEditing(pageId, section);
                }).then(function(editContents) {
                    if (rteEnabled) {
                        $scope.page.text = $mmText.replacePluginfileUrls(editContents.content, subwikiFiles);
                    } else {
                        $scope.page.text = editContents.content;
                    }
                    originalContent = $scope.page.text;
                    version = editContents.version;

                    if (canEdit) {
                        renewLockInterval = $interval(function() {
                            renewLock();
                        }, mmaModWikiRenewLockTimeout * 1000);
                    }
                }).finally(function() {
                    $scope.wikiLoaded = true;
                });
            } else {
                // New page
                $scope.wikiLoaded = true;
                editing = false;
                canEdit = !!subwikiId; // If no subwikiId is received, the user cannot edit the page.
                promise = $q.when();
            }
        } else {
            promise = $q.when();
            canEdit = false;
        }

        return promise.catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting wiki data.');
            }

            return $ionicHistory.goBack();
        }).finally(function() {
            // Check page edition is avalaible.
            if (!canEdit) {
                $mmUtil.showModal('mm.core.notice', 'mma.mod_wiki.cannoteditpage').then(function() {
                    $ionicHistory.goBack();
                });
            }
        });
    }

    // Fetch module information to redirect when needed.
    function retrieveModuleInfo(wikiId) {
        if (module.id && courseId) {
            return $q.when();
        }

        var promise = module.id ? $q.when(module) : $mmCourse.getModuleBasicInfoByInstance(wikiId, 'wiki');

        return promise.then(function(info) {
            module = info;
            $scope.componentId = module.id;
            if (!courseId && module.course) {
                courseId = module.course;
            } else if (!courseId) {
                return $mmCourseHelper.getModuleCourseIdByInstance(wikiId, 'wiki').then(function(course) {
                    courseId = course;
                });
            }
            return $q.when();
        });
    }

    // Text changed.
    $scope.firstRender = function() {
        originalContent = $scope.page.text;
    };

    // removeBackView is no available so if entering from forward view,
    // we want to "delete" the previous view (going back) and then go to the new/edited page.
    $scope.$on('$ionicView.afterLeave', function(event) {
        if (event.targetScope.saveAndGoParams) {
            // Goto the page we've just created/edited.
            return $state.go('site.mod_wiki', event.targetScope.saveAndGoParams);
        }
    });

    // Override Ionic's back button behavior.
    $rootScope.$ionicGoBack = cancel;

    // Override Android's back button. We set a priority of 101 to override the "Return to previous view" action.
    unregisterHardwareBack = $ionicPlatform.registerBackButtonAction(cancel, 101);

    fetchWikiPageData().finally(function() {
        $scope.wikiLoaded = true;
    });


    $scope.$on('$destroy', function() {
        // Restore original back functions.
        unregisterHardwareBack();
        $rootScope.$ionicGoBack = originalBackFunction;
        $interval.cancel(renewLockInterval);
    });
});
