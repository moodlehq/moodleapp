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

angular.module('mm.addons.mod_forum')

/**
 * Mod forum prefetch handler.
 *
 * @module mm.addons.mod_forum
 * @ngdoc service
 * @name $mmaModForumPrefetchHandler
 */
.factory('$mmaModForumPrefetchHandler', function($mmaModForum, mmaModForumComponent, $mmFilepool, $mmSite, $q, $mmUtil, $mmUser,
            $mmGroups, md5, mmCoreDownloading, mmCoreDownloaded) {

    var self = {},
        downloadPromises = {}; // Store download promises to prevent duplicate requests.

    self.component = mmaModForumComponent;

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#getDownloadSize
     * @param {Object} module   Module to get the size.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        With the file size and a boolean to indicate if it is the total size or only partial.
     */
    self.getDownloadSize = function(module, courseId) {
        return self.getFiles(module, courseId).then(function(files) {
            return $mmUtil.sumFileSizes(files);
        }).catch(function() {
            return {size: -1, total: false};
        });
    };

    /**
     * Get the downloaded size of a module.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#getDownloadedSize
     * @param {Object} module   Module to get the downloaded size.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the size.
     */
    self.getDownloadedSize = function(module, courseId) {
        return $mmFilepool.getFilesSizeByComponent($mmSite.getId(), self.component, module.id);
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the list of files.
     */
    self.getFiles = function(module, courseId) {
        var files;
        return $mmaModForum.getForum(courseId, module.id).then(function(forum) {
            files = getIntroFiles(forum);

            // Get posts.
            return getPostsForPrefetch(forum.id);
        }).then(function(posts) {
            // Add posts attachments and embedded files.
            return files.concat(getPostsFiles(posts));
        }).catch(function() {
            // Forum not found, return empty list.
            return [];
        });
    };

    /**
     * Get a forum intro files.
     *
     * @param  {Object[]} posts Forum posts.
     * @return {Object[]}       Attachments.
     */
    function getIntroFiles(forum) {
        if (typeof forum.introfiles != 'undefined') {
            return forum.introfiles;
        } else if (forum.intro) {
            return $mmUtil.extractDownloadableFilesFromHtmlAsFakeFileObjects(forum.intro);
        }
        return [];
    }

    /**
     * Given a list of forum posts, return a list with all the files (attachments and embedded files).
     *
     * @param  {Object[]} posts Forum posts.
     * @return {Object[]}       Files.
     */
    function getPostsFiles(posts) {
        var files = [];

        angular.forEach(posts, function(post) {
            if (post.attachments && post.attachments.length) {
                files = files.concat(post.attachments);
                files = files.concat($mmUtil.extractDownloadableFilesFromHtmlAsFakeFileObjects(post.message));
            }
        });

        return files;
    }

    /**
     * Get the posts to be prefetched.
     *
     * @param  {Number} forumId Forum ID
     * @return {Promise}        Promise resolved with array of posts.
     */
    function getPostsForPrefetch(forumId) {
        // Get discussions in first 2 pages.
        return $mmaModForum.getDiscussionsInPages(forumId, false, 2).then(function(response) {
            if (response.error) {
                return $q.reject();
            }

            var promises = [],
                posts = [];

            angular.forEach(response.discussions, function(discussion) {
                promises.push($mmaModForum.getDiscussionPosts(discussion.discussion).then(function(ps) {
                    posts = posts.concat(ps);
                }));
            });

            return $q.all(promises).then(function() {
                return posts;
            });
        });
    }

    /**
     * Get revision of a forum (num discussions).
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with revision.
     */
    self.getRevision = function(module, courseId) {
        return $mmaModForum.getForum(courseId, module.id).then(function(forum) {
            return getRevisionFromForum(forum);
        });
    };

    /**
     * Get revision of a forum.
     *
     * @param {Object} forum Forum.
     * @return {String}      Revision.
     */
    function getRevisionFromForum(forum) {
        var revision = '' + forum.numdiscussions;
        if (typeof forum.introfiles == 'undefined' && forum.intro) {
            // The forum doesn't return introfiles. We'll add a hash of file URLs to detect changes in files.
            // If the forum has introfiles there's no need to do this because they have timemodified.
            var urls = $mmUtil.extractDownloadableFilesFromHtml(forum.intro);
            urls = urls.sort(function (a, b) {
                return a > b;
            });
            return revision + '#' + md5.createHash(JSON.stringify(urls));
        }
        return revision;
    }

    /**
     * Get timemodified of a forum.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#getTimemodified
     * @param {Object} module   Module to get the timemodified.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        return $mmaModForum.getForum(courseId, module.id).then(function(forum) {
            return getTimemodifiedFromForum(module.id, forum, false);
        });
    };

    /**
     * Get timemodified of a forum.
     *
     * @param {Number} moduleId     Module ID.
     * @param {Object} forum        Forum.
     * @param {Boolean} getRealTime True to get the real time modified, false to get an approximation (try to minimize WS calls).
     * @return {Promise}            Promise resolved with timemodified.
     */
    function getTimemodifiedFromForum(moduleId, forum, getRealTime) {
        var timemodified = forum.timemodified || 0,
            siteId = $mmSite.getId();

        // Check intro files timemodified.
        timemodified = Math.max(timemodified, $mmFilepool.getTimemodifiedFromFileList(getIntroFiles(forum)));

        if (getRealTime) {
            // Get timemodified from discussions to get the real time.
            return getTimemodifiedFromDiscussions();
        }

        // To prevent calling getDiscussions if a new discussion is added we'll check forum.numdiscussions first.
        return $mmFilepool.getPackageRevision(siteId, mmaModForumComponent, moduleId).catch(function() {
            return '';
        }).then(function(revision) {
            // Get only the new discussions number stored.
            revision = revision.split('#')[0];

            if (revision != forum.numdiscussions) {
                // Number of discussions has changed, return current time to show refresh button.
                return $mmUtil.timestamp();
            }

            // Number of discussions hasn't changed.
            return getTimemodifiedFromDiscussions();
        });

        // Get the time modified of the most recent discussion and check if it's higher than timemodified.
        function getTimemodifiedFromDiscussions() {
            return $mmaModForum.getDiscussions(forum.id, 0).then(function(response) {
                if (response.discussions && response.discussions[0]) {
                    var discussionTime =  parseInt(response.discussions[0].timemodified, 10);
                    if (!isNaN(discussionTime)) {
                        timemodified = Math.max(timemodified, discussionTime);
                    }
                }
                return timemodified;
            });
        }
    }

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        // Get the forum since we need its ID.
        return $mmaModForum.getForum(courseId, module.id).then(function(forum) {
            var promises = [];
            promises.push($mmaModForum.invalidateForumData(courseId));
            promises.push($mmaModForum.invalidateDiscussionsList(forum.id));
            return $q.all(promises);
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModForum.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        var siteId = $mmSite.getId(),
            prefetchPromise,
            deleted = false,
            component = mmaModForumComponent,
            revision,
            timemod,
            forum;

        if (downloadPromises[siteId] && downloadPromises[siteId][module.id]) {
            // There's already a download ongoing for this package, return the promise.
            return downloadPromises[siteId][module.id];
        } else if (!downloadPromises[siteId]) {
            downloadPromises[siteId] = {};
        }

        // Mark package as downloading.
        prefetchPromise = $mmFilepool.storePackageStatus(siteId, component, module.id, mmCoreDownloading).then(function() {

            // Get the forum data.
            return $mmaModForum.getForum(courseId, module.id);
        }).then(function(f) {
            forum = f;

            // Get revision and timemodified.
            revision = getRevisionFromForum(forum);
            return getTimemodifiedFromForum(module.id, forum, true);
        }).then(function(time) {
            timemod = time;

            // Prefetch the posts.
            return getPostsForPrefetch(forum.id);
        }).then(function(posts) {
            // Now prefetch the files.
            var promises = [],
                files = getIntroFiles(forum),
                userIds = [],
                canCreateDiscussions = $mmaModForum.isCreateDiscussionEnabled() && forum.cancreatediscussions;

            // Add attachments and embedded files.
            files = files.concat(getPostsFiles(posts));

            // Get the users.
            angular.forEach(posts, function(post) {
                // Now treat the user.
                if (userIds.indexOf(post.userid) == -1) {
                    // User not treated yet. Mark it as treated and prefetch the profile and the image.
                    userIds.push(post.userid);
                    promises.push($mmUser.getProfile(post.userid, courseId));
                    if (post.userpictureurl) {
                        promises.push($mmFilepool.addToQueueByUrl(siteId, post.userpictureurl).catch(function() {
                            // Ignore failures.
                        }));
                    }
                }
            });

            // Prefetch files.
            angular.forEach(files, function(file) {
                promises.push($mmFilepool.addToQueueByUrl(siteId, file.fileurl, component, module.id, file.timemodified));
            });

            // Prefetch groups data.
            promises.push($mmGroups.getActivityGroupMode(forum.cmid).then(function(mode) {
                if (mode !== $mmGroups.SEPARATEGROUPS && mode !== $mmGroups.VISIBLEGROUPS) {
                    // Activity doesn't use groups, nothing else to prefetch.
                    return;
                }

                return $mmGroups.getActivityAllowedGroups(forum.cmid).then(function(groups) {
                    if (mode === $mmGroups.SEPARATEGROUPS) {
                        // Groups are already filtered by WS, nothing else to prefetch.
                        return;
                    }

                    if (canCreateDiscussions) {
                        // Prefetch data to check the visible groups when creating discussions.
                        if ($mmaModForum.isCanAddDiscussionAvailable()) {
                            // Can add discussion WS available, prefetch the calls.
                            promises.push($mmaModForum.canAddDiscussionToAll(forum.id).catch(function() {
                                // The call failed, let's assume he can't.
                                return false;
                            }).then(function(canAdd) {
                                if (canAdd) {
                                    // User can post to all groups, nothing else to prefetch.
                                    return;
                                }

                                // The user can't post to all groups, let's check which groups he can post to.
                                var groupPromises = [];
                                angular.forEach(groups, function(group) {
                                    groupPromises.push($mmaModForum.canAddDiscussion(forum.id, group.id).catch(function() {
                                        // Ignore errors.
                                    }));
                                });
                                return $q.all(groupPromises);
                            }));
                        } else {
                            // Prefetch the groups the user belongs to.
                            return $mmGroups.getUserGroupsInCourse(courseId, true);
                        }
                    }
                });
            }, function(error) {
                // Ignore errors if cannot create discussions.
                if (canCreateDiscussions) {
                    return $q.reject(error);
                }
            }));

            return $q.all(promises);
        }).then(function() {
            // Prefetch finished, mark as downloaded.
            return $mmFilepool.storePackageStatus(siteId, component, module.id, mmCoreDownloaded, revision, timemod);
        }).catch(function(error) {
            // Error prefetching, go back to previous status and reject the promise.
            return $mmFilepool.setPackagePreviousStatus(siteId, component, module.id).then(function() {
                return $q.reject(error);
            });
        }).finally(function() {
            deleted = true;
            delete downloadPromises[siteId][module.id];
        });

        if (!deleted) {
            downloadPromises[siteId][module.id] = prefetchPromise;
        }
        return prefetchPromise;
    };

    /**
     * Remove module downloaded files.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#removeFiles
     * @param {Object} module   Module to remove the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved when done.
     */
    self.removeFiles = function(module, courseId) {
        return $mmFilepool.removeFilesByComponent($mmSite.getId(), self.component, module.id);
    };

    return self;
});
