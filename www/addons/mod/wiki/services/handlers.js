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
 * Mod wiki handlers.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc service
 * @name $mmaModWikiHandlers
 */
.factory('$mmaModWikiHandlers', function($mmCourse, $mmaModWiki, $state, $mmContentLinksHelper, $mmCourseHelper, $mmUtil, $q,
        mmaModWikiComponent, $mmaModWikiPrefetchHandler, mmCoreDownloading, mmCoreNotDownloaded, mmCoreEventPackageStatusChanged,
        mmCoreOutdated, $mmCoursePrefetchDelegate, $mmSite, $mmEvents, $mmaModWikiSync, $mmContentLinkHandlerFactory, $mmText) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModWiki.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @param {Object} module The module info.
         * @param {Number} courseId The course ID.
         * @return {Function}
         */
        self.getController = function(module, courseId) {
            return function($scope) {
                var downloadBtn = {
                        hidden: true,
                        icon: 'ion-ios-cloud-download-outline',
                        label: 'mm.core.download',
                        action: function(e) {
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                            download();
                        }
                    },
                    refreshBtn = {
                        hidden: true,
                        icon: 'ion-android-refresh',
                        label: 'mm.core.refresh',
                        action: function(e) {
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                            $mmaModWiki.invalidateContent(module.id, courseId).finally(function() {
                                download();
                            });
                        }
                    };

                $scope.title = module.name;
                $scope.icon = $mmCourse.getModuleIconSrc('wiki');
                $scope.class = 'mma-mod_wiki-handler';
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_wiki', {module: module, moduleid: module.id, courseid: courseId});
                };

                function download() {

                    $scope.spinner = true; // Show spinner since this operation might take a while.
                    // We need to call getDownloadSize, the package might have been updated.
                    $mmaModWikiPrefetchHandler.getDownloadSize(module, courseId).then(function(size) {
                        $mmUtil.confirmDownloadSize(size).then(function() {
                            return $mmaModWikiPrefetchHandler.prefetch(module, courseId).catch(function(error) {
                                if (!$scope.$$destroyed) {
                                    $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
                                    return $q.reject();
                                }
                            });
                        }).catch(function() {
                            // User hasn't confirmed, stop spinner.
                            $scope.spinner = false;
                        });
                    }).catch(function(error) {
                        $scope.spinner = false;
                        $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
                    });
                }

                // Show buttons according to module status.
                function showStatus(status) {
                    if (status) {
                        $scope.spinner = status === mmCoreDownloading;
                        downloadBtn.hidden = status !== mmCoreNotDownloaded;
                        refreshBtn.hidden = status !== mmCoreOutdated;
                    }
                }

                // Listen for changes on this module status.
                var statusObserver = $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
                    if (data.siteid === $mmSite.getId() && data.componentId === module.id &&
                            data.component === mmaModWikiComponent) {
                        showStatus(data.status);
                    }
                });

                // Get current status to decide which icon should be shown.
                $mmCoursePrefetchDelegate.getModuleStatus(module, courseId).then(showStatus);

                $scope.$on('$destroy', function() {
                    statusObserver && statusObserver.off && statusObserver.off();
                });
            };
        };

        return self;
    };

    /**
     * Content links handler for module index page.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiHandlers#indexLinksHandler
     */
    self.indexLinksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModWiki', 'wiki', $mmaModWiki);

    /**
     * Content links handler for viewing a wiki page or the wiki map.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiHandlers#pageMapLinksHandler
     */
    self.pageMapLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/wiki\/(view|map)\.php.*([\&\?]pageid=\d+)/, '$mmCourseDelegate_mmaModWiki');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.pageMapLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        var isMap = url.indexOf('mod/wiki/map.php') != -1;

        if (params.id && !isMap) {
            // ID param is more prioritary than pageid in index page, it's a index URL.
            return false;
        } else if (isMap && (typeof params.option != 'undefined' && params.option != 5)) {
            // Map link but the option isn't "Page list", not supported.
            return false;
        }

        courseId = courseId || params.courseid || params.cid;
        return $mmContentLinksHelper.isModuleIndexEnabled($mmaModWiki, siteId, courseId);
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.pageMapLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;

        var pageId = parseInt(params.pageid, 10),
            action = url.indexOf('mod/wiki/map.php') != -1 ? 'map' : 'page';

        return [{
            action: function(siteId) {
                var modal = $mmUtil.showModalLoading();
                return getPageContents(pageId, siteId).then(function(page) {
                    var promise;
                    if (courseId) {
                        promise = $q.when(courseId);
                    } else {
                        promise = $mmCourseHelper.getModuleCourseIdByInstance(page.wikiid, 'wiki', siteId);
                    }

                    return promise.then(function(courseId) {
                        var stateParams = {
                            module: null,
                            moduleid: null,
                            courseid: courseId,
                            pageid: page.id,
                            pagetitle: page.title,
                            wikiid: page.wikiid,
                            subwikiid: page.subwikiid,
                            action: action
                        };
                        return $mmContentLinksHelper.goInSite('site.mod_wiki', stateParams, siteId);
                    });
                }).finally(function() {
                    modal.dismiss();
                });
            }
        }];
    };

    /**
     * Content links handler for creating a wiki page.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiHandlers#createLinksHandler
     */
    self.createLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/wiki\/create\.php.*([\&\?]swid=\d+)/, '$mmCourseDelegate_mmaModWiki');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.createLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        if (!$mmaModWiki.isPluginEnabledForEditing()) {
            return false;
        }

        courseId = courseId || params.courseid || params.cid;
        return $mmContentLinksHelper.isModuleIndexEnabled($mmaModWiki, siteId, courseId);
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.createLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;

        return [{
            action: function(siteId) {
                params.swid = parseInt(params.swid, 10);
                getCreateLinkStateParams(params, courseId, siteId).then(function(stateParams) {
                    return $mmContentLinksHelper.goInSite('site.mod_wiki-edit', stateParams, siteId);
                });
            }
        }];
    };

    /**
     * Content links handler for editing a wiki page.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiHandlers#editLinksHandler
     */
    self.editLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/wiki\/edit\.php.*([\&\?]pageid=\d+)/, '$mmCourseDelegate_mmaModWiki');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.editLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        if (!$mmaModWiki.isPluginEnabledForEditing()) {
            return false;
        }

        courseId = courseId || params.courseid || params.cid;
        return $mmContentLinksHelper.isModuleIndexEnabled($mmaModWiki, siteId, courseId);
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.editLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;

        var section = "";
        if (typeof params.section != 'undefined') {
            section = $mmText.decodeURIComponent(params.section.replace(/\+/g, ' '));
        }

        // Return actions.
        return [{
            action: function(siteId) {
                var stateParams = {
                    module: null,
                    moduleid: null,
                    courseid: courseId,
                    section: section,
                    pageid: parseInt(params.pageid, 10)
                };
                return $mmContentLinksHelper.goInSite('site.mod_wiki-edit', stateParams, siteId);
            }
        }];
    };

    /**
     * Retrieves page contents
     * @param  {Number} pageId Page ID to be retrieved
     * @param  {String} siteId Site ID page belongs to.
     * @return {Promise}        Promise resolved with the page retrieved.
     */
    function getPageContents(pageId, siteId) {
        return $mmaModWiki.getPageContents(pageId, siteId).then(function(page) {
            return page;
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_wiki.errorloadingpage', true);
            return $q.reject();
        });
    }

    // Get state params for create link, trying to get data from the current state.
    function getCreateLinkStateParams(params, courseId, siteId) {
        var modal = $mmUtil.showModalLoading();

        return currentStateIsSameWiki(params.swid, siteId).then(function(isSameWiki) {
            if (isSameWiki) {
                if ($state.params.module && $state.params.module.id) {
                    // We have the module.
                    return $state.params.module;
                } else if ($state.params.wikiid) {
                    return $mmCourse.getModuleBasicInfoByInstance($state.params.wikiid, 'wiki', siteId).catch(function() {
                        // Not found.
                    });
                }
            }
        }).then(function(module) {
            // Return the params.
            return {
                module: module,
                moduleid: module && module.id,
                courseid: courseId || (module && module.course) || $state.params.courseid,
                pagetitle: params.title,
                subwikiid: params.swid
            };
        }).finally(function() {
            modal.dismiss();
        });
    }

    // Check if the current state is a wiki page of the same wiki.
    function currentStateIsSameWiki(subwikiId, siteId) {
        if ($state.current.name == 'site.mod_wiki') {
            if ($state.params.subwikiid == subwikiId) {
                // Same wiki.
                return $q.when(true);
            } else if ($state.params.pageid) {
                // Get the page contents to check the subwiki.
                return $mmaModWiki.getPageContents($state.params.pageid, siteId).then(function(page) {
                    return page.subwikiid == subwikiId;
                }).catch(function() {
                    // Not found, return false.
                    return false;
                });
            } else if ($state.params.wikiid) {
                // Check if the subwiki belongs to this wiki.
                return $mmaModWiki.wikiHasSubwiki($state.params.wikiid, subwikiId, siteId);
            } else if ($state.params.courseid && $state.params.module) {
                var moduleId = $state.params.moduleid || ($state.params.module && $state.params.module.id);
                if (moduleId) {
                    // Get the wiki.
                    return $mmaModWiki.getWiki($state.params.courseid, moduleId, 'coursemodule', siteId).then(function(wiki) {
                        // Check if the subwiki belongs to this wiki.
                        return $mmaModWiki.wikiHasSubwiki(wiki.id, subwikiId, siteId);
                    }).catch(function() {
                        // Not found, return false.
                        return false;
                    });
                }
            }
        }

        return $q.when(false);
    }

    /**
     * Synchronization handler.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiHandlers#syncHandler
     */
    self.syncHandler = function() {

        var self = {};

        /**
         * Execute the process.
         * Receives the ID of the site affected, undefined for all sites.
         *
         * @param  {String} [siteId] ID of the site affected, undefined for all sites.
         * @return {Promise}         Promise resolved when done, rejected if failure.
         */
        self.execute = function(siteId) {
            return $mmaModWikiSync.syncAllWikis(siteId);
        };

        /**
         * Get the time between consecutive executions.
         *
         * @return {Number} Time between consecutive executions (in ms).
         */
        self.getInterval = function() {
            return 600000; // 10 minutes.
        };

        /**
         * Whether it's a synchronization process or not.
         *
         * @return {Boolean} True if is a sync process, false otherwise.
         */
        self.isSync = function() {
            return true;
        };

        /**
         * Whether the process uses network or not.
         *
         * @return {Boolean} True if uses network, false otherwise.
         */
        self.usesNetwork = function() {
            return true;
        };

        return self;
    };

    return self;
});
