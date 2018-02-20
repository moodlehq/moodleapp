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

angular.module('mm.addons.mod_choice')

/**
 * Mod choice prefetch handler.
 *
 * @module mm.addons.mod_choice
 * @ngdoc service
 * @name $mmaModChoicePrefetchHandler
 */
.factory('$mmaModChoicePrefetchHandler', function($mmaModChoice, mmaModChoiceComponent, $mmFilepool, $q, $mmUtil,
            mmCoreDownloaded, mmCoreOutdated, $mmUser, $mmPrefetchFactory) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModChoiceComponent);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    self.updatesNames = /^configuration$|^.*files$|^answers$/;

    /**
     * Determine the status of a module based on the current status detected.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#determineStatus
     * @param {String} status     Current status.
     * @param  {Boolean} canCheck True if updates can be checked using core_course_check_updates.
     * @return {String}           Status to show.
     */
    self.determineStatus = function(status, canCheck) {
        if (!canCheck && status === mmCoreDownloaded) {
            // Choice are always marked as outdated if updates cannot be checked because we can't tell if there's something
            // new without having to call all the WebServices.
            return mmCoreOutdated;
        } else {
            return status;
        }
    };

    /**
     * Download the module.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Choices cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the list of files.
     */
    self.getFiles = function(module, courseId) {
        return self.getIntroFiles(module, courseId);
    };

    /**
     * Returns choice intro files.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#getIntroFiles
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID.
     * @return {Promise}         Promise resolved with list of intro files.
     */
    self.getIntroFiles = function(module, courseId) {
        return $mmaModChoice.getChoice(courseId, module.id).catch(function() {
            // Not found, return undefined so module description is used.
        }).then(function(choice) {
            return self.getIntroFilesFromInstance(module, choice);
        });
    };

    /**
     * Get revision of a choice. Right now we'll always show it outdated, so we always return 0.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {String}         Revision.
     */
    self.getRevision = function(module, courseId) {
        return "0";
    };

    /**
     * Get timemodified of a choice. Right now we'll always show it outdated, so we always return 0.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#getTimemodified
     * @param {Object} module   Module to get the timemodified.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Number}         Timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        return 0;
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModChoice.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModChoice.invalidateChoiceData(courseId);
    };

    /**
     * Check if a choice is downloadable.
     * A choice isn't downloadable if it's not open yet.
     * Closed choices are downloadable because teachers can always see the results.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#isDownloadable
     * @param {Object} module    Module to check.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        return $mmaModChoice.getChoice(courseId, module.id).then(function(choice) {
            var now = $mmUtil.timestamp();
            if (choice.timeopen && choice.timeopen > now) {
                return false;
            }
            return true;
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModChoice.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_choice
     * @ngdoc method
     * @name $mmaModChoicePrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return self.prefetchPackage(module, courseId, single, prefetchChoice);
    };

    /**
     * Prefetch a choice.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchChoice(module, courseId, single, siteId) {
        // Prefetch the choice data.
        return $mmaModChoice.getChoice(courseId, module.id).then(function(choice) {
            var promises = [],
                files = self.getIntroFilesFromInstance(module, choice);

            // Prefetch files.
            promises.push($mmFilepool.addFilesToQueueByUrl(siteId, files, self.component, module.id));

            // Get the options and results.
            promises.push($mmaModChoice.getOptions(choice.id));
            promises.push($mmaModChoice.getResults(choice.id).then(function(options) {
                // If we can see the users that answered, prefetch their profile and avatar.
                var subPromises = [];
                angular.forEach(options, function(option) {
                    angular.forEach(option.userresponses, function(response) {
                        if (response.userid) {
                            subPromises.push($mmUser.getProfile(response.userid, courseId));
                        }
                        if (response.profileimageurl) {
                            subPromises.push($mmFilepool.addToQueueByUrl(siteId, response.profileimageurl).catch(function() {
                                // Ignore failures.
                            }));
                        }
                    });
                });
                return $q.all(subPromises);
            }));

            return $q.all(promises);
        }).then(function() {
            // Don't return revision and timemodified because choices are always shown as outdated.
            return {};
        });
    }

    return self;
});
