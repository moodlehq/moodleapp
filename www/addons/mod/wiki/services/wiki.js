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
 * Wiki service.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc service
 * @name $mmaModWiki
 */
.factory('$mmaModWiki', function($q, $mmSite, $mmSitesManager, $mmFilepool, $mmApp, $mmaModWikiOffline, $mmUtil, $mmLang,
            mmaModWikiComponent) {
    var self = {},
        subwikiListsCache = {};

    /**
     * Get cache key for wiki data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getWikiDataCacheKey(courseId) {
        return 'mmaModWiki:wiki:' + courseId;
    }

    /**
     * Get cache key for wiki SubWikis WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikisCacheKey(wikiId) {
        return 'mmaModWiki:subwikis:' + wikiId;
    }

    /**
     * Get cache key for wiki Subwiki Pages WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @param {Number} groupId Group ID.
     * @param {Number} userId User ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikiPagesCacheKey(wikiId, groupId, userId) {
        return getWikiSubwikiPagesCacheKeyPrefix(wikiId) + ':' + groupId + ':' + userId;
    }

    /**
     * Get cache key for all wiki Subwiki Pages WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikiPagesCacheKeyPrefix(wikiId) {
        return 'mmaModWiki:subwikipages:' + wikiId;
    }

    /**
     * Get cache key for wiki Subwiki Files WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @param {Number} groupId Group ID.
     * @param {Number} userId User ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikiFilesCacheKey(wikiId, groupId, userId) {
        return getWikiSubwikiFilesCacheKeyPrefix(wikiId) + ':' + groupId + ':' + userId;
    }

    /**
     * Get cache key for all wiki Subwiki Files WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikiFilesCacheKeyPrefix(wikiId) {
        return 'mmaModWiki:subwikifiles:' + wikiId;
    }


    /**
     * Get cache key for wiki Pages Contents WS calls.
     *
     * @param {Number} pageId Wiki Page ID.
     * @return {String}     Cache key.
     */
    function getWikiPageCacheKey(pageId) {
        return 'mmaModWiki:page:' + pageId;
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the wiki WS are available.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_wiki_get_wikis_by_courses') &&
                    site.wsAvailable('mod_wiki_get_subwikis') &&
                    site.wsAvailable('mod_wiki_get_subwiki_pages') &&
                    site.wsAvailable('mod_wiki_get_page_contents');
        });
    };

    /**
     * Return whether or not the plugin is enabled for editing in the current site. Plugin is enabled if the wiki WS are available.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#isPluginEnabledForEditing
     * @return {Boolean}     Whether the wiki editing is available or not.
     */
    self.isPluginEnabledForEditing = function() {
        return  $mmSite.wsAvailable('mod_wiki_get_page_for_editing') &&
                $mmSite.wsAvailable('mod_wiki_new_page') &&
                $mmSite.wsAvailable('mod_wiki_edit_page');
    };

    /**
     * Get a wiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getWiki
     * @param {Number} courseId Course ID.
     * @param {Number} id   Wiki ID or cmid to look for.
     * @param {String} paramName Name of the param id to look for.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the wiki is retrieved.
     */
    self.getWiki = function(courseId, id, paramName, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getWikiDataCacheKey(courseId)
                };

            return site.read('mod_wiki_get_wikis_by_courses', params, preSets).then(function(response) {
                if (response.wikis) {
                    var currentWiki;
                    angular.forEach(response.wikis, function(wiki) {
                        if (wiki[paramName] == id) {
                            currentWiki = wiki;
                        }
                    });
                    if (currentWiki) {
                        return currentWiki;
                    }
                }
                return $q.reject();
            });
        });
    };

    /**
     * Gets a list of files to download for a Wiki, using a format similar to module.contents from get_course_contents.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getWikiFileList
     * @param  {Object} wiki Wiki.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Object[]}     File list.
     */
    self.getWikiFileList = function(wiki, siteId) {
        var files = [];
        siteId = siteId || $mmSite.getId();

        return self.getSubwikis(wiki.id, siteId).then(function(subwikis) {
            var promises = [];
            angular.forEach(subwikis, function(subwiki) {
                promises.push(self.getSubwikiFiles(subwiki.wikiid, subwiki.groupid, subwiki.userid, siteId).then(function(subwikiFiles) {
                    files = files.concat(subwikiFiles);
                }));
            });

            return $q.all(promises).then(function() {
                return files;
            });
        });
    };

    /**
     * Gets a list of all pages for a Wiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getWikiPageList
     * @param  {Object} wiki Wiki.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}     Page list.
     */
    self.getWikiPageList = function(wiki, siteId) {
        var pages = [];
        siteId = siteId || $mmSite.getId();

        return self.getSubwikis(wiki.id, siteId).then(function(subwikis) {
            var promises = [];
            angular.forEach(subwikis, function(subwiki) {
                promises.push(self.getSubwikiPages(subwiki.wikiid, subwiki.groupid, subwiki.userid, null, null, null, siteId).then(
                    function(subwikiPages) {
                        pages = pages.concat(subwikiPages);
                    }
                ));
            });

            return $q.all(promises).then(function() {
                return pages;
            });
        });
    };

    /**
     * Get Subwiki List for a Wiki from the cache
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getSubwikiList
     * @param  {Number} wikiId wiki Id
     * @return {Array}        Of subwiki lists
     */
    self.getSubwikiList = function(wikiId) {
        return subwikiListsCache[wikiId];
    };

    /**
     * Save Subwiki List for a Wiki to the cache
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#setSubwikiList
     * @param  {Number} wikiId      wiki Id
     * @param  {Number} subwikis    List of subwikis
     * @param  {Number} count       Number of subwikis in the subwikis list
     * @param  {Number} subwikiId   subwiki Id currently selected
     * @param  {Number} userId      user Id currently selected
     * @param  {Number} groupId     group Id currently selected
     */
    self.setSubwikiList = function(wikiId, subwikis, count, subwikiId, userId, groupId) {
        var subwikiLists =  {
            count: count,
            subwikiSelected: subwikiId,
            userSelected: userId,
            groupSelected: groupId,
            subwikis: subwikis
        };
        subwikiListsCache[wikiId] = subwikiLists;
    };

    /**
     * Clear Subwiki List for a Wiki from the cache
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#clearSubwikiList
     * @param  {Number} [wikiId] wiki Id, if not provided all will be cleared
     */
    self.clearSubwikiList = function(wikiId) {
        if(typeof wikiId == 'undefined') {
            subwikiListsCache = {};
        } else {
            delete subwikiListsCache[wikiId];
        }

    };

    /**
     * Get a wiki Subwikis.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getSubwikis
     * @param {Number} wikiId Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with wiki subwikis.
     */
    self.getSubwikis = function(wikiId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    wikiid: wikiId
                },
                preSets = {
                    cacheKey: getWikiSubwikisCacheKey(wikiId)
                };

            return site.read('mod_wiki_get_subwikis', params, preSets).then(function(response) {
                if (response.subwikis) {
                    return response.subwikis;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get the list of Pages of a SubWiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getSubwikiPages
     * @param {Number} wikiId Wiki ID.
     * @param {Number} [groupId] to get pages from
     * @param {Number} [userId] to get pages from
     * @param {String} [sortBy] the attribute to sort the returned list. Default: title
     * @param {String} [sortDirection] ASC | DESC direction to sort the returned list. Default: ASC
     * @param {Boolean} [includeContent] if the pages have to include its content. Default: false.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with wiki subwiki pages.
     */
    self.getSubwikiPages = function(wikiId, groupId, userId, sortBy, sortDirection, includeContent, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            groupId = groupId || -1;
            userId = userId || 0;
            sortBy = sortBy || 'title';
            sortDirection = sortDirection || 'ASC';
            includeContent = includeContent || 0;
            var params = {
                    wikiid: wikiId,
                    groupid: groupId,
                    userid: userId,
                    options: {
                        sortby: sortBy,
                        sortdirection: sortDirection,
                        includecontent: includeContent
                    }

                },
                preSets = {
                    cacheKey: getWikiSubwikiPagesCacheKey(wikiId, groupId, userId)
                };

            return site.read('mod_wiki_get_subwiki_pages', params, preSets).then(function(response) {
                if (response.pages) {
                    return response.pages;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Gets the list of files from a specific subwiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getSubwikiFiles
     * @param {Number} wikiId Wiki ID.
     * @param {Number} [groupId] to get files from
     * @param {Number} [userId] to get files from
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with wiki subwiki files.
     */
    self.getSubwikiFiles = function(wikiId, groupId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            groupId = groupId || -1;
            userId = userId || 0;
            var params = {
                    wikiid: wikiId,
                    groupid: groupId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getWikiSubwikiFilesCacheKey(wikiId, groupId, userId)
                };

            return site.read('mod_wiki_get_subwiki_files', params, preSets).then(function(response) {
                if (response.files) {
                    return response.files;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get a wiki page contents.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getPageContents
     * @param {Number} pageId Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with wiki page contents.
     */
    self.getPageContents = function(pageId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    pageid: pageId
                },
                preSets = {
                    cacheKey: getWikiPageCacheKey(pageId)
                };

            return site.read('mod_wiki_get_page_contents', params, preSets).then(function(response) {
                if (response.page) {
                    return response.page;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get a wiki page contents for editing. It does not cache calls.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getPageForEditing
     * @param {Number}  pageId      Page ID.
     * @param {String}  [section]   section to get.
     * @param {Boolean} [lockonly]  Just renew lock and not return content.
     * @return {Promise}            Promise resolved with wiki page contents.
     */
    self.getPageForEditing = function(pageId, section, lockonly) {
        var params = {
                pageid: pageId
            };

        if (section) {
            params.section = section;
        }

        if (lockonly) {
            // This parameter requires Moodle 3.2. It saves network usage.
            if ($mmSite.isVersionGreaterEqualThan('3.2')) {
                params.lockonly = 1;
            }
        }

        return $mmSite.write('mod_wiki_get_page_for_editing', params).then(function(response) {
            if (response.pagesection) {
                return response.pagesection;
            }
            return $q.reject();
        });
    };

    /**
     * Check if a page title is already used.
     *
     * @param  {Number} wikiId    Wiki ID.
     * @param  {Number} subwikiId Subwiki ID.
     * @param  {String} title     Page title.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with true if used, resolved with false if not used, rejected if error.
     */
    self.isTitleUsed = function(wikiId, subwikiId, title, siteId) {
        // First get the subwiki.
        return self.getSubwikis(wikiId, siteId).then(function(subwikis) {
            // Search the subwiki.
            for (var i = 0, len = subwikis.length; i < len; i++) {
                var subwiki = subwikis[i];
                if (subwiki.id == subwikiId) {
                    return subwiki;
                }
            }
            return $q.reject();
        }).then(function(subwiki) {
            return self.getSubwikiPages(wikiId, subwiki.groupid, subwiki.userid, null, null, false, siteId);
        }).then(function(pages) {
            // Check if there's any page with the same title.
            for (var i = 0, len = pages.length; i < len; i++) {
                var page = pages[i];
                if (page.title == title) {
                    return true;
                }
            }
            return false;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Create a new page on a subwiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#newPage
     * @param  {String} title       Title to create the page.
     * @param  {String} content     Content to save on the page.
     * @param  {Number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param  {Number} [wikiId]    Wiki ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [userId]    User ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [groupId]   Group ID. Optional, will be used create subwiki if not informed.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with page ID if page was created in server, false if stored in device.
     */
    self.newPage = function(title, content, subwikiId, wikiId, userId, groupId, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!$mmApp.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // Discard stored content for this page. If it exists it means the user is editing it.
        return $mmaModWikiOffline.deleteNewPage(title, subwikiId, wikiId, userId, groupId, siteId).then(function() {
            // Try to create it in online.
            return self.newPageOnline(title, content, subwikiId, wikiId, userId, groupId, siteId).then(function(pageId) {
                return pageId;
            }).catch(function(error) {
                if (error && error.wserror) {
                    // The WebService has thrown an error, this means that responses cannot be deleted.
                    return $q.reject(error.error);
                } else {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                }
            });
        });

        // Convenience function to store a new page to be synchronized later.
        function storeOffline() {
            var promise;

            if (wikiId) {
                // We have wiki ID, check if there's already an online page with this title and subwiki.
                promise = self.isTitleUsed(wikiId, subwikiId, title, siteId).catch(function() {
                    // Error, assume not used.
                    return false;
                }).then(function(used) {
                    if (used) {
                        return $mmLang.translateAndReject('mma.mod_wiki.pageexists');
                    }
                });
            } else {
                promise = $q.when();
            }

            return promise.then(function() {
                return $mmaModWikiOffline.saveNewPage(title, content, subwikiId, wikiId, userId, groupId, siteId).then(function() {
                    return false;
                });
            });
        }
    };

    /**
     * Create a new page on a subwiki. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#newPageOnline
     * @param  {String} title       Title to create the page.
     * @param  {String} content     Content to save on the page.
     * @param  {Number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param  {Number} [wikiId]    Wiki ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [userId]    User ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [groupId]   Group ID. Optional, will be used create subwiki if not informed.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if created, rejected otherwise. Reject param is an object with:
     *                                   - error: The error message.
     *                                   - wserror: True if it's an error returned by the WebService, false otherwise.
     */
    self.newPageOnline = function(title, content, subwikiId, wikiId, userId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    title: title,
                    content: content,
                    contentformat: 'html'
                };

            subwikiId = parseInt(subwikiId, 10) || 0;
            wikiId = parseInt(wikiId, 10) > 0 ? parseInt(wikiId, 10) : 0;
            if (subwikiId && subwikiId > 0) {
                params.subwikiid = subwikiId;
            } else if (wikiId) {
                params.wikiid = wikiId;
                params.userid = parseInt(userId, 10) > 0 ? parseInt(userId, 10) : 0;
                params.groupid = parseInt(groupId, 10) > 0 ? parseInt(groupId, 10) : 0;
            }

            return site.write('mod_wiki_new_page', params).catch(function(error) {
                return $q.reject({
                    error: error,
                    wserror: $mmUtil.isWebServiceError(error)
                });
            }).then(function(response) {
                if (response.pageid) {
                    return response.pageid;
                }
                return $q.reject({
                    wserror: true
                });
            });
        });
    };

    /**
     * Save wiki contents on a page or section. It does not cache calls.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#editPage
     * @param {Number} pageId Page ID.
     * @param {String} content content to be saved.
     * @param {String} [section] section to get.
     * @return {Promise}        Promise resolved with wiki page contents.
     */
    self.editPage = function(pageId, content, section) {
        var params = {
                pageid: pageId,
                content: content
            };

        if (section) {
            params.section = section;
        }

        return $mmSite.write('mod_wiki_edit_page', params).then(function(response) {
            if (response.pageid) {
                return response.pageid;
            }
            return $q.reject();
        });
    };

    /**
     * Invalidates wiki data.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateWikiData
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateWikiData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWikiDataCacheKey(courseId));
        });
    };

    /**
     * Invalidates Subwikis.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateSubwikis
     * @param {Number} wikiId Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubwikis = function(wikiId, siteId) {
        self.clearSubwikiList(wikiId);
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWikiSubwikisCacheKey(wikiId));
        });
    };

    /**
     * Invalidates Subwiki Pages.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateSubwikiPages
     * @param {Number} wikiId Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubwikiPages = function(wikiId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getWikiSubwikiPagesCacheKeyPrefix(wikiId));
        });
    };

    /**
     * Invalidates Subwiki Files.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateSubwikiFiles
     * @param {Number} wikiId Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubwikiFiles = function(wikiId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getWikiSubwikiFilesCacheKeyPrefix(wikiId));
        });
    };

    /**
     * Invalidates Pages Contents.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidatePage
     * @param {Number} pageId Wiki Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidatePage = function(pageId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWikiPageCacheKey(pageId));
        });
    };

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use $mmaModWiki#invalidateFiles.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return self.getWiki(courseId, moduleId, 'coursemodule', siteId).then(function(wiki) {
            var ps = [];
            // Do not invalidate wiki data before getting wiki info, we need it!
            ps.push(self.invalidateWikiData(courseId, siteId));
            ps.push(self.invalidateSubwikis(wiki.id, siteId));
            ps.push(self.invalidateSubwikiPages(wiki.id, siteId));
            ps.push(self.invalidateSubwikiFiles(wiki.id, siteId));

            return $q.all(ps);
        });
    };

    /**
     * Invalidate the prefetched files.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateFiles
     * @param {Number} moduleId  The module ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the files are invalidated.
     */
    self.invalidateFiles = function(moduleId, siteId) {
        return $mmFilepool.invalidateFilesByComponent(siteId, mmaModWikiComponent, moduleId);
    };

    /**
     * Report the wiki as being viewed.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#logView
     * @param {String} id Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id, siteId) {
        if (id) {
            return $mmSitesManager.getSite(siteId).then(function(site) {
                var params = {
                    wikiid: id
                };
                return site.write('mod_wiki_view_wiki', params);
            });
        }
        return $q.reject();
    };

    /**
     * Report a wiki page as being viewed.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#logPageView
     * @param {String} id Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logPageView = function(id, siteId) {
        if (id) {
            return $mmSitesManager.getSite(siteId).then(function(site) {
                var params = {
                    pageid: id
                };
                return site.write('mod_wiki_view_page', params);
            });
        }
        return $q.reject();
    };

    /**
     * Sort an array of wiki pages by title.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#sortPagesByTitle
     * @param  {Object[]} pages Pages to sort.
     * @param  {Boolean} [desc] True to sort in descendent order, false to sort in ascendent order. Defaults to false.
     * @return {Promise}        Promise resolved with the pages.
     */
    self.sortPagesByTitle = function(pages, desc) {
        return pages.sort(function (a, b) {
            var result = a.title >= b.title ? 1 : -1;
            if (!!desc) {
                result = -result;
            }
            return result;
        });
    };

    /**
     * Check if a wiki has a certain subwiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#wikiHasSubwiki
     * @param  {Number} wikiId    Wiki ID.
     * @param  {Number} subwikiId Subwiki ID to search.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with true if it has subwiki, resolved with false otherwise.
     */
    self.wikiHasSubwiki = function(wikiId, subwikiId, siteId) {
        // Get the subwikis to check if any of them matches the current one.
        return self.getSubwikis(wikiId, siteId).then(function(subwikis) {
            for (var i = 0; i < subwikis.length; i++) {
                if (subwikis[i].id == subwikiId) {
                    return true;
                }
            }
            return false;
        }).catch(function() {
            // Not found, return false.
            return false;
        });
    };

    return self;
});
