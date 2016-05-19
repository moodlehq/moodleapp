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
 * Wiki index controller.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc controller
 * @name mmaModWikiIndexCtrl
 */
.controller('mmaModWikiIndexCtrl', function($q, $scope, $stateParams, $mmCourse, $mmUser, $mmGroups, $ionicPopover, $mmUtil, $state,
        $mmSite, $mmaModWiki, $ionicTabsDelegate, $ionicHistory, $translate, mmaModWikiSubwikiPagesLoaded) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        action = $stateParams.action || 'page',
        currentPage = $stateParams.pageid || false,
        popover, wiki, currentSubwiki, loadedSubwikis,
        tabsDelegate;

    $scope.title = $stateParams.pagetitle || module.name;
    $scope.description = module.description;
    $scope.mainpage = !currentPage;
    $scope.moduleUrl = module.url;
    $scope.courseId = courseId;
    $scope.subwikiData = {
        selected: 0,
        subwikis: [],
        count: 0
    };

    $scope.tabsDelegateName = 'mmaModWikiTabs_'+(module.id || 0) + '_' + (currentPage || 0) + '_' +  new Date().getTime();
    tabsDelegate = $ionicTabsDelegate.$getByHandle($scope.tabsDelegateName);

    $scope.showSubwikiPicker = function(e) {
        popover.show(e);
    };

    $scope.goHomeWiki = function(e) {
        var backTimes = getHistoryBackCounter();
        // Go back X times until the wiki home.
        $ionicHistory.goBack(backTimes);
    };

    $scope.gotoPage = function(pageId) {
        if (currentPage != pageId) {
            // Add a new State.
            return fetchPageContents(pageId).then(function(page) {
                var stateParams = {
                    module: module,
                    moduleid: module.id,
                    courseid: courseId,
                    pageid: page.id,
                    pagetitle: page.title,
                    wikiid: page.wikiid,
                    subwikiid: page.subwikiid,
                    action: 'page'
                };
                return $state.go('site.mod_wiki', stateParams);
            });
        }

        // No changes done.
        tabsDelegate.select(0);
    };

    $scope.gotoSubwiki = function(subwikiId) {

        // Check if the subwiki is disabled.
        if (subwikiId > 0) {
            popover.hide();

            if (subwikiId != currentSubwiki.id) {
                // Add a new State.
                var stateParams = {
                    module: module,
                    moduleid: module.id,
                    courseid: courseId,
                    pageid: null,
                    pagetitle: null,
                    wikiid: wiki.id,
                    subwikiid: subwikiId,
                    action: tabsDelegate.selectedIndex() == 0 ? 'page' : 'map'
                };
                return $state.go('site.mod_wiki', stateParams);
            }
        }
    };

    // Convenience function to get wiki data.
    function fetchWikiData(refresh) {
        var id = module.id || $stateParams.wikiid,
            paramName = module.id ? 'coursemodule' : 'id';
        return $mmaModWiki.getWiki(courseId, id, paramName).then(function(wikiData) {
            var promise;

            wiki = wikiData;
            $scope.wiki = wiki;

            $scope.showHomeButton = getHistoryBackCounter() < 0;

            // Get module url if not defined.
            if (!module.url) {
                promise = $mmCourse.getModule(wiki.coursemodule, wiki.course, null, true);
            } else {
                // This is done to ensure stateparams.module.instance is available when wikiid is not (needed in home button).
                // This is done only for older Moodle versions that does not send module.instance see MDL-48357.
                module.instance = wiki.id;
                promise = $q.when(module);
            }

            return promise.then(function(mod) {
                module = mod;

                $scope.title = $scope.title || wiki.title;
                $scope.description = wiki.intro || module.description;
                $scope.moduleUrl = module.url;

                // Get real groupmode, in case it's forced by the course.
                return $mmGroups.getActivityGroupMode(wiki.coursemodule).then(function(groupmode) {

                    if (groupmode === $mmGroups.SEPARATEGROUPS || groupmode === $mmGroups.VISIBLEGROUPS) {
                        // Get the groups available for the user.
                        promise = $mmGroups.getActivityAllowedGroups(wiki.coursemodule);
                    } else {
                        promise = $q.when([]);
                    }

                    return promise.then(function(userGroups) {
                        return fetchSubwikis(wiki.id).then(function() {
                            var subwikiList = $mmaModWiki.getSubwikiList(wiki.id);

                            if (!subwikiList) {
                                return createSubwikiList(userGroups);
                            }

                            $scope.subwikiData.count = subwikiList.count;
                            $scope.subwikiData.selected = $stateParams.subwikiid || subwikiList.selected;
                            $scope.subwikiData.subwikis = subwikiList.subwikis;
                            return $q.when();
                        });
                    }).then(function() {

                        if ($scope.subwikiData.count > 1) {
                            // More than one subwiki available.
                            handleSubwikiPopover();
                        }

                        if (!refresh) {
                            tabsDelegate.select(action == 'map' ? 1 : 0);
                        }

                        if (!$scope.subwikiData.selected || $scope.subwikiData.count <= 0) {
                            return $q.reject($translate.instant('mma.mod_wiki.errornowikiavailable'));
                        }
                    }).then(function() {
                        return fetchWikiPage();
                    });
                });
            });
        }).catch(function(message) {
            if (!refresh && !wiki) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData();
            }

            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting wiki data.');
            }
            return $q.reject();
        });
    }

    // Convinience function that handles Subwiki Popover.
    function handleSubwikiPopover() {
        $ionicPopover.fromTemplateUrl('addons/mod/wiki/templates/subwiki_picker.html', {
            scope: $scope
        }).then(function(po) {
            popover = po;
        });
        $scope.$on('$destroy', function() {
            popover.remove();
        });
    }


    // Create the Subwiki List for the selector
    function createSubwikiList(userGroups) {
        var subwikiList = [],
            promises = [],
            userGroupsIds = [],
            allParticipants = false,
            myGroups = false,
            multiLevelList = false,
            currentUserId = $mmSite.getUserId() || false,
            allParticipantsTitle = $translate.instant('mm.core.allparticipants'),
            nonInGroupTitle = $translate.instant('mma.mod_wiki.notingroup'),
            myGroupsTitle = $translate.instant('mm.core.mygroups'),
            otherGroupsTitle = $translate.instant('mm.core.othergroups');

        $scope.subwikiData.subwikis = [];
        $scope.subwikiData.selected = false;
        $scope.subwikiData.count = 0;

        // Group mode available.
        if (userGroups.length > 0) {
            userGroupsIds = userGroups.map(function(g) {
                return g.id;
            });
        }

        angular.forEach(loadedSubwikis, function(subwiki) {
            var groupIdx,
                promise,
                groupId = parseInt(subwiki.groupid, 10),
                groupLabel = "",
                userId = parseInt(subwiki.userid, 10);

            if (groupId == 0 && userId == 0) {
                // Add 'All participants' subwiki if needed at the start.
                if (!allParticipants) {
                    subwikiList.unshift({
                        name: allParticipantsTitle,
                        id: subwiki.id,
                        group: -1,
                        groupLabel: ""
                    });
                    allParticipants = true;
                }
            } else {
                if (groupId != 0 && userGroupsIds.length > 0) {
                    // Get groupLabel if it has groupId.
                    groupIdx = userGroupsIds.indexOf(groupId);
                    if (groupIdx > -1) {
                        groupLabel = userGroups[groupIdx].name;
                    }
                } else {
                    groupLabel = nonInGroupTitle;
                }

                if (userId != 0) {
                    // Get user if it has userid.
                    promise = $mmUser.getProfile(userId, null, true).then(function(user) {
                        subwikiList.push({
                            name: user.fullname,
                            id: subwiki.id,
                            group: groupId,
                            groupLabel: groupLabel
                        });

                    });
                    promises.push(promise);

                    if (!multiLevelList && groupId != 0) {
                        multiLevelList = true;
                    }
                } else {
                    subwikiList.push({
                        name: groupLabel,
                        id: subwiki.id,
                        group: groupId,
                        groupLabel: groupLabel,
                        canedit: subwiki.canedit
                    });
                    myGroups = true;
                }
            }

            // Select always the current user, or the first subwiki if not previously selected
            if (subwiki.id > 0 && ((userId > 0 && currentUserId == userId) ||
                !$scope.subwikiData.selected)) {
                $scope.subwikiData.selected = subwiki.id;
            }
        });

        return $q.all(promises).then(function() {
            var groupValue = -1,
                grouping;


            subwikiList.sort(function(a, b) {
                return a.group - b.group;
            });

            $scope.subwikiData.count = subwikiList.length;

            if (multiLevelList) {
                // As we loop over each subwiki, add it to the current group
                for (var i in subwikiList) {
                    var subwiki = subwikiList[i];

                    // Should we create a new grouping?
                    if (subwiki.group !== groupValue) {
                        grouping = {label: subwiki.groupLabel, subwikis: []};
                        groupValue = subwiki.group;

                        $scope.subwikiData.subwikis.push(grouping);
                    }

                    // Add the subwiki to the currently active grouping.
                    grouping.subwikis.push(subwiki);
                }
            } else if (myGroups) {
                var noGrouping = {label: "", subwikis: []},
                    myGroupsGrouping = {label: myGroupsTitle, subwikis: []},
                    otherGroupsGrouping = {label: otherGroupsTitle, subwikis: []};

                // As we loop over each subwiki, add it to the current group
                for (var i in subwikiList) {
                    var subwiki = subwikiList[i];

                    // Add the subwiki to the currently active grouping.
                    if (typeof subwiki.canedit == 'undefined') {
                        noGrouping.subwikis.push(subwiki);
                    } else if(subwiki.canedit) {
                        myGroupsGrouping.subwikis.push(subwiki);
                    } else {
                        otherGroupsGrouping.subwikis.push(subwiki);
                    }
                }

                // Add each grouping to the subwikis
                if (noGrouping.subwikis.length > 0) {
                    $scope.subwikiData.subwikis.push(noGrouping);
                }
                if (myGroupsGrouping.subwikis.length > 0) {
                    $scope.subwikiData.subwikis.push(myGroupsGrouping);
                }
                if (otherGroupsGrouping.subwikis.length > 0) {
                    $scope.subwikiData.subwikis.push(otherGroupsGrouping);
                }
            } else {
                $scope.subwikiData.subwikis.push({label: "", subwikis: subwikiList});
            }

            $mmaModWiki.setSubwikiList(wiki.id, $scope.subwikiData.subwikis, $scope.subwikiData.count, $scope.subwikiData.selected);
        });
    }

    // Get number of steps to get the first page of the wiki in the history
    function getHistoryBackCounter() {
        var view, historyInstance, backTimes = 0,
            backViewId = $ionicHistory.currentView().backViewId;

        if (!wiki.id) {
            return 0;
        }

        while (backViewId) {
            view = $ionicHistory.viewHistory().views[backViewId];

            if (view.stateName != 'site.mod_wiki') {
                break;
            }

            historyInstance = view.stateParams.wikiid ? view.stateParams.wikiid : view.stateParams.module.instance;

            // Check we are not changing to another Wiki.
            if (historyInstance && historyInstance == wiki.id) {
                backTimes--;
            } else {
                break;
            }

            backViewId = view.backViewId;
        }

        return backTimes;
    }

    // Convenience function to get wiki options.
    function fetchSubwikis(wikiId) {
        return $mmaModWiki.getSubwikis(wikiId).then(function(subwikis) {
            loadedSubwikis = subwikis;
        });
    }

    // Fetch the page to be shown.
    function fetchWikiPage() {
        // Search the current Subwiki.
        currentSubwiki = false;
        angular.forEach(loadedSubwikis, function(subwiki) {
            if (!currentSubwiki && subwiki.id == $scope.subwikiData.selected) {
                currentSubwiki = subwiki;
            }
        });

        if (!currentSubwiki) {
            return $q.reject();
        }

        $scope.subwikiData.selected = currentSubwiki.id;

        // We need fetchSubwikis to finish before calling fetchSubwikiPages because it needs subwikiid and pageid variable.
        return fetchSubwikiPages(currentSubwiki).then(function() {
            return fetchPageContents(currentPage).then(function(pageContents) {
                $scope.title = pageContents.title;
                $scope.subwikiData.selected = pageContents.subwikiid;
                $scope.pageContent = pageContents.cachedcontent;
            });
        }).finally(function() {
            $scope.wikiLoaded = true;
        });
    }

    // Convenience function to get wiki subwikiPages.
    function fetchSubwikiPages(subwiki) {
        return $mmaModWiki.getSubwikiPages(subwiki.wikiid, subwiki.groupid, subwiki.userid).then(function(subwikiPages) {

            angular.forEach(subwikiPages, function(subwikiPage) {
                if (!currentPage && subwikiPage.firstpage) {
                    currentPage = subwikiPage.id;
                }
            });
            $scope.subwikiPages = subwikiPages;

            if (!currentPage) {
                return $q.reject();
            }

            $scope.$broadcast(mmaModWikiSubwikiPagesLoaded, $scope.subwikiPages);
        });
    }

    // Convenience function to get wiki page contents.
    function fetchPageContents(pageId) {
        return $mmaModWiki.getPageContents(pageId).then(function(pageContents) {
            return pageContents;
        });
    }


    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [$mmaModWiki.invalidateWikiData(courseId)];
        if (wiki) {
            promises.push($mmaModWiki.invalidateSubwikis(wiki.id));
            promises.push($mmGroups.invalidateActivityAllowedGroups(wiki.coursemodule));
            promises.push($mmGroups.invalidateActivityGroupMode(wiki.coursemodule));
        }
        if (currentSubwiki) {
            promises.push($mmaModWiki.invalidateSubwikiPages(currentSubwiki.wikiid));
            promises.push($mmaModWiki.invalidateSubwikiFiles(currentSubwiki.wikiid));
        }
        if (currentPage) {
            promises.push($mmaModWiki.invalidatePage(currentPage));
        }

        return $q.all(promises).finally(function() {
            return fetchWikiData(true);
        });
    }

    fetchWikiData().then(function() {
        if (!currentPage) {
            $mmaModWiki.logView(wiki.id).then(function() {
                $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
            });
        } else {
            $mmaModWiki.logPageView(currentPage);
        }
    }).finally(function() {
        $scope.wikiLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshWiki = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
