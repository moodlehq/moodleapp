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

.constant('mmCoreCourseModulesStore', 'course_modules') // @deprecated since version 2.6. Please do not use.

.config(function($mmSitesFactoryProvider, mmCoreCourseModulesStore) {
    var stores = [
        {
            name: mmCoreCourseModulesStore,
            keyPath: 'id'
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Factory containing course related methods.
 *
 * @module mm.core.course
 * @ngdoc service
 * @name $mmCourse
 */
.factory('$mmCourse', function($mmSite, $translate, $q, $log, $mmEvents, $mmSitesManager, mmCoreEventCompletionModuleViewed) {

    $log = $log.getInstance('$mmCourse');

    var self = {},
        mods = ["assign", "assignment", "book", "chat", "choice", "data", "database", "date", "external-tool",
            "feedback", "file", "folder", "forum", "glossary", "ims", "imscp", "label", "lesson", "lti", "page", "quiz",
            "resource", "scorm", "survey", "url", "wiki", "workshop"
        ],
        modsWithContent = ['book', 'folder', 'imscp', 'page', 'resource', 'url'];

    /**
     * Add a 'contents' property if the module needs it and it doesn't have it already. In some weird cases the site
     * doesn't return this property and it's needed. See MOBILE-1381.
     *
     * @param {Object} module Module to check.
     * @return {Object}       Module with contents.
     */
    function addContentsIfNeeded(module) {
        if (modsWithContent.indexOf(module.modname) > -1) {
            module.contents = module.contents || [];
        }
        return module;
    }

    /**
     * Check if the site is prepared to return a module without having its course ID.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#canGetModuleWithoutCourseId
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if can return it, rejected or resolved with false otherwise.
     */
    self.canGetModuleWithoutCourseId = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('core_course_get_course_module');
        });
    };

    /**
     * Check if the site is prepared to return a module by instance ID.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#canGetModuleByInstance
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if can return it, rejected or resolved with false otherwise.
     */
    self.canGetModuleByInstance = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('core_course_get_course_module_by_instance');
        });
    };

    /**
     * Check if module completion could have changed. If it could have, trigger event. This function must be used,
     * for example, after calling a "module_view" WS since it can change the module completion.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#checkModuleCompletion
     * @param {Number} courseId   Course ID.
     * @param {Object} completion Completion status of the module.
     */
    self.checkModuleCompletion = function(courseId, completion) {
        if (completion && completion.tracking === 2 && completion.state === 0) {
            self.invalidateSections(courseId).finally(function() {
                $mmEvents.trigger(mmCoreEventCompletionModuleViewed, courseId);
            });
        }
    };

    /**
     * Get completion status of all the activities in a course for a certain user.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getActivitiesCompletionStatus
     * @param  {Number} courseid Course ID.
     * @param  {Number} [userid] User ID. If not defined, current user.
     * @return {Promise}         Promise resolved with the completion statuses: object where the key is module ID.
     */
    self.getActivitiesCompletionStatus = function(courseid, userid) {
        userid = userid || $mmSite.getUserId();

        $log.debug('Getting completion status for user ' + userid + ' in course ' + courseid);

        var params = {
                courseid: courseid,
                userid: userid
            },
            preSets = {
                cacheKey: getActivitiesCompletionCacheKey(courseid, userid)
            };

        return $mmSite.read('core_completion_get_activities_completion_status', params, preSets).then(function(data) {
            if (data && data.statuses) {
                var formattedStatuses = {};
                angular.forEach(data.statuses, function(status) {
                    formattedStatuses[status.cmid] = status;
                });
                return formattedStatuses;
            }
            return $q.reject();
        });
    };

    /**
     * Get cache key for activities completion WS calls.
     *
     * @param  {Number} courseid Course ID.
     * @param  {Number} userid   User ID.
     * @return {String}          Cache key.
     */
    function getActivitiesCompletionCacheKey(courseid, userid) {
        return 'mmCourse:activitiescompletion:' + courseid + ':' + userid;
    }

    /**
     * Gets a module basic info by module ID.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getModuleBasicInfo
     * @param  {Number} moduleId Module ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the module's info.
     */
    self.getModuleBasicInfo = function(moduleId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    cmid: moduleId
                },
                preSets = {
                    cacheKey: getModuleCacheKey(moduleId)
                };

            return site.read('core_course_get_course_module', params, preSets).then(function(response) {
                if (response.cm && (!response.warnings || !response.warnings.length)) {
                    return response.cm;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Gets a module basic grade info by module ID.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getModuleBasicInfo
     * @param  {Number} moduleId Module ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the module's grade info.
     */
    self.getModuleBasicGradeInfo = function(moduleId, siteId) {
        return self.getModuleBasicInfo(moduleId, siteId).then(function(info) {
            var grade = {
                advancedgrading: info.advancedgrading || false,
                grade: info.grade || false,
                gradecat: info.gradecat || false,
                gradepass: info.gradepass || false,
                outcomes: info.outcomes || false,
                scale: info.scale || false
            };

            if (grade.grade !== false || grade.advancedgrading !== false || grade.outcomes !== false) {
                return grade;
            }
            return false;
        });
    };

    /**
     * Gets a module basic info by instance.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getModuleBasicInfoByInstance
     * @param {Number} id        Instance ID.
     * @param {String} module    Name of the module. E.g. 'glossary'.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the module's info.
     */
    self.getModuleBasicInfoByInstance = function(id, module, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    instance: id,
                    module: module
                },
                preSets = {
                    cacheKey: getModuleByInstanceCacheKey(id, module)
                };

            return site.read('core_course_get_course_module_by_instance', params, preSets).then(function(response) {
                if (response.cm && (!response.warnings || !response.warnings.length)) {
                    return response.cm;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get a module from Moodle.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getModule
     * @param {Number} moduleId             The module ID.
     * @param {Number} [courseId]           The course ID. Recommended to speed up the process and minimize data usage.
     * @param {Number} [sectionId]          The section ID.
     * @param {Boolean} [preferCache=false] True if shouldn't call WS if data is cached, false otherwise.
     * @param  {String} [siteId]            Site ID. If not defined, current site.
     * @return {Promise}                    Promise resolved with the module.
     */
    self.getModule = function(moduleId, courseId, sectionId, preferCache, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!moduleId) {
            return $q.reject();
        }

        if (typeof preferCache == 'undefined') {
            preferCache = false;
        }

        var promise;

        if (!courseId) {
            // No courseId passed, try to retrieve it.
            promise = self.getModuleBasicInfo(moduleId, siteId).then(function(module) {
                return module.course;
            });
        } else {
            promise = $q.when(courseId);
        }

        return promise.then(function(cid) {
            courseId = cid;

            // Get the site.
            return $mmSitesManager.getSite(siteId);
        }).then(function(site) {
            // We have courseId, we can use core_course_get_contents for compatibility.
            $log.debug('Getting module ' + moduleId + ' in course ' + courseId);

            params = {
                courseid: courseId,
                options: [
                    {
                        name: 'cmid',
                        value: moduleId
                    }
                ]
            };
            preSets = {
                cacheKey: getModuleCacheKey(moduleId),
                omitExpires: preferCache
            };

            if (sectionId) {
                params.options.push({
                    name: 'sectionid',
                    value: sectionId
                });
            }

            return site.read('core_course_get_contents', params, preSets).catch(function() {
                // Error getting the module. Try to get all contents (without filtering by module).
                return self.getSections(courseId, false, false, preSets, siteId);
            }).then(function(sections) {
                var section,
                    module;

                for (var i = 0; i < sections.length; i++) {
                    section = sections[i];
                    for (var j = 0; j < section.modules.length; j++) {
                        module = section.modules[j];
                        if (module.id == moduleId) {
                            module.course = courseId;
                            return addContentsIfNeeded(module);
                        }
                    }
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get cache key for module WS calls.
     *
     * @param {Number} id     Instance ID.
     * @param {String} module Name of the module. E.g. 'glossary'.
     * @return {String}       Cache key.
     */
    function getModuleByInstanceCacheKey(id, module) {
        return 'mmCourse:moduleByInstance:' + module + ':' + id;
    }

    /**
     * Get cache key for module WS calls.
     *
     * @param {Number} moduleid Module ID.
     * @return {String}         Cache key.
     */
    function getModuleCacheKey(moduleid) {
        return 'mmCourse:module:' + moduleid;
    }

    /**
     * Returns the source to a module icon.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getModuleIconSrc
     * @param {String} moduleName The module name.
     * @return {String} The IMG src.
     */
    self.getModuleIconSrc = function(moduleName) {
        if (mods.indexOf(moduleName) < 0) {
            moduleName = "external-tool";
        }

        return "img/mod/" + moduleName + ".svg";
    };

    /**
     * Get the section ID a module belongs to.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getModuleSectionId
     * @param {Number} moduleId   The module ID.
     * @param {Number} [courseId] The course ID. Required if Moodle site is prior to 3.0.
     * @param {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.getModuleSectionId = function(moduleId, courseId, siteId) {

        if (!moduleId) {
            return $q.reject();
        }

        // Try to get the section using getModuleBasicInfo.
        return self.getModuleBasicInfo(moduleId, siteId).then(function(module) {
            return module.section;
        }).catch(function() {
            if (!courseId) {
                // It failed and we don't have courseId, reject.
                return $q.reject();
            }

            // Get all the sections in the course and iterate over them to find it.
            return self.getSections(courseId, false, true, {}, siteId).then(function(sections) {
                for (var i = 0, seclen = sections.length; i < seclen; i++) {
                    var section = sections[i];
                    for (var j = 0, modlen = section.modules.length; j < modlen; j++) {
                        if (section.modules[j].id == moduleId) {
                            return section.id;
                        }
                    }
                }
                // Not found.
                return $q.reject();
            });
        });
    };

    /**
     * Return a specific section.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getSection
     * @param {Number} courseId         The course ID.
     * @param {Boolean} excludeModules  Do not return modules, return only the sections structure.
     * @param {Boolean} excludeContents Do not return module contents (i.e: files inside a resource).
     * @param {Number} sectionId        The section ID.
     * @return {Promise}                Promise resolved with the section.
     */
    self.getSection = function(courseId, excludeModules, excludeContents, sectionId) {
        if (sectionId < 0) {
            return $q.reject('Invalid section ID');
        }

        return self.getSections(courseId, excludeModules, excludeContents).then(function(sections) {
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].id == sectionId) {
                    return sections[i];
                }
            }

            return $q.reject('Unkown section');
        });
    };

    /**
     * Get the course sections.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getSections
     * @param {Number} courseId         The course ID.
     * @param {Boolean} excludeModules  Do not return modules, return only the sections structure.
     * @param {Boolean} excludeContents Do not return module contents (i.e: files inside a resource).
     * @param {Object} [preSets]        Optional. Presets to use.
     * @param {String} [siteId]         Site ID. If not defined, current site.
     * @return {Promise}                The reject contains the error message, else contains the sections.
     */
    self.getSections = function(courseId, excludeModules, excludeContents, preSets, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            preSets = preSets || {};
            preSets.cacheKey = getSectionsCacheKey(courseId);
            preSets.getCacheUsingCacheKey = true; // This is to make sure users don't lose offline access when updating.

            var options = [
                    {
                        name: 'excludemodules',
                        value: excludeModules ? 1 : 0
                    },
                    {
                        name: 'excludecontents',
                        value: excludeContents ? 1 : 0
                    }
                ];

            return site.read('core_course_get_contents', {
                courseid: courseId,
                options: options
            }, preSets).then(function(sections) {
                var promise,
                    siteHomeId = site.getInfo().siteid || 1;

                if (courseId == siteHomeId) {
                    // Check if frontpage sections should be shown.
                    promise = site.getConfig('numsections').catch(function() {
                        // Ignore errors for not present settings assuming numsections will be true.
                        return $q.when(true);
                    });
                } else {
                    promise = $q.when(true);
                }

                return promise.then(function(showSections) {
                    if (!showSections && sections.length > 0) {
                        // Get only the last section (Main menu block section).
                        sections.pop();
                    }

                    angular.forEach(sections, function(section) {
                        angular.forEach(section.modules, function(module) {
                            addContentsIfNeeded(module);
                        });
                    });
                    return sections;
                });

            });
        });
    };

    /**
     * Get cache key for section WS call.
     *
     * @param  {Number} courseid Course ID.
     * @return {String}          Cache key.
     */
    function getSectionsCacheKey(courseid) {
        return 'mmCourse:sections:' + courseid;
    }

    /**
     * Invalidates module WS call.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#invalidateModule
     * @param {Number} moduleId Module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateModule = function(moduleId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getModuleCacheKey(moduleId));
        });
    };

    /**
     * Invalidates module WS call.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#invalidateModuleByInstance
     * @param {Number} id        Instance ID.
     * @param {String} module    Name of the module. E.g. 'glossary'.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}      Promise resolved when the data is invalidated.
     */
    self.invalidateModuleByInstance = function(id, module, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getModuleByInstanceCacheKey(id, module));
        });
    };

    /**
     * Invalidates sections WS call.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#invalidateSections
     * @param {Number} courseId  Course ID.
     * @param  {Number} [userId] User ID. If not defined, current user.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateSections = function(courseId, userId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var promises = [],
                siteHomeId = site.getInfo().siteid || 1;

            userId = userId || site.getUserId();

            promises.push(site.invalidateWsCacheForKey(getSectionsCacheKey(courseId)));
            promises.push(site.invalidateWsCacheForKey(getActivitiesCompletionCacheKey(courseId, userId)));
            if (courseId == siteHomeId) {
                promises.push(site.invalidateConfig());
            }
            return $q.all(promises);
        });
    };

    /**
     * Load module contents into module.contents if they aren't loaded already.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#loadModuleContents
     * @param  {Object} module      Module to load the contents.
     * @param  {Number} [courseId]  The course ID. Recommended to speed up the process and minimize data usage.
     * @param  {Number} [sectionId] The section ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when loaded.
     */
    self.loadModuleContents = function(module, courseId, sectionId, siteId) {
        siteId = siteId || $mmSite.getId();

        if (module.contents && module.contents.length) {
            // Already loaded.
            return $q.when();
        }

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var version = parseInt(site.getInfo().version, 10);

            if (version >= 2015051100) {
                // From Moodle 2.9 the course contents can be filtered, so maybe the module doesn't have contents
                // because they were filtered. Try to get its contents.
                return self.getModule(module.id, courseId, sectionId, false, siteId).then(function(mod) {
                    module.contents = mod.contents;
                });
            }
        });
    };

    /**
     * Report a course (and section) as being viewed.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#logView
     * @param {Number} courseId  Course ID.
     * @param {Number} [section] Section number.
     * @return {Promise}         Promise resolved when the WS call is successful.
     */
    self.logView = function(courseId, section) {
        var params = {
            courseid: courseId
        };
        if (typeof section != 'undefined') {
            params.sectionnumber = section;
        }

        return $mmSite.write('core_course_view_course', params).then(function(response) {
            if (!response.status) {
                return $q.reject();
            }
        });
    };

    /**
     * Translate a module name to current language.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#translateModuleName
     * @param {String} moduleName The module name.
     * @return {String}           Translated name.
     */
    self.translateModuleName = function(moduleName) {
        if (mods.indexOf(moduleName) < 0) {
            moduleName = "external-tool";
        }

        var langKey = 'mm.core.mod_' + moduleName,
            translated = $translate.instant(langKey);

        return translated !== langKey ? translated : moduleName;
    };


    return self;
});
