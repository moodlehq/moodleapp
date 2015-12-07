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

angular.module('mm.core.course')

/**
 * Helper to gather some common course functions.
 *
 * @module mm.core.course
 * @ngdoc service
 * @name $mmCourseHelper
 */
.factory('$mmCourseHelper', function($q, $mmCoursePrefetchDelegate, $mmApp, $mmFilepool, $mmUtil, $translate, $mmText,
            mmCoreNotDownloaded, mmCoreOutdated, mmCoreDownloading, mmCoreWifiDownloadThreshold, mmCoreDownloadThreshold,
            mmCoreCourseAllSectionsId) {

    var self = {};

    /**
     * Calculate the status of a section.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#calculateSectionStatus
     * @param {Object[]} section          Section to calculate its status. Can't be "All sections".
     * @param  {Number} courseid          Course ID the section belongs to.
     * @param {Boolean} restoreDownloads  True if it should restore downloads. It will try to restore this section downloads.
     * @param {Boolean} refresh           True if it shouldn't use module status cache (slower).
     * @param {Promise[]} [dwnpromises]   If section download is restored, a promise will be added to this array. Required
     *                                    if restoreDownloads=true.
     * @return {Promise}         Promise resolved when the state is calculated.
     */
    self.calculateSectionStatus = function(section, courseid, restoreDownloads, refresh, dwnpromises) {

        if (section.id !== mmCoreCourseAllSectionsId) {
            // Get the status of this section.
            return $mmCoursePrefetchDelegate.getModulesStatus(section.id, section.modules, courseid, refresh, restoreDownloads)
                    .then(function(result) {

                // Check if it's being downloaded. We can't trust status 100% because downloaded books are always outdated.
                var downloadid = self.getSectionDownloadId(section);
                if ($mmCoursePrefetchDelegate.isBeingDownloaded(downloadid)) {
                    result.status = mmCoreDownloading;
                }

                // Set this section data.
                section.showDownload = result.status === mmCoreNotDownloaded;
                section.showRefresh = result.status === mmCoreOutdated;

                if (result.status !== mmCoreDownloading) {
                    section.isDownloading = false;
                    section.total = 0;
                } else if (!restoreDownloads) {
                    // Set download data.
                    section.count = 0;
                    section.total = result[mmCoreOutdated].length + result[mmCoreNotDownloaded].length +
                                    result[mmCoreDownloading].length;
                    section.isDownloading = true;
                } else {
                    // Restore or re-start the prefetch.
                    var promise = self.startOrRestorePrefetch(section, result, courseid).then(function() {
                        // Re-calculate the status of this section once finished.
                        return self.calculateSectionStatus(section, courseid);
                    });
                    if (dwnpromises) {
                        dwnpromises.push(promise);
                    }
                }

                return result;
            });
        }
        return $q.reject();
    };

    /**
     * Calculate the status of a list of sections, setting attributes to determine the icons/data to be shown.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#calculateSectionsStatus
     * @param {Object[]} sections         Sections to calculate their status.
     * @param  {Number} courseid          Course ID the sections belong to.
     * @param {Boolean} restoreDownloads  True if it should restore downloads. It will try to restore section downloads
     * @param {Boolean} refresh           True if it shouldn't use module status cache (slower).
     * @return {Promise}                  Promise resolved when the states are calculated. Returns an array of download promises
     *                                    with the restored downloads (only if restoreDownloads=true).
     */
    self.calculateSectionsStatus = function(sections, courseid, restoreDownloads, refresh) {

        var allsectionssection,
            allsectionsstatus,
            downloadpromises = [],
            statuspromises = [];

        angular.forEach(sections, function(section) {
            if (section.id === mmCoreCourseAllSectionsId) {
                // "All sections" section status is calculated using the status of the rest of sections.
                allsectionssection = section;
            } else {
                statuspromises.push(self.calculateSectionStatus(section, courseid, restoreDownloads, refresh, downloadpromises)
                        .then(function(result) {

                    // Calculate "All sections" status.
                    allsectionsstatus = $mmFilepool.determinePackagesStatus(allsectionsstatus, result.status);
                }));
            }
        });

        return $q.all(statuspromises).then(function() {
            if (allsectionssection) {
                // Set "All sections" data.
                allsectionssection.showDownload = allsectionsstatus === mmCoreNotDownloaded;
                allsectionssection.showRefresh = allsectionsstatus === mmCoreOutdated;
                allsectionssection.isDownloading = allsectionsstatus === mmCoreDownloading;
            }
            return downloadpromises;
        });
    };

    /**
     * Calculate the size of the download and show a confirm modal if needed.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#confirmDownloadSize
     * @param {Number} courseid   Course ID the section belongs to.
     * @param {Object} section    Section.
     * @param {Object[]} sections List of sections. Used when downloading all the sections.
     * @return {Promise}          Promise resolved if the user confirms or there's no need to confirm.
     */
    self.confirmDownloadSize = function(courseid, section, sections) {
        var sizePromise;

        // Calculate the size of the download.
        if (section.id != mmCoreCourseAllSectionsId) {
            sizePromise = $mmCoursePrefetchDelegate.getDownloadSize(section.modules, courseid);
        } else {
            var promises = [],
                size = 0;
            angular.forEach(sections, function(s) {
                if (s.id != mmCoreCourseAllSectionsId) {
                    promises.push($mmCoursePrefetchDelegate.getDownloadSize(s.modules, courseid).then(function(sectionsize) {
                        size = size + sectionsize;
                    }));
                }
            });
            sizePromise = $q.all(promises).then(function() {
                return size;
            });
        }

        return sizePromise.then(function(size) {
            // Show confirm modal if needed.
            return $mmUtil.confirmDownloadSize(size);
        });
    };

    /**
     * Get the download ID of a section. It's used to interact with $mmCoursePrefetchDelegate.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#getSectionDownloadId
     * @param {Object} section Section.
     * @return {String}        Section download ID.
     */
    self.getSectionDownloadId = function(section) {
        return 'Section-'+section.id;
    };

    /**
     * Prefetch or restore the prefetch of one section or all the sections.
     * If the section is "All sections" it will prefetch all the sections.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#prefetch
     * @param  {Object} section    Section.
     * @param  {Number} courseid   Course ID the section belongs to.
     * @param  {Object[]} sections List of sections. Used when downloading all the sections.
     * @return {promise}           Promise resolved when the prefetch is finished.
     */
    self.prefetch = function(section, courseid, sections) {

        if (section.id != mmCoreCourseAllSectionsId) {
            // Download only this section.
            return self.prefetchSection(section, courseid, true, sections);
        } else {
            // Download all the sections except "All sections".
            // In case of a failure, we want that ALL promises have finished before rejecting the promise.
            var promises = [];

            section.isDownloading = true;
            angular.forEach(sections, function(s) {
                if (s.id != mmCoreCourseAllSectionsId) {
                    promises.push(self.prefetchSection(s, courseid, false, sections).then(function() {
                        // Calculate only the section that finished.
                        return self.calculateSectionStatus(s, courseid);
                    }));
                }
            });

            return $mmUtil.allPromises(promises);
        }
    };

    /**
     * Prefetch or restore the prefetch of a certain section if it needs to be prefetched.
     * If the section is "All sections" it will be ignored.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#prefetchSection
     * @param  {Object} section         Section to prefetch.
     * @param  {Number} courseid        Course ID the section belongs to.
     * @param  {Boolean} singleDownload True if user is only downloading this section, false if user is downloading all sections.
     * @param {Object[]} [sections]     List of sections. Used only if singleDownload is true.
     * @return {Promise}                Promise resolved when the section is prefetched.
     */
    self.prefetchSection = function(section, courseid, singleDownload, sections) {

        if (section.id == mmCoreCourseAllSectionsId) {
            return $q.when();
        }

        section.isDownloading = true;

        // Validate the section needs to be downloaded and calculate amount of modules that need to be downloaded.
        return $mmCoursePrefetchDelegate.getModulesStatus(section.id, section.modules, courseid).then(function(result) {
            if (result.status === mmCoreNotDownloaded || result.status === mmCoreOutdated || result.status === mmCoreDownloading) {
                var promise = self.startOrRestorePrefetch(section, result, courseid);
                if (singleDownload) {
                    // Re-calculate status to determine the right status for the "All sections" section.
                    self.calculateSectionsStatus(sections, courseid, false);
                }
                return promise;
            }
        }, function() {
            // This shouldn't happen.
            section.isDownloading = false;
            return $q.reject();
        });
    };

    /**
     * Start or restore the prefetch of a section.
     * If the section is "All sections" it will be ignored.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#startOrRestorePrefetch
     * @param {Object} section Section to download.
     * @param {Object} status  Result of $mmCoursePrefetchDelegate#getModulesStatus for this section.
     * @return {Promise}       Promise resolved when the section has been prefetched.
     */
    self.startOrRestorePrefetch = function(section, status, courseid) {

        if (section.id == mmCoreCourseAllSectionsId) {
            return $q.when();
        }

        // We only download modules with status notdownloaded, downloading or outdated.
        var modules = status[mmCoreOutdated].concat(status[mmCoreNotDownloaded]).concat(status[mmCoreDownloading]),
            downloadid = self.getSectionDownloadId(section),
            moduleids;

        moduleids = modules.map(function(m) {
            return m.id;
        });

        // Set download data.
        section.count = 0;
        section.total = modules.length;
        section.isDownloading = true;

        // We prefetch all the modules to prevent incoeherences in the download count
        // and also to download stale data that might not be marked as outdated.
        return $mmCoursePrefetchDelegate.prefetchAll(downloadid, modules, courseid).then(function() {}, function() {
            // Return a rejected promise so errors are handled outside of this function.
            return $q.reject();
        }, function(id) {
            // Progress. Check that the module downloaded is one of the expected ones.
            var index = moduleids.indexOf(id);
            if (index > -1) {
                // It's one of the modules we were expecting to download.
                moduleids.splice(index, 1);
                section.count++;
            }
        });
    };

    return self;
});
