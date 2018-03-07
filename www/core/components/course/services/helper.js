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
.factory('$mmCourseHelper', function($q, $mmCoursePrefetchDelegate, $mmFilepool, $mmUtil, $mmCourse, $mmSite, $state, $mmText,
            mmCoreNotDownloaded, mmCoreOutdated, mmCoreDownloading, mmCoreCourseAllSectionsId, $mmSitesManager, $mmAddonManager,
            $controller, $mmCourseDelegate, $translate, $mmEvents, mmCoreEventPackageStatusChanged, mmCoreNotDownloadable,
            mmCoreDownloaded, $mmCoursesDelegate) {

    var self = {},
        calculateSectionStatus = false,
        courseDwnPromises = {};


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
                    var promise = self.startOrRestorePrefetch(section, result, courseid).then(function(prevented) {
                        if (prevented !== true) {
                            // Re-calculate the status of this section once finished.
                            return self.calculateSectionStatus(section, courseid);
                        }
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
     * @param {Number} courseid     Course ID the section belongs to.
     * @param {Object} [section]    Section. If not provided, all sections.
     * @param {Object[]} [sections] List of sections. Used when downloading all the sections.
     * @param  {Boolean} [alwaysConfirm] True to show a confirm even if the size isn't high, false otherwise.
     * @return {Promise}            Promise resolved if the user confirms or there's no need to confirm.
     */
    self.confirmDownloadSize = function(courseid, section, sections, alwaysConfirm) {
        var sizePromise;

        // Calculate the size of the download.
        if (section && section.id != mmCoreCourseAllSectionsId) {
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
            return $mmUtil.confirmDownloadSize(size, undefined, undefined, undefined, undefined, alwaysConfirm);
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
     * @param  {String} [component]             Component of the module.
     * @return {Promise}                        Promise resolved with the download size, timemodified and module status.
     */
    self.getModulePrefetchInfo = function(module, courseId, invalidateCache, component) {

        var moduleInfo = {
                size: false,
                sizeReadable: false,
                timemodified: false,
                timemodifiedReadable: false,
                status: false,
                statusIcon: false
            },
            siteId = $mmSite.getId(),
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

        // Get the time it was downloaded (if it was downloaded).
        promises.push($mmFilepool.getPackageData(siteId, component, module.id).then(function(data) {
            if (data && data.downloadtime && (data.status == mmCoreOutdated || data.status == mmCoreDownloaded)) {
                moduleInfo.downloadtime = data.downloadtime;
                var now = $mmUtil.timestamp();
                if (now - data.downloadtime < 7 * 86400) {
                    moduleInfo.downloadtimeReadable = moment(data.downloadtime * 1000).fromNow();
                } else {
                    moduleInfo.downloadtimeReadable = moment(data.downloadtime * 1000).calendar();
                }
            }
        }).catch(function() {
            // Not downloaded.
            moduleInfo.downloadtime = 0;
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
     * This function treats every module on the sections provided to get the controller a content handler provides, treat completion
     * and navigates to a module page if required. It also returns if sections has content.
     *
     * @param {Array}   sections            Sections to treat modules.
     * @param {Number}  courseId            Course ID of the modules.
     * @param {Number}  moduleId            Module to navigate to if needed.
     * @param {Array}   completionStatus    If it needs to treat completion the status of each module.
     * @param {Object}  scope               Scope of the view.
     * @return {Boolean}                    If sections has content.
     */
    self.addContentHandlerControllerForSectionModules = function(sections, courseId, moduleId, completionStatus, scope) {
        var hasContent = false;

        angular.forEach(sections, function(section) {
            if (!section || !self.sectionHasContent(section)) {
                return;
            }

            hasContent = true;

            angular.forEach(section.modules, function(module) {
                module._controller =
                        $mmCourseDelegate.getContentHandlerControllerFor(module.modname, module, courseId, section.id);

                if (completionStatus && typeof completionStatus[module.id] != 'undefined') {
                    // Check if activity has completions and if it's marked.
                    module.completionstatus = completionStatus[module.id];
                    module.completionstatus.courseId = courseId;
                }

                if (module.id == moduleId) {
                    // This is the module we're looking for. Open it.
                    var newScope = scope.$new();
                    $controller(module._controller, {$scope: newScope});
                    if (newScope.action) {
                        newScope.action();
                    }
                    newScope.$destroy();
                }
            });
        });

        return hasContent;
    }

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
                // Get the site.
                return $mmSitesManager.getSite(siteId);
            }).then(function(site) {
                if (courseId == site.getSiteHomeId()) {
                    var $mmaFrontpage = $mmAddonManager.get('$mmaFrontpage');
                    if ($mmaFrontpage && !$mmaFrontpage.isDisabledInSite(site)) {
                        return $mmaFrontpage.isFrontpageAvailable().then(function() {
                            // Frontpage is avalaible so redirect to it.
                            return $state.go('redirect', {
                                siteid: siteId,
                                state: 'site.frontpage',
                                params: {
                                    moduleid: moduleId
                                }
                            });
                        });
                    }
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
            $mmUtil.showErrorModalDefault(error, 'mm.course.errorgetmodule', true);
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

                return promise.catch(function(error) {
                    if (!scope.$$destroyed) {
                        $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
                        return $q.reject();
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
     * @return {Promise}       Promise resolved when the section has been prefetched. Resolve param is true if prevented.
     */
    self.startOrRestorePrefetch = function(section, status, courseid) {

        if (section.id == mmCoreCourseAllSectionsId) {
            return $q.when(true);
        }

        if (section.total > 0) {
            // Already being downloaded.
            return $q.when(true);
        }

        // We only download modules with status notdownloaded, downloading or outdated.
        var modules = status[mmCoreOutdated].concat(status[mmCoreNotDownloaded]).concat(status[mmCoreDownloading]),
            downloadid = self.getSectionDownloadId(section);

        // Set download data.
        section.count = 0;
        section.total = modules.length;
        section.dwnModuleIds = modules.map(function(m) {
            return m.id;
        });
        section.isDownloading = true;

        // We prefetch all the modules to prevent incoeherences in the download count
        // and also to download stale data that might not be marked as outdated.
        return $mmCoursePrefetchDelegate.prefetchAll(downloadid, modules, courseid).then(undefined, undefined, function(id) {
            // Progress. Check that the module downloaded is one of the expected ones.
            var index = section.dwnModuleIds.indexOf(id);
            if (index > -1) {
                // It's one of the modules we were expecting to download.
                section.dwnModuleIds.splice(index, 1);
                section.count++;
            }
        });
    };

    /**
     * Check if a section has content.
     * Used mostly when a section is going to be rendered.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#sectionHasContent
     * @param {Object} section Section to check.
     * @return {Boolean}       True if the section has content.
     */
    self.sectionHasContent = function(section) {
        return !section.hiddenbynumsections && ((typeof section.availabilityinfo != "undefined" && section.availabilityinfo != '') ||
            section.summary != '' || section.modules.length);
    };

    /**
     * Show confirmation dialog and then remove a module files.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#confirmAndRemove
     * @param {Object} module    Module to remove the files.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.confirmAndRemove = function(module, courseId) {
        return $mmUtil.showConfirm($translate('mm.course.confirmdeletemodulefiles')).then(function() {
            return $mmCoursePrefetchDelegate.removeModuleFiles(module, courseId);
        });
    };

    /**
     * Helper function to prefetch a module, showing a confirmation modal if the size is big. Meant to be called
     * from a context menu option.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#contextMenuPrefetch
     * @param {Object} scope    Scope
     * @param {Object} module   Module to be prefetched
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved when done.
     */
    self.contextMenuPrefetch = function(scope, module, courseId) {
        var icon = scope.prefetchStatusIcon;

        scope.prefetchStatusIcon = 'spinner'; // Show spinner since this operation might take a while.
        // We need to call getDownloadSize, the package might have been updated.
        return $mmCoursePrefetchDelegate.getModuleDownloadSize(module, courseId, true).then(function(size) {
            return $mmUtil.confirmDownloadSize(size).then(function() {
                return $mmCoursePrefetchDelegate.prefetchModule(module, courseId, true).catch(function(error) {
                    return failPrefetch(!scope.$$destroyed, error);
                });
            }, function() {
                // User hasn't confirmed, stop spinner.
                scope.prefetchStatusIcon = icon;
                return failPrefetch(false);
            });
        }, function(error) {
            return failPrefetch(true, error);
        });

        // Function to call if an error happens.
        function failPrefetch(showError, error) {
            scope.prefetchStatusIcon = icon;
            if (showError) {
                $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
            }
            return $q.reject();
        }
    };

    /**
     * Fill the Context Menu when particular Module is loaded.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#fillContextMenu
     * @param  {Object} scope                   Scope.
     * @param  {Object} module                  Module.
     * @param  {Number} courseId                Course ID the module belongs to.
     * @param  {Number} [invalidateCache=false] Invalidates the cache first.
     * @param  {String} [component]             Component of the module.
     * @return {Promise}                        Promise resolved when done.
     */
    self.fillContextMenu = function(scope, module, courseId, invalidateCache, component) {
        return self.getModulePrefetchInfo(module, courseId, invalidateCache, component).then(function(moduleInfo) {
            scope.size = moduleInfo.size > 0 ? moduleInfo.sizeReadable : 0;
            scope.prefetchStatusIcon = moduleInfo.statusIcon;

            if (moduleInfo.status != mmCoreNotDownloadable) {
                // Module is downloadable, calculate timemodified.
                if (moduleInfo.timemodified > 0) {
                    scope.timemodified = $translate.instant('mm.core.lastmodified') + ': ' + moduleInfo.timemodifiedReadable;
                } else if (moduleInfo.downloadtime > 0) {
                    scope.timemodified = $translate.instant('mm.core.lastdownloaded') + ': ' + moduleInfo.downloadtimeReadable;
                } else {
                    // Cannot calculate time modified, show a default text.
                    scope.timemodified = $translate.instant('mm.core.download');
                }
            }

            if (typeof scope.statusObserver == 'undefined' && component) {
                scope.statusObserver = $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
                    if (data.siteid === $mmSite.getId() && data.componentId === module.id && data.component === component) {
                        self.fillContextMenu(scope, module, courseId, false, component);
                    }
                });

                scope.$on('$destroy', function() {
                    scope.statusObserver && scope.statusObserver.off && scope.statusObserver.off();
                });
            }
        });
    };

    /**
     * Get a course download promise (if any).
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#getCourseDownloadPromise
     * @param {Number} courseId Course ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Download promise, undefined if not found:
     */
    self.getCourseDownloadPromise = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return courseDwnPromises[siteId] && courseDwnPromises[siteId][courseId];
    };

    /**
     * Get a course status icon.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#getCourseStatusIcon
     * @param {Number} courseId Course ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the icon name.
     */
    self.getCourseStatusIcon = function(courseId, siteId) {
        return $mmCourse.getCourseStatus(courseId, siteId).then(function(status) {
            return self.getCourseStatusIconFromStatus(status);
        });
    };

    /**
     * Get a course status icon from status.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#getCourseStatusIconFromStatus
     * @param {String} status Course status.
     * @return {String}       Icon name.
     */
    self.getCourseStatusIconFromStatus = function(status) {
        if (status == mmCoreDownloaded) {
            // Always show refresh icon, we cannot knew if there's anything new in course options.
            return 'ion-android-refresh';
        } else if (status == mmCoreDownloading) {
            return 'spinner';
        } else {
            return 'ion-ios-cloud-download-outline';
        }
    };

    /**
     * Prefetch all the activities in a course and also the course options.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#prefetchCourse
     * @param  {Object} course          The course to prefetch.
     * @param  {Object[]} sections      List of course sections.
     * @param  {Object[]} courseOptions List of course options. Each option should have a "prefetch" function if it's downloadable.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when the download finishes.
     */
    self.prefetchCourse = function(course, sections, courseOptions, siteId) {
        siteId = siteId || $mmSite.getId();

        if (courseDwnPromises[siteId] && courseDwnPromises[siteId][course.id]) {
            // There's already a download ongoing for this course, return the promise.
            return courseDwnPromises[siteId][course.id];
        } else if (!courseDwnPromises[siteId]) {
            courseDwnPromises[siteId] = {};
        }

        // First of all, mark the course as being downloaded.
        courseDwnPromises[siteId][course.id] = $mmCourse.setCourseStatus(course.id, mmCoreDownloading, siteId).then(function() {
            var promises = [],
                allSectionsSection;

            // Prefetch all the sections. If the first section is "All sections", use it. Otherwise, use a fake "All sections".
            allSectionsSection = sections[0].id == mmCoreCourseAllSectionsId ? sections[0] : {id: mmCoreCourseAllSectionsId};
            promises.push(self.prefetch(allSectionsSection, course.id, sections));

            // Prefetch course options.
            angular.forEach(courseOptions, function(option) {
                if (option.prefetch) {
                    promises.push($q.when(option.prefetch(course)).catch(function() {
                        // Ignore errors when downloading course options.
                    }));
                }
            });

            return $mmUtil.allPromises(promises);
        }).then(function() {
            // Download success, mark the course as downloaded.
            return $mmCourse.setCourseStatus(course.id, mmCoreDownloaded, siteId);
        }).catch(function(error) {
            // Error, restore previous status.
            return $mmCourse.setCoursePreviousStatus(course.id, siteId).then(function() {
                return $q.reject(error);
            });
        }).finally(function() {
            delete courseDwnPromises[siteId][course.id];
        });

        return courseDwnPromises[siteId][course.id];
    };

    /**
     * Show a confirm and prefetch a course. It will retrieve the sections and the course options if not provided.
     * This function will set the icon to "spinner" when starting and it will also set it back to the initial icon if the
     * user cancels. All the other updates of the icon should be made when mmCoreEventCourseStatusChanged is received.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#confirmAndPrefetchCourse
     * @param  {Object} scope             Scope to set the icon.
     * @param  {Object} course            Course to prefetch.
     * @param  {Object[]} [sections]      List of course sections.
     * @param  {Object[]} [courseOptions] List of options. Each option should have a "prefetch" function if it's downloadable.
     * @return {Promise}                  Promise resolved with true when the download finishes, resolved with false if user
     *                                    doesn't confirm, rejected if an error occurs.
     */
    self.confirmAndPrefetchCourse = function(scope, course, sections, courseOptions) {
        var initialIcon = scope.prefetchCourseIcon,
            promise,
            siteId = $mmSite.getId();

        scope.prefetchCourseIcon = 'spinner';

        // Get the sections first if needed.
        if (sections) {
            promise = $q.when(sections);
        } else {
            promise = $mmCourse.getSections(course.id, false, true);
        }

        return promise.then(function(sections) {
            // Confirm the download.
            return self.confirmDownloadSize(course.id, undefined, sections, true).then(function() {
                // User confirmed, get the course actions if needed.
                if (courseOptions) {
                    promise = $q.when(courseOptions);
                } else {
                    promise = $mmCoursesDelegate.getNavHandlersToDisplay(course, false, false, true);
                }

                return promise.then(function(handlers) {
                    // Now we have all the data, download the course.
                    return self.prefetchCourse(course, sections, handlers, siteId);
                }).then(function() {
                    // Download successful.
                    return true;
                });
            }, function(error) {
                // User cancelled or there was an error calculating the size.
                if (error) {
                    $mmUtil.showErrorModal(error);
                }
                scope.prefetchCourseIcon = initialIcon;
                return false;
            });
        }).catch(function(error) {
            // Don't show error message if scope is destroyed.
            if (!scope.$$destroyed) {
                $mmUtil.showErrorModalDefault(error, 'mm.course.errordownloadingcourse', true);
            }

            return $q.reject(error);
        });
    };

    /**
     * Confirm and prefetches a list of courses.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#confirmAndPrefetchCourses
     * @param  {Object[]} courses List of courses to download.
     * @return {Promise} Promise resolved with true when downloaded, resolved with false if user cancels, rejected if error.
     *                   It will send a "progress" everytime a course is downloaded or fails to download.
     */
    self.confirmAndPrefetchCourses = function(courses) {
        var siteId = $mmSite.getId();

        // Confirm the download without checking size because it could take a while.
        return $mmUtil.showConfirm($translate('mm.core.areyousure')).then(function() {
            var deferred = $q.defer(), // Use a deferred to be able to notify the progress.
                promises = [],
                total = courses.length,
                count = 0;

            // Notify the start of the download.
            setTimeout(function() {
                deferred.notify({
                    count: count,
                    total: total
                });
            });

            angular.forEach(courses, function(course) {
                var subPromises = [],
                    sections,
                    handlers,
                    success = true;

                // Get the sections and the handlers.
                subPromises.push($mmCourse.getSections(course.id, false, true).then(function(courseSections) {
                    sections = courseSections;
                }));
                subPromises.push($mmCoursesDelegate.getNavHandlersToDisplay(course, false, false, true).then(function(cHandlers) {
                    handlers = cHandlers;
                }));

                promises.push($q.all(subPromises).then(function() {
                    return self.prefetchCourse(course, sections, handlers, siteId);
                }).catch(function(error) {
                    success = false;

                    // Try to improve the error message, including the course name.
                    if (course && course.fullname) {
                        error = $translate.instant('mm.course.errordownloadingcoursewithname', {
                            name: course.fullname,
                            error: error || ''
                        });
                    }

                    return $q.reject(error);
                }).finally(function() {
                    // Course downloaded or failed, notify the progress.
                    count++;
                    deferred.notify({
                        count: count,
                        total: total,
                        course: course.id,
                        success: success
                    });
                }));
            });

            $mmUtil.allPromises(promises).then(function() {
                deferred.resolve(true);
            }, deferred.reject);

            return deferred.promise;
        }, function() {
            // User cancelled.
            return false;
        });
    };

    /**
     * Determine the status of a list of courses.
     *
     * @ngdoc method
     * @name $mmCourseHelper#determineCoursesStatus
     * @param  {Object[]} courses Courses
     * @return {Promise}          Promise resolved with the status.
     */
    self.determineCoursesStatus = function(courses) {
        // Get the status of each course.
        var promises = [],
            siteId = $mmSite.getId();

        angular.forEach(courses, function(course) {
            promises.push($mmCourse.getCourseStatus(course.id, siteId));
        });

        return $q.all(promises).then(function(statuses) {
            // Now determine the status of the whole list.
            var status = statuses[0];
            for (var i = 1; i < statuses.length; i++) {
                status = $mmFilepool.determinePackagesStatus(status, statuses[i]);
            }
            return status;
        });
    };

    return self;
})

.run(function($mmEvents, mmCoreEventLogout, $mmCourseHelper) {
    $mmEvents.on(mmCoreEventLogout, function() {
        $mmCourseHelper.setDownloadSectionsEnabled(false);
    });
});