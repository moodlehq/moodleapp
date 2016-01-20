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
.factory('$mmCourse', function($mmSite, $translate, $q, $log, $mmEvents, mmCoreEventCompletionModuleViewed) {

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
     * Get a module from Moodle.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getModule
     * @param {Number} courseid    The course ID.
     * @param {Number} moduleid    The module ID.
     * @param {Number} [sectionid] The section ID.
     * @return {Promise}
     */
    self.getModule = function(courseid, moduleid, sectionid) {

        if (!moduleid) {
            return $q.reject();
        }

        $log.debug('Getting module ' + moduleid + ' in course ' + courseid + ' and section ' +sectionid);

        var params = {
                courseid: courseid,
                options: [
                    {
                        name: 'cmid',
                        value: moduleid
                    }
                ]
            },
            preSets = {
                cacheKey: getModuleCacheKey(moduleid)
            };

        if (sectionid) {
            params.options.push({
                name: 'sectionid',
                value: sectionid
            });
        }

        return $mmSite.read('core_course_get_contents', params, preSets).then(function(sections) {
            var section,
                module;

            for (var i = 0; i < sections.length; i++) {
                section = sections[i];
                for (var j = 0; j < section.modules.length; j++) {
                    module = section.modules[j];
                    if (module.id === moduleid) {
                        return addContentsIfNeeded(module);
                    }
                }
            }

            return $q.reject();
        });
    };

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
     * Return a specific section.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getSection
     * @param {Number} courseid The course ID.
     * @param {Number} sectionid The section ID.
     * @return {Promise} The reject contains the error message, else contains the section.
     */
    self.getSection = function(courseid, sectionid) {
        var deferred = $q.defer();

        if (sectionid < 0) {
            deferred.reject('Invalid section ID');
            return deferred.promise;
        }

        self.getSections(courseid).then(function(sections) {
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].id == sectionid) {
                    deferred.resolve(sections[i]);
                    return;
                }
            }
            deferred.reject('Unkown section');
        }, function(error) {
            deferred.reject(error);
        });

        return deferred.promise;
    };

    /**
     * Get the course sections.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#getSections
     * @param {Number} courseid  The course ID.
     * @param {Object} [preSets] Optional. Presets to use.
     * @return {Promise} The reject contains the error message, else contains the sections.
     */
    self.getSections = function(courseid, preSets) {
        preSets = preSets || {};
        preSets.cacheKey = getSectionsCacheKey(courseid);

        return $mmSite.read('core_course_get_contents', {
            courseid: courseid,
            options: []
        }, preSets).then(function(sections) {
            angular.forEach(sections, function(section) {
                angular.forEach(section.modules, function(module) {
                    addContentsIfNeeded(module);
                });
            });
            return sections;
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
     * @param {Number} moduleid Module ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateModule = function(moduleid) {
        return $mmSite.invalidateWsCacheForKey(getModuleCacheKey(moduleid));
    };

    /**
     * Invalidates sections WS call.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#invalidateSections
     * @param {Number} courseid  Course ID.
     * @param  {Number} [userid] User ID. If not defined, current user.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateSections = function(courseid, userid) {
        userid = userid || $mmSite.getUserId();

        var p1 = $mmSite.invalidateWsCacheForKey(getSectionsCacheKey(courseid)),
            p2 = $mmSite.invalidateWsCacheForKey(getActivitiesCompletionCacheKey(courseid, userid));
        return $q.all([p1, p2]);
    };

    /**
     * Translate a module name to current language.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourse#translateModuleName
     * @param {String} moduleName The module name.
     * @return {Promise}          Promise resolved with the translated name.
     */
    self.translateModuleName = function(moduleName) {
        if (mods.indexOf(moduleName) < 0) {
            moduleName = "external-tool";
        }

        var langkey = 'mm.core.mod_'+moduleName;
        return $translate(langkey).then(function(translated) {
            return translated !== langkey ? translated : moduleName;
        });
    };


    return self;
});
