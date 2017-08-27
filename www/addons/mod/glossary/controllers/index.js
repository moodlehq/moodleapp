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

angular.module('mm.addons.mod_glossary')

/**
 * Glossary index controller.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc controller
 * @name mmaModGlossaryIndexCtrl
 */
.controller('mmaModGlossaryIndexCtrl', function($q, $scope, $stateParams, $ionicPopover, $mmUtil, $mmCourseHelper, $mmaModGlossary,
        $ionicScrollDelegate, $translate, $mmText, mmaModGlossaryComponent, mmaModGlossaryLimitEntriesNum, $state, $mmCourse,
        $mmaModGlossaryOffline, $mmEvents, mmaModGlossaryAddEntryEvent, mmCoreEventOnlineStatusChanged, $mmApp, $mmSite,
        mmaModGlossaryAutomSyncedEvent, $mmaModGlossarySync, mmaModGlossaryShowAllCategories) {

    var module = $stateParams.module ? angular.copy($stateParams.module) : {},
        courseId = $stateParams.courseid,
        glossary,
        noop = function(){},
        limitFrom = 0,
        limitNum = mmaModGlossaryLimitEntriesNum,
        popover,
        popoverScope,
        viewMode,   // The archetype of view (letter, date, author, cat).
        fetchMode,       // Default.
        fetchFunction,
        fetchInvalidate,
        fetchArguments,
        obsAddEntry, onlineObserver, syncObserver,
        searchingMessage = $translate.instant('mm.core.searching'),
        loadingMessage = $translate.instant('mm.core.loading');

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.externalUrl = module.url;
    $scope.courseid = courseId;
    $scope.loaded = false;
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.entries = [];
    $scope.getDivider = noop;
    $scope.showDivider = noop;
    $scope.canLoadMore = false;
    $scope.searchData = {
        searchQuery: ''
    };
    $scope.loadingMessage = loadingMessage;
    $scope.component = mmaModGlossaryComponent;
    $scope.componentId = module.id;
    $scope.moduleName = $mmCourse.translateModuleName('glossary');
    $scope.offlineEntries = [];

    function fetchGlossary(refresh, sync, showErrors) {
        $scope.isOnline = $mmApp.isOnline();

        return $mmaModGlossary.getGlossary(courseId, module.id).then(function(mod) {
            glossary = mod;

            $scope.description = glossary.intro || module.description;
            $scope.canAdd = ($mmaModGlossary.isPluginEnabledForEditing() && glossary.canaddentry) || false;

            // Preparing browse modes.
            var browseModes = [
                    {key: 'search', langkey: 'mma.mod_glossary.bysearch'}
                ];
            angular.forEach(glossary.browsemodes, function(mode) {
                switch (mode) {
                    case 'letter' :
                        browseModes.push({key: 'letter_all', langkey: 'mma.mod_glossary.byalphabet'});
                        break;
                    case 'cat' :
                        browseModes.push({key: 'cat_all', langkey: 'mma.mod_glossary.bycategory'});
                        break;
                    case 'date' :
                        browseModes.push({key: 'newest_first', langkey: 'mma.mod_glossary.bynewestfirst'});
                        browseModes.push({key: 'recently_updated', langkey: 'mma.mod_glossary.byrecentlyupdated'});
                        break;
                    case 'author' :
                        browseModes.push({key: 'author_all', langkey: 'mma.mod_glossary.byauthor'});
                        break;
                }
            });

            // Preparing the popover.
            if (!popoverScope) {
                initSortMenu();
            }
            popoverScope.modes = browseModes;

            if (sync) {
                // Try to synchronize the glossary.
                return syncGlossary(showErrors).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {

            return fetchEntries().then(function() {
                // All data obtained, now fill the context menu.
                $mmCourseHelper.fillContextMenu($scope, module, courseId, false, mmaModGlossaryComponent);

                // Check if there are responses stored in offline.
                return $mmaModGlossaryOffline.getGlossaryAddEntries(glossary.id).then(function(offlineEntries) {
                    $scope.hasOffline = !!offlineEntries.length;

                    if ($scope.hasOffline) {
                        $scope.offlineEntries = offlineEntries;
                        $scope.showNoEntries = ($scope.entries.length + offlineEntries.length) <= 0;
                    } else {
                        $scope.offlineEntries = [];
                    }
                });
            });
        }).catch(function(error) {
            if (!refresh) {
                // Get glossary failed, retry without using cache since it might be a new activity.
                return refreshData(sync);
            }

            $mmUtil.showErrorModalDefault(error, 'mma.mod_glossary.errorloadingglossary', true);

            $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
            return $q.reject();
        }).finally(function() {
            $scope.loaded = true;
            $scope.refreshIcon = 'ion-refresh';
            $scope.syncIcon = 'ion-loop';
        });
    }

    // Tries to synchronize the glossary.
    function syncGlossary(showErrors) {
        return $mmaModGlossarySync.syncGlossaryEntries(glossary.id).then(function(result) {
            if (result.warnings && result.warnings.length) {
                $mmUtil.showErrorModal(result.warnings[0]);
            }

            return result.updated;
        }).catch(function(error) {
            if (showErrors) {
                $mmUtil.showErrorModalDefault(error, 'mm.core.errorsync', true);
            }
            return $q.reject();
        });
    }

    $scope.loadMoreEntries = function() {
        loadMoreEntries().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };

    // Refresh glossary data and entries list.
    function refreshData(sync, showErrors) {
        var promises = [];
        // Ignore search mode that is not set yet.
        if (fetchMode != 'search' || $scope.searchQuery) {
            if (fetchInvalidate) {
                var args = angular.extend([], fetchArguments);
                promises.push(fetchInvalidate.apply(this, args));
            }
            promises.push($mmaModGlossary.invalidateCourseGlossaries(courseId));
        }
        if (glossary && glossary.id) {
            promises.push($mmaModGlossary.invalidateCategories(glossary.id));
        }

        return $q.all(promises).then(function() {
            limitFrom = 0;
            return fetchGlossary(true, sync, showErrors);
        });
    }

    // Pull to refresh.
    $scope.refreshEntries = function(showErrors) {
        return showSpinnerAndFetch(true, showErrors);
    };

    // Show spinner and fetch or refresh the data.
    function showSpinnerAndFetch(sync, showErrors, onlyFetch) {
        $scope.refreshIcon = 'spinner';
        $scope.syncIcon = 'spinner';
        var promise;

        if (onlyFetch) {
            limitFrom = 0;
            promise = fetchGlossary(true, sync, showErrors);
        } else {
            promise = refreshData(sync, showErrors);
        }
        return promise.finally(function() {
            $scope.loaded = true;
            $scope.refreshIcon = 'ion-refresh';
            $scope.syncIcon = 'ion-loop';
            $scope.$broadcast('scroll.refreshComplete');
        });
    }

    $scope.pickMode = function(e) {
        popover.show(e);
    };

    $scope.search = function(query) {
        $scope.loadingMessage = searchingMessage;
        fetchArguments = [glossary.id, query, 1, 'CONCEPT', 'ASC'];
        $scope.loaded = false;
        showSpinnerAndFetch(false, false, true);
    };

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
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false,
                mmaModGlossaryComponent, module.id);
    };

    $scope.gotoAddEntry = function() {
        if ($scope.canAdd) {
            var stateParams = {
                module: module,
                cmid: module.id,
                glossary: glossary,
                glossaryid: glossary.id,
                courseid: courseId
            };

            return $state.go('site.mod_glossary-edit', stateParams);
        }
    };

    $scope.gotoEditEntry = function(entry) {
        if ($scope.canAdd) {
            var stateParams = {
                module: module,
                cmid: module.id,
                glossary: glossary,
                glossaryid: glossary.id,
                courseid: courseId,
                entry: entry
            };

            return $state.go('site.mod_glossary-edit', stateParams);
        }
    };

    // Function called when we receive an event of new entry.
    function eventReceived(data) {
        if ((glossary && glossary.id === data.glossaryid) || data.cmid === module.id) {
            $scope.loaded = false;
            showSpinnerAndFetch(false);
            // Check completion since it could be configured to complete once the user adds a new discussion or replies.
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        }
    }

    fetchGlossary(false, true).then(function() {
        // After a successful fetch, the glossary can be considered as 'viewed'.
        $mmaModGlossary.logView(glossary.id, viewMode).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    }).finally(function() {
        $scope.refreshIcon = 'ion-refresh';
        $scope.syncIcon = 'ion-loop';
        $scope.loaded = true;
    });

    // Listen for entries added. When a entry is added, we reload the data.
    obsAddEntry = $mmEvents.on(mmaModGlossaryAddEntryEvent, eventReceived);

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    // Refresh data if this glossary is synchronized automatically.
    syncObserver = $mmEvents.on(mmaModGlossaryAutomSyncedEvent, function(data) {
        if (glossary && data && data.siteid == $mmSite.getId() && data.glossaryid == glossary.id &&
                data.userid == $mmSite.getUserId()) {
            // Refresh the data.
            $scope.loaded = false;
            return showSpinnerAndFetch(false);
        }
    });

    // Preparing the popover.
    function initSortMenu() {
        // Preparing the initial mode.
        switchMode('letter_all');

        popoverScope = $scope.$new(true);
        popoverScope.data = { selectedMode: fetchMode };

        popoverScope.modePicked = function(mode) {
            $scope.loadingMessage = loadingMessage;
            $ionicScrollDelegate.$getByHandle('mmaModGlossaryIndex').scrollTop(false);
            if (switchMode(mode)) {
                $scope.loaded = false;
                showSpinnerAndFetch(false, false, true);
            } else {
                // If it's not an instant search, then we reset the values.
                $scope.loaded = true;
                $scope.refreshIcon = 'ion-refresh';
                $scope.syncIcon = 'ion-loop';
                $scope.entries = [];
                $scope.canLoadMore = false;
                $scope.showNoEntries = false;
            }
            popoverScope.data.selectedMode = fetchMode;
            popover.hide();
        };

        return $ionicPopover.fromTemplateUrl('addons/mod/glossary/templates/mode_picker.html', {
            scope: popoverScope
        }).then(function(po) {
            popover = po;
            $scope.sortMenuInit = true;
        });
    }


    // Controller library.
    function fetchEntries(append) {
        if (!append) {
            limitFrom = 0;
        }
        var args = angular.extend([], fetchArguments);
        args.push(limitFrom);
        args.push(limitNum);

        return fetchFunction.apply(this, args).then(function(result) {
            if (append) {
                $scope.entries = $scope.entries.concat(result.entries);
            } else {
                $scope.entries = result.entries;
            }
            $scope.canLoadMore = (limitFrom + limitNum) < result.count;

            $scope.showNoEntries = ($scope.entries.length + $scope.offlineEntries.length) <= 0;
        }).catch(function(error) {
            if (append) {
                $mmUtil.showErrorModalDefault(error, 'mma.mod_glossary.errorloadingentries', true);
            }
            $scope.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
            return $q.reject();
        });
    }

    function loadMoreEntries() {
        limitFrom += limitNum;
        return fetchEntries(true);
    }

    function switchMode(mode) {
        if (mode == fetchMode) {
            return false;
        }

        var instantFetch = true;
        fetchMode = mode;
        $scope.isSearch = false;

        switch (mode) {
            case 'author_all':
                // Browse by author.
                viewMode = 'author';
                fetchFunction = $mmaModGlossary.getEntriesByAuthor;
                fetchInvalidate = $mmaModGlossary.invalidateEntriesByAuthor;
                fetchArguments = [glossary.id, 'ALL', 'LASTNAME', 'ASC'];
                $scope.getDivider = function(entry) {
                    return entry.userfullname;
                };
                $scope.showDivider = function(entry, previous) {
                    if (typeof previous === 'undefined') {
                        return true;
                    }
                    return entry.userid != previous.userid;
                };
                break;
            case 'cat_all':
                // Browse by category.
                viewMode = 'cat';
                fetchFunction = $mmaModGlossary.getEntriesByCategory;
                fetchInvalidate = $mmaModGlossary.invalidateEntriesByCategory;
                fetchArguments = [glossary.id, mmaModGlossaryShowAllCategories];
                $scope.getDivider = function(entry) {
                    return entry.categoryname;
                };
                $scope.showDivider = function(entry, previous) {
                    if (typeof previous === 'undefined') {
                        return true;
                    }
                    return $scope.getDivider(entry) != $scope.getDivider(previous);
                };
                break;
            case 'newest_first':
                // Newest first.
                viewMode = 'date';
                fetchFunction = $mmaModGlossary.getEntriesByDate;
                fetchInvalidate = $mmaModGlossary.invalidateEntriesByDate;
                fetchArguments = [glossary.id, 'CREATION', 'DESC'];
                $scope.getDivider = noop;
                $scope.showDivider = function() { return false; };
                break;
            case 'recently_updated':
                // Recently updated.
                viewMode = 'date';
                fetchFunction = $mmaModGlossary.getEntriesByDate;
                fetchInvalidate = $mmaModGlossary.invalidateEntriesByDate;
                fetchArguments = [glossary.id, 'UPDATE', 'DESC'];
                $scope.getDivider = noop;
                $scope.showDivider = function() { return false; };
                break;
            case 'search':
                // Search for entries.
                viewMode = 'search';
                fetchFunction = $mmaModGlossary.getEntriesBySearch;
                fetchInvalidate = $mmaModGlossary.invalidateEntriesBySearch;
                fetchArguments = false; // Dynamically set later.
                $scope.isSearch = true;
                $scope.getDivider = noop;
                $scope.showDivider = function() { return false; };
                instantFetch = false;
                break;
            case 'letter_all':
            default:
                // Consider it is 'letter_all'.
                viewMode = 'letter';
                fetchMode = 'letter_all';
                fetchFunction = $mmaModGlossary.getEntriesByLetter;
                fetchInvalidate = $mmaModGlossary.invalidateEntriesByLetter;
                fetchArguments = [glossary.id, 'ALL'];
                $scope.getDivider = function(entry) {
                    return entry.concept.substr(0, 1).toUpperCase();
                };
                $scope.showDivider = function(entry, previous) {
                    if (typeof previous === 'undefined') {
                        return true;
                    }
                    return $scope.getDivider(entry) != $scope.getDivider(previous);
                };
                break;
            }

        return instantFetch;
    }

    $scope.$on('$destroy', function() {
        obsAddEntry && obsAddEntry.off && obsAddEntry.off();
        onlineObserver && onlineObserver.off && onlineObserver.off();
        syncObserver && syncObserver.off && syncObserver.off();
        if (popover && popoverScope) {
            popover.remove();
            popoverScope.$destroy();
        }
    });
});
