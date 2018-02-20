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
        $mmCourse, mmaModWikiRenewLockTimeout, $interval, $mmText, $mmaModWikiOffline, $mmEvents, $mmLang, $mmSite,
        mmaModWikiComponent, mmaModWikiPageCreatedEvent, $mmaModWikiSync, $mmSyncBlock) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        subwikiId = $stateParams.subwikiid || null,
        wikiId = $stateParams.wikiid || null,
        pageId = $stateParams.pageid || null,
        section = $stateParams.section || null,
        originalContent = null,
        editing = false,
        version = false,
        groupId = $stateParams.groupid || null,
        userId = $stateParams.userid || null,
        rteEnabled,
        subwikiFiles,
        renewLockInterval,
        editOffline = false,
        blockId = $mmaModWikiSync.subwikiBlockId(subwikiId, wikiId, userId, groupId);

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    $mmUtil.blockLeaveView($scope, cancel);

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

    if (blockId) {
        // Block the subwiki ASAP.
        $mmSyncBlock.blockOperation(mmaModWikiComponent, blockId);
    }

    $scope.save = function() {
        var text = $scope.page.text,
            promise,
            modal = $mmUtil.showModalLoading('mm.core.sending', true);

        if (rteEnabled) {
            text = $mmText.restorePluginfileUrls(text, subwikiFiles);
        } else {
            text = $mmText.formatHtmlLines(text);
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

            if (!editOffline) {
                // Check if the user has an offline page with the same title.
                promise = $mmaModWikiOffline.getNewPage($scope.page.title, subwikiId, wikiId, userId, groupId).then(function() {
                    // There's a page with same name, reject with error message.
                    return $mmLang.translateAndReject('mma.mod_wiki.pageexists');
                }, function() {
                    // Not found, page can be sent.
                });
            } else {
                promise = $q.when();
            }

            promise = promise.then(function() {
                // Try to send the page.
                var wikiId = wikiId || (module && module.instance);
                return $mmaModWiki.newPage($scope.page.title, text, subwikiId, wikiId, userId, groupId).then(function(createdId) {
                    if (createdId) {
                        // Page was created, get its data and go to the page.
                        pageId = createdId;

                        return $mmaModWiki.getPageContents(pageId).then(function(pageContents) {
                            var promises = [];
                            wikiId = parseInt(pageContents.wikiid, 10);
                            if (!subwikiId) {
                                // Subwiki was not created, invalidate subwikis as well.
                                promises.push($mmaModWiki.invalidateSubwikis(wikiId));
                            }

                            subwikiId = parseInt(pageContents.subwikiid, 10);
                            userId = parseInt(pageContents.userid, 10);
                            groupId = parseInt(pageContents.groupid, 10);
                            // Invalidate subwiki pages since there are new.
                            promises.push($mmaModWiki.invalidateSubwikiPages(wikiId));

                            return $q.all(promises).then(function() {
                                return gotoPage();
                            });
                        }).finally(function() {
                            // Notify page created.
                            $mmEvents.trigger(mmaModWikiPageCreatedEvent, {
                                pageid: pageId,
                                subwikiid: subwikiId,
                                pagetitle: $scope.page.title,
                                siteid: $mmSite.getId()
                            });
                        });
                    } else {
                        // Page stored in offline. Go to see the offline page.
                        return gotoNewOfflinePage();
                    }
                });
            });
        }

        return promise.catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error saving wiki data.');
        }).finally(function() {
            modal.dismiss();
        });
    };

    // Just ask to confirm the lost of data.
    function cancel() {
        if ((originalContent == $scope.page.text) || (!editing && !$scope.page.text && !$scope.page.title)) {
            return $q.when();
        } else {
            // Show confirmation if some data has been modified.
            return $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }
    }

    // Check if we need to navigate to a new state.
    function gotoPage() {
        return retrieveModuleInfo(wikiId).then(function() {
            var openPage = false;

            // Not the firstpage.
            if ($stateParams.subwikiid) {
                if (!editing && editOffline && backViewPageIsDifferentOffline()) {
                    // The user submitted an offline page that isn't loaded in the back view, open it.
                    openPage = true;
                } else if (!editOffline && backViewIsDifferentPageOnline()) {
                    // The user submitted an offline page that isn't loaded in the back view, open it.
                    openPage = true;
                }
            }

            if (openPage) {
                // Setting that will do the app navigate to the page.
                $scope.saveAndGoParams = {
                    module: module,
                    moduleid: module.id,
                    courseid: courseId,
                    pageid: pageId,
                    pagetitle: $scope.page.title,
                    wikiid: wikiId,
                    subwikiid: subwikiId,
                    userid: userId,
                    groupid: groupId
                };
            }

            return $ionicHistory.goBack();
        }).catch(function() {
            // Go back if fails.
            return $ionicHistory.goBack();
        });
    }

    // Navigate to a new offline page.
    function gotoNewOfflinePage() {
        if (courseId && (module.id || wikiId)) {
            // We have enough data to navigate to the page.
            if (!editOffline || backViewPageIsDifferentOffline()) {
                $scope.saveAndGoParams = {
                    module: module,
                    moduleid: module.id,
                    courseid: courseId,
                    pageid: null,
                    pagetitle: $scope.page.title,
                    wikiid: wikiId,
                    subwikiid: subwikiId,
                    userid: userId,
                    groupid: groupId
                };
            }
        } else {
            $mmUtil.showModal('mm.core.success', 'mm.core.datastoredoffline');
        }

        return $ionicHistory.goBack();
    }

    // In case we are NOT editing an offline page, check if the page loaded in back view is different than this view.
    function backViewIsDifferentPageOnline() {
        // We cannot precisely detect when the state is the same but this is close to it.
        var backView = $ionicHistory.backView();
        return !editing || backView.stateName != 'site.mod_wiki' || backView.stateParams.moduleid != module.id ||
                    backView.stateParams.pageid != pageId;
    }

    // In case we're editing an offline page, check if the page loaded in back view is different than this view.
    function backViewPageIsDifferentOffline() {
        // We cannot precisely detect when the state is the same but this is close to it.
        var backView = $ionicHistory.backView(),
            backViewParams = backView.stateParams;
        if (backView.stateName != 'site.mod_wiki' || backViewParams.moduleid != module.id || backViewParams.wikiid != wikiId ||
                backViewParams.pagetitle != $scope.page.title) {
            return true;
        }

        // Check subwiki using subwiki or user and group.
        var backSubwikiId = parseInt(backViewParams.subwikiid, 10) || 0;
        if (backSubwikiId > 0 && subwikiId > 0) {
            return backSubwikiId != subwikiId;
        }

        var backUserId = parseInt(backViewParams.userid, 10) || 0,
            backGroupId = parseInt(backViewParams.groupid, 10) || 0;
        return userId != backUserId || groupId != backGroupId;
    }

    // Renew lock and control versions.
    function renewLock() {
        $mmaModWiki.getPageForEditing(pageId, section, true).then(function(response) {
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
                editOffline = false;

                // Get page contents to obtain title and editing permission
                promise = $mmaModWiki.getPageContents(pageId).then(function(pageContents) {
                    $scope.page.title = pageContents.title;
                    wikiId = pageContents.wikiid;
                    subwikiId = pageContents.subwikiid;
                    $scope.title = $translate.instant('mma.mod_wiki.editingpage', {'$a': $scope.page.title});
                    canEdit = pageContents.caneditpage;
                    groupId = pageContents.groupid;
                    userId = pageContents.userid;

                    // Wait for sync to be over (if any).
                    return $mmaModWikiSync.waitForSync(blockId);
                }).then(function() {
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
                // New page. Wait for sync to be over (if any).
                promise = $mmaModWikiSync.waitForSync(blockId);

                if ($scope.page.title) {
                    // Check if there's already some offline data for this page.
                    promise = promise.then(function() {
                        return $mmaModWikiOffline.getNewPage($scope.page.title, subwikiId, wikiId, userId, groupId);
                    }).then(function(page) {
                        // Load offline content.
                        $scope.page.text = page.cachedcontent;
                        originalContent = $scope.page.text;
                        editOffline = true;
                    }).catch(function() {
                        // No offline data found.
                        editOffline = false;
                    });
                } else {
                    editOffline = false;
                }

                promise.then(function() {
                    $scope.wikiLoaded = true;
                    editing = false;
                    canEdit = !!blockId; // If no blockId, the user cannot edit the page.
                });
            }
        } else {
            promise = $q.when();
            canEdit = false;
        }

        return promise.catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error getting wiki data.');

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

    fetchWikiPageData().then(function() {
        if (blockId && !$scope.$$destroyed) {
            // Block the subwiki now that we have blockId for sure.
            var newBlockId = $mmaModWikiSync.subwikiBlockId(subwikiId, wikiId, userId, groupId);
            if (newBlockId != blockId) {
                $mmSyncBlock.unblockOperation(mmaModWikiComponent, blockId);
                blockId = newBlockId;
                $mmSyncBlock.blockOperation(mmaModWikiComponent, blockId);
            }
        }
    }).finally(function() {
        $scope.wikiLoaded = true;
    });


    $scope.$on('$destroy', function() {
        $interval.cancel(renewLockInterval);
        if (blockId) {
            $mmSyncBlock.unblockOperation(mmaModWikiComponent, blockId);
        }
    });
});
