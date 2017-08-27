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
 * Wiki synchronization service.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc service
 * @name $mmaModWikiSync
 */
.factory('$mmaModWikiSync', function($q, $log, $mmApp, $mmSitesManager, $mmaModWikiOffline, $mmSite, $mmEvents, $mmSync, $mmLang,
        mmaModWikiComponent, $mmaModWiki, $translate, mmaModWikiSubwikiAutomSyncedEvent, mmaModWikiSyncTime, $mmGroups,
        $mmCourse, $mmSyncBlock) {

    $log = $log.getInstance('$mmaModWikiSync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaModWikiComponent, mmaModWikiSyncTime);

    /**
     * Try to synchronize all wikis from current site that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiSync#syncAllWikis
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllWikis = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all wikis because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync wikis in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync wikis in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Sync new pages.
                sitePromises.push($mmaModWikiOffline.getAllNewPages(siteId).then(function(pages) {
                    var promises = [],
                        subwikis = {};

                    // Get subwikis to sync.
                    angular.forEach(pages, function(page) {
                        var index = self.subwikiBlockId(page.subwikiid, page.wikiid, page.userid, page.groupid);
                        subwikis[index] = page;
                    });

                    // Sync all subwikis.
                    angular.forEach(subwikis, function(subwiki) {
                        promises.push(self.syncSubwikiIfNeeded(subwiki.subwikiid, subwiki.wikiid, subwiki.userid, subwiki.groupid,
                                siteId).then(function(result) {
                            if (result && result.updated) {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaModWikiSubwikiAutomSyncedEvent, {
                                    siteid: siteId,
                                    subwikiid: subwiki.subwikiid,
                                    wikiid: subwiki.wikiid,
                                    userid: subwiki.userid,
                                    groupid: subwiki.groupid,
                                    created: result.created,
                                    discarded: result.discarded,
                                    warnings: result.warnings
                                });
                            }
                        }));
                    });

                    return $q.all(promises);
                }));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Sync a subwiki only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiSync#syncSubwikiIfNeeded
     * @param  {Number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param  {Number} [wikiId]    Wiki ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [userId]    User ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [groupId]   Group ID. Optional, will be used create subwiki if not informed.
     * @param {String}  [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the subwiki is synced or if it doesn't need to be synced.
     */
    self.syncSubwikiIfNeeded = function(subwikiId, wikiId, userId, groupId, siteId) {
        var index = self.subwikiBlockId(subwikiId, wikiId, userId, groupId);
        return self.isSyncNeeded(index, siteId).then(function(needed) {
            if (needed) {
                return self.syncSubwiki(subwikiId, wikiId, userId, groupId, siteId);
            }
        });
    };

    /**
     * Synchronize a subwiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiSync#syncSubwiki
     * @param  {Number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param  {Number} [wikiId]    Wiki ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [userId]    User ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [groupId]   Group ID. Optional, will be used create subwiki if not informed.
     * @param {String}  [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncSubwiki = function(subwikiId, wikiId, userId, groupId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            result = {
                warnings: [],
                updated: false,
                created: [],
                discarded: []
            };

        var index = self.subwikiBlockId(subwikiId, wikiId, userId, groupId);
        if (self.isSyncing(index, siteId)) {
            // There's already a sync ongoing for this subwiki, return the promise.
            return self.getOngoingSync(index, siteId);
        }

        // Verify that subwiki isn't blocked.
        if ($mmSyncBlock.isBlocked(mmaModWikiComponent, index, siteId)) {
            $log.debug('Cannot sync subwiki ' + index + ' because it is blocked.');
            var modulename = $mmCourse.translateModuleName('wiki');
            return $mmLang.translateAndReject('mm.core.errorsyncblocked', {$a: modulename});
        }

        $log.debug('Try to sync subwiki ' + index);

        // Get offline responses to be sent.
        syncPromise = $mmaModWikiOffline.getSubwikiNewPages(subwikiId, wikiId, userId, groupId, siteId).catch(function() {
            // No offline data found, return empty array.
            return [];
        }).then(function(pages) {
            if (!pages || !pages.length) {
                // Nothing to sync.
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $mmLang.translateAndReject('mm.core.networkerrormsg');
            }

            var promises = [];

            // Send the pages.
            angular.forEach(pages, function(page) {
                promises.push($mmaModWiki.newPageOnline(page.title, page.cachedcontent, subwikiId, wikiId, userId, groupId, siteId)
                        .then(function(pageId) {
                    result.updated = true;

                    // Add page to created pages array.
                    result.created.push({
                        pageid: pageId,
                        title: page.title
                    });

                    // Delete the local page.
                    return $mmaModWikiOffline.deleteNewPage(page.title, subwikiId, wikiId, userId, groupId, siteId);
                }).catch(function(error) {
                    if (error && error.wserror) {
                        // The WebService has thrown an error, this means that the page cannot be submitted. Delete it.
                        return $mmaModWikiOffline.deleteNewPage(page.title, subwikiId, wikiId, userId, groupId, siteId)
                                .then(function() {
                            result.updated = true;

                            // Page deleted, add the page to discarded pages and add a warning.
                            var warning = $translate.instant('mm.core.warningofflinedatadeleted', {
                                component: $translate.instant('mma.mod_wiki.wikipage'),
                                name: page.title,
                                error: error.error
                            });

                            result.discarded.push({
                                title: page.title,
                                warning: warning
                            });

                            result.warnings.push(warning);
                        });
                    } else {
                        // Couldn't connect to server, reject.
                        return $q.reject(error && error.error);
                    }
                }));
            });

            return $q.all(promises);
        }).then(function() {
            // Sync finished, set sync time.
            return self.setSyncTime(index, siteId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            // All done, return the warnings.
            return result;
        });

        return self.addOngoingSync(index, syncPromise, siteId);
    };

    /**
     * Tries to synchronize a wiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiSync#syncWiki
     * @param  {Number} wikiId     Wiki ID.
     * @param  {Number} [courseId] Course ID.
     * @param  {Number} [cmId]     Wiki course module ID.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncWiki = function(wikiId, courseId, cmId, siteId) {
        siteId = siteId || $mmSite.getId();

        // Sync is done at subwiki level, get all the subwikis.
        return $mmaModWiki.getSubwikis(wikiId).then(function(subwikis) {
            var promises = [],
                result = {
                    warnings: [],
                    updated: false,
                    subwikis: {},
                    siteid: siteId
                };

            angular.forEach(subwikis, function(subwiki) {
                promises.push(self.syncSubwiki(subwiki.id, subwiki.wikiid, subwiki.userid, subwiki.groupid, siteId)
                        .then(function(data) {
                    if (data && data.updated) {
                        result.warnings = result.warnings.concat(data.warnings);
                        result.updated = true;
                        result.subwikis[subwiki.id] = {
                            created: data.created,
                            discarded: data.discarded
                        };
                    }
                }));
            });

            return $q.all(promises).then(function() {
                promises = [];

                if (result.updated) {
                    // Something has changed, invalidate data.
                    if (wikiId) {
                        promises.push($mmaModWiki.invalidateSubwikis(wikiId));
                        promises.push($mmaModWiki.invalidateSubwikiPages(wikiId));
                        promises.push($mmaModWiki.invalidateSubwikiFiles(wikiId));
                    }
                    if (courseId) {
                        promises.push($mmaModWiki.invalidateWikiData(courseId));
                    }
                    if (cmId) {
                        promises.push($mmGroups.invalidateActivityAllowedGroups(cmId));
                        promises.push($mmGroups.invalidateActivityGroupMode(cmId));
                    }
                }

                return $q.all(promises).catch(function() {
                    // Ignore errors.
                }).then(function() {
                    return result;
                });
            });
        });
    };

    self.subwikiBlockId = function(subwikiId, wikiId, userId, groupId) {
        subwikiId = parseInt(subwikiId, 10) || 0;
        if (subwikiId && subwikiId > 0) {
            return subwikiId;
        }

        wikiId = (wikiId = parseInt(wikiId, 10)) > 0 ? wikiId : 0;
        if(wikiId) {
            userId = parseInt(userId, 10) > 0 ? parseInt(userId, 10) : 0;
            groupId = parseInt(groupId, 10) > 0 ? parseInt(groupId, 10) : 0;
            return wikiId + ':' + userId + ':' + groupId;
        }
        return false;
    };

    return self;
});
