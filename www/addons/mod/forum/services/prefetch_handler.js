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
            $mmGroups, md5, $mmPrefetchFactory) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModForumComponent);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$|^discussions$/;

    /**
     * Download the module.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Forums cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
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
            files = self.getIntroFilesFromInstance(module, forum);

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
            }
            if (post.message) {
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
            return getTimemodifiedFromForum(module, forum);
        });
    };

    /**
     * Get timemodified of a forum.
     *
     * @param {Object} module       Module.
     * @param {Object} forum        Forum.
     * @return {Promise}            Promise resolved with timemodified.
     */
    function getTimemodifiedFromForum(module, forum) {
        var timemodified = forum.timemodified || 0,
            introFiles = self.getIntroFilesFromInstance(module, forum);

        // Check intro files timemodified.
        timemodified = Math.max(timemodified, $mmFilepool.getTimemodifiedFromFileList(introFiles));

        // Get the time modified of the most recent discussion and check if it's higher than timemodified.
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

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModForum.invalidateContent(moduleId, courseId);
    };

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
        return self.prefetchPackage(module, courseId, single, prefetchForum);
    };

    /**
     * Prefetch a forum.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchForum(module, courseId, single, siteId) {
        var revision,
            timemod,
            forum;

        // Get the forum data.
        return $mmaModForum.getForum(courseId, module.id).then(function(f) {
            forum = f;

            // Get revision and timemodified.
            revision = getRevisionFromForum(forum);
            return getTimemodifiedFromForum(module, forum);
        }).then(function(time) {
            timemod = time;

            // Prefetch the posts.
            return getPostsForPrefetch(forum.id);
        }).then(function(posts) {
            // Now prefetch the files.
            var promises = [],
                files = self.getIntroFilesFromInstance(module, forum),
                userIds = [],
                canCreateDiscussions = $mmaModForum.isCreateDiscussionEnabled() && forum.cancreatediscussions;

            // Add attachments and embedded files.
            files = files.concat(getPostsFiles(posts));

            // Get the users.
            angular.forEach(posts, function(post) {
                // Now treat the user.
                if (post.userid && userIds.indexOf(post.userid) == -1) {
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
                promises.push($mmFilepool.addToQueueByUrl(siteId, file.fileurl, self.component, module.id, file.timemodified));
            });

            // Prefetch groups data.
            promises.push(prefetchGroupsInfo(forum, courseId, canCreateDiscussions));

            return $q.all(promises);
        }).then(function() {
            // Return revision and timemodified.
            return {
                revision: revision,
                timemod: timemod
            };
        });
    }

    /**
     * Prefetch groups info for a forum.
     *
     * @param  {Object} module                The module object returned by WS.
     * @param  {Number} courseId              Course ID the module belongs to.
     * @param  {Boolean} canCreateDiscussions Whether the user can create discussions in the forum.
     * @return {Promise}                      Promise resolved when group data has been prefetched.
     */
    function prefetchGroupsInfo(forum, courseId, canCreateDiscussions) {
        // Check group mode.
        return $mmGroups.getActivityGroupMode(forum.cmid).then(function(mode) {
            if (mode !== $mmGroups.SEPARATEGROUPS && mode !== $mmGroups.VISIBLEGROUPS) {
                // Activity doesn't use groups, nothing else to prefetch.
                return;
            }

            // Activity uses groups, prefetch allowed groups.
            return $mmGroups.getActivityAllowedGroups(forum.cmid).then(function(groups) {
                if (mode === $mmGroups.SEPARATEGROUPS) {
                    // Groups are already filtered by WS, nothing else to prefetch.
                    return;
                }

                if (canCreateDiscussions) {
                    // Prefetch data to check the visible groups when creating discussions.
                    if ($mmaModForum.isCanAddDiscussionAvailable()) {
                        // Can add discussion WS available, prefetch the calls.
                        return $mmaModForum.canAddDiscussionToAll(forum.id).catch(function() {
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
                        });
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
        });
    }

    return self;
});
