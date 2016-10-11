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
.factory('$mmCourseHelper', function($q, $mmCoursePrefetchDelegate, $mmFilepool, $mmUtil, $mmCourse, $mmSite, $state,
            mmCoreNotDownloaded, mmCoreOutdated, mmCoreDownloading, mmCoreCourseAllSectionsId, $mmText, $translate) {

    var self = {},
        calculateSectionStatus = false;


    /**
     * Get the current value to show section status and allow section downloads.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#isDownloadSectionsEnabled
     * @return {Boolean}    If section status and downloads are enabled.
     */
    self.isDownloadSectionsEnabled = function() {
        return calculateSectionStatus;
    };


    /**
     * Set the current value to show section status and allow section downloads.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#setDownloadSectionsEnabled
     * @param {Boolean}     status  If section status and downloads are enabled.
     */
    self.setDownloadSectionsEnabled = function(status) {
        calculateSectionStatus = status;
        return calculateSectionStatus;
    };

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
                section.isCalculating = true;
            } else {
                section.isCalculating = true;
                statuspromises.push(self.calculateSectionStatus(section, courseid, restoreDownloads, refresh, downloadpromises)
                        .then(function(result) {

                    // Calculate "All sections" status.
                    allsectionsstatus = $mmFilepool.determinePackagesStatus(allsectionsstatus, result.status);
                }).finally(function() {
                    section.isCalculating = false;
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
        }).finally(function() {
            if (allsectionssection) {
                allsectionssection.isCalculating = false;
            }
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
                results = {
                    size: 0,
                    total: true
                };

            angular.forEach(sections, function(s) {
                if (s.id != mmCoreCourseAllSectionsId) {
                    promises.push($mmCoursePrefetchDelegate.getDownloadSize(s.modules, courseid).then(function(sectionsize) {
                        results.total = results.total && sectionsize.total;
                        results.size += sectionsize.size;
                    }));
                }
            });
            sizePromise = $q.all(promises).then(function() {
                return results;
            });
        }

        return sizePromise.then(function(size) {
            // Show confirm modal if needed.
            return $mmUtil.confirmDownloadSize(size);
        });
    };

    /**
     * Get the course ID from a module, showing an error message if it can't be retrieved.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#getModuleCourseId
     * @param {Number} id        Instance ID.
     * @param {String} module    Name of the module. E.g. 'glossary'.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the module's course ID.
     */
    self.getModuleCourseIdByInstance = function(id, module, siteId) {
        return $mmCourse.getModuleBasicInfoByInstance(id, module, siteId).then(function(cm) {
            return cm.course;
        }).catch(function(error) {
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mm.course.errorgetmodule', true);
            }
            return $q.reject();
        });
    };

    /**
     * Get prefetch info
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#getModulePrefetchInfo
     * @param {Object} module                   Module to get the info from.
     * @param {Number} courseid                 Course ID the section belongs to.
     * @param {Number} [invalidateCache=false]  Invalidates the cache first.
     * @return {Promise}                        Promise resolved with the download size, timemodified and module status.
     */
    self.getModulePrefetchInfo = function(module, courseId, invalidateCache) {

        var moduleInfo = {
                size: false,
                sizeReadable: false,
                timemodified: false,
                timemodifiedReadable: false,
                status: false,
                statusIcon: false
            },
            promises = [];

        if (typeof invalidateCache != "undefined" && invalidateCache) {
            $mmCoursePrefetchDelegate.invalidateModuleStatusCache(module);
        }

        promises.push($mmCoursePrefetchDelegate.getModuleDownloadedSize(module, courseId).then(function(moduleSize) {
            moduleInfo.size = moduleSize;
            moduleInfo.sizeReadable = $mmText.bytesToSize(moduleSize, 2);
        }));

        promises.push($mmCoursePrefetchDelegate.getModuleTimemodified(module, courseId).then(function(moduleModified) {
            moduleInfo.timemodified = moduleModified;
            if (moduleModified > 0) {
                var now = $mmUtil.timestamp();
                if (now - moduleModified < 7 * 86400) {
                    moduleInfo.timemodifiedReadable = moment(moduleModified * 1000).fromNow();
                } else {
                    moduleInfo.timemodifiedReadable = moment(moduleModified * 1000).calendar();
                }
            } else {
                moduleInfo.timemodifiedReadable = "";
            }
        }));

        promises.push($mmCoursePrefetchDelegate.getModuleStatus(module, courseId).then(function(moduleStatus) {
            moduleInfo.status = moduleStatus;
            switch (moduleStatus) {
                case mmCoreNotDownloaded:
                    moduleInfo.statusIcon = 'ion-ios-cloud-download-outline';
                    break;
                case mmCoreDownloading:
                    moduleInfo.statusIcon = 'spinner';
                    break;
                case mmCoreOutdated:
                    moduleInfo.statusIcon = 'ion-android-refresh';
                    break;
                default:
                    moduleInfo.statusIcon = "";
                    break;
            }
        }));

        return $q.all(promises).then(function () {
            return moduleInfo;
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
     * Given a list of sections, returns the list of modules in the sections.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#getSectionsModules
     * @param  {Object[]} sections Sections.
     * @return {Object[]}          Modules.
     */
    self.getSectionsModules = function(sections) {
        if (!sections || !sections.length) {
            return [];
        }

        var modules = [];
        sections.forEach(function(section) {
            if (section.modules) {
                modules = modules.concat(section.modules);
            }
        });
        return modules;
    };

    /**
     * Retrieves the courseId of the module and navigates to it.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#navigateToModule
     * @param  {Number} moduleId    Module's ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @param  {Number} [courseId]  Course ID. If not defined we'll try to retrieve it from the site.
     * @param  {Number} [sectionId] Section the module belongs to. If not defined we'll try to retrieve it from the site.
     * @return {Promise}            Promise resolved when the state changes.
     */
    self.navigateToModule = function(moduleId, siteId, courseId, sectionId) {
        siteId = siteId || $mmSite.getId();
        var modal = $mmUtil.showModalLoading(),
            promise;

        return $mmCourse.canGetModuleWithoutCourseId(siteId).then(function(enabled) {
            if (courseId && sectionId) {
                // No need to retrieve more data.
                promise = $q.when();
            } else if (!courseId && !enabled) {
                // We don't have enough data and we can't retrieve it.
                promise = $q.reject();
            } else if (!courseId) {
                // We don't have courseId but WS is enabled.
                promise = $mmCourse.getModuleBasicInfo(moduleId, siteId).then(function(module) {
                    courseId = module.course;
                    sectionId = module.section;
                });
            } else {
                // We don't have sectionId but we have courseId.
                promise = $mmCourse.getModuleSectionId(moduleId, courseId, siteId).then(function(id) {
                    sectionId = id;
                });
            }

            return promise.then(function() {
                if (courseId == 1) {
                    // It's front page we go directly to course section.
                    return $state.go('redirect', {
                        siteid: siteId,
                        state: 'site.mm_course-section',
                        params: {
                            cid: courseId,
                            mid: moduleId
                        }
                    });
                } else {
                    return $state.go('redirect', {
                        siteid: siteId,
                        state: 'site.mm_course',
                        params: {
                            courseid: courseId,
                            moduleid: moduleId,
                            sid: sectionId
                        }
                    });
                }
            });
        }).catch(function(error) {
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mm.course.errorgetmodule', true);
            }
            return $q.reject();
        }).finally(function() {
            modal.dismiss();
        });
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
     * Helper function to prefetch a module, showing a confirmation modal if the size is big
     * and invalidating contents if refreshing.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#prefetchModule
     * @param  {Object} scope       Scope.
     * @param  {Object} service     Service implementing 'invalidateContent' and 'prefetch'.
     * @param  {Object} module      Module to download.
     * @param  {Object|Number} size Containing size to download (in bytes) and a boolean to indicate if its totaly or
     *                              partialy calculated.
     * @param  {Boolean} refresh    True if refreshing, false otherwise.
     * @param  {Number}  courseId   Course ID of the module.
     * @return {Promise}            Promise resolved when downloaded.
     */
    self.prefetchModule = function(scope, service, module, size, refresh, courseId) {
        // Show confirmation if needed.
        return $mmUtil.confirmDownloadSize(size).then(function() {
            // Invalidate content if refreshing and download the data.
            var promise = refresh ? service.invalidateContent(module.id, courseId) : $q.when();
            return promise.catch(function() {
                // Ignore errors.
            }).then(function() {
                var promise;

                if (service.prefetch) {
                    promise = service.prefetch(module, courseId);
                } else if (service.prefetchContent) {
                    // Check 'prefetchContent' for backwards compatibility.
                    promise = service.prefetchContent(module, courseId);
                } else {
                    return $q.reject();
                }

                return promise.catch(function() {
                    if (!scope.$$destroyed) {
                        $mmUtil.showErrorModal('mm.core.errordownloading', true);
                    }
                });
            });
        });
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
})

.run(function($mmEvents, mmCoreEventLogout, $mmCourseHelper) {
    $mmEvents.on(mmCoreEventLogout, function() {
        $mmCourseHelper.setDownloadSectionsEnabled(false);
    });
});