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
.controller('mmaModGlossaryIndexCtrl', function($q, $scope, $stateParams, $ionicPopover, $mmUtil, $mmaModGlossary,
        $ionicScrollDelegate, $translate) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        glossary,
        noop = function(){},
        limitFrom = 0,
        limitNum = 25,
        popover,
        viewMode,   // The archetype of view (letter, date, author, cat).
        fetchMode = 'letter_all',       // Default.
        fetchFunction,
        fetchInvalidate,
        fetchArguments,
        popoverScope = $scope.$new(true),
        browseModes = [
            {
                key: 'letter_all',
                langkey: 'mma.mod_glossary.byalphabet'
            },
            {
                key: 'search',
                langkey: 'mma.mod_glossary.bysearch'
            }
        ],
        searchingMessage = $translate.instant('mm.core.searching'),
        loadingMessage = $translate.instant('mm.core.loading');

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.externalUrl = module.url;
    $scope.courseid = courseId;
    $scope.loaded = false;
    $scope.entries = [];
    $scope.getDivider = noop;
    $scope.showDivider = noop;
    $scope.canLoadMore = false;
    $scope.searchData = {
        searchQuery: ''
    };
    $scope.loadingMessage = loadingMessage;

    $scope.loadMoreEntries = function() {
        loadMoreEntries().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };
    $scope.refreshEntries = function() {
        refreshEntries().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.pickMode = function(e) {
        popoverScope.data.selectedMode = fetchMode;
        popover.show(e);
    };

    $scope.search = function(query) {
        $scope.loadingMessage = searchingMessage;
        fetchArguments = [glossary.id, query, 1, 'CONCEPT', 'ASC'];
        $scope.loaded = false;
        fetchEntries().finally(function() {
            $scope.loaded = true;
        });
    };

    $scope.trackBy = function(entry) {
        return fetchMode + ':' + entry.id;
    };

    // Controller run.
    $mmaModGlossary.getGlossary(courseId, module.id).then(function(mod) {
        glossary = mod;

        // Preparing browse modes.
        if (glossary.browsemodes.indexOf('date') >= 0) {
            browseModes.push({key: 'newest_first', langkey: 'mma.mod_glossary.bynewestfirst'});
            browseModes.push({key: 'recently_updated', langkey: 'mma.mod_glossary.byrecentlyupdated'});
        }
        if (glossary.browsemodes.indexOf('author') >= 0) {
            browseModes.push({key: 'author_all', langkey: 'mma.mod_glossary.byauthor'});
        }

        // Preparing the popover.
        popoverScope.modes = browseModes;
        popoverScope.modePicked = function(mode) {
            $scope.loadingMessage = loadingMessage;
            $ionicScrollDelegate.$getByHandle('mmaModGlossaryIndex').scrollTop(false);
            if (switchMode(mode)) {
                $scope.loaded = false;
                fetchEntries().finally(function() {
                    $scope.loaded = true;
                });
            } else {
                // If it's not an instant search, then we reset the values.
                $scope.loaded = true;
                $scope.entries = [];
                $scope.canLoadMore = false;
                $scope.showNoEntries = false;
            }
            popover.hide();
        };
        popoverScope.data = { selectedMode: '' };
        $ionicPopover.fromTemplateUrl('addons/mod/glossary/templates/mode_picker.html', {
            scope: popoverScope
        }).then(function(po) {
            popover = po;
        });
        $scope.$on('$destroy', function() {
            popover.remove();
            popoverScope.$destroy();
        });

        // Preparing the initial mode.
        switchMode();

        // Do not return the promise here, the error modal is already handled.
        fetchEntries().then(function() {
            // After a successful fetch, the glossary can be considered as 'viewed'.
            $mmaModGlossary.logView(glossary.id, viewMode);
        }).finally(function() {
            $scope.loaded = true;
        });
    }).catch(function() {
        $mmUtil.showErrorModal('mma.mod_glossary.errorloadingglossary', true);
        $scope.loaded = true;
    });

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
            $scope.showNoEntries = result.count <= 0;
        }).catch(function() {
            $mmUtil.showErrorModal('mma.mod_glossary.errorloadingentries', true);
            return $q.reject();
        });
    }

    function refreshEntries() {
        if (fetchMode == 'search' && !$scope.searchQuery) {
            // Ignore search mode that is not set yet.
            return $q.when();
        }
        var args = angular.extend([], fetchArguments);
        return fetchInvalidate.apply(this, args).then(function() {
            limitFrom = 0;
            return fetchEntries();
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

        // Browse by author.
        if (mode == 'author_all') {
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

        // Newest first.
        } else if (mode == 'newest_first') {
            viewMode = 'date';
            fetchFunction = $mmaModGlossary.getEntriesByDate;
            fetchInvalidate = $mmaModGlossary.invalidateEntriesByDate;
            fetchArguments = [glossary.id, 'CREATION', 'DESC'];
            $scope.getDivider = noop;
            $scope.showDivider = function() { return false; };

        // Recently updated.
        } else if (mode == 'recently_updated') {
            viewMode = 'date';
            fetchFunction = $mmaModGlossary.getEntriesByDate;
            fetchInvalidate = $mmaModGlossary.invalidateEntriesByDate;
            fetchArguments = [glossary.id, 'UPDATE', 'DESC'];
            $scope.getDivider = noop;
            $scope.showDivider = function() { return false; };

        // Search for entries.
        } else if (mode == 'search') {
            viewMode = 'search';
            fetchFunction = $mmaModGlossary.getEntriesBySearch;
            fetchInvalidate = $mmaModGlossary.invalidateEntriesBySearch;
            fetchArguments = false; // Dynamically set later.
            $scope.isSearch = true;
            $scope.getDivider = noop;
            $scope.showDivider = function() { return false; };
            instantFetch = false;

        // Consider it is 'letter_all'.
        } else {
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
        }

        return instantFetch;
    }
});
