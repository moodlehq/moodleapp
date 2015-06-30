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
 * Factory containing course related methods.
 *
 * @module mm.core.course
 * @ngdoc service
 * @name $mmCourse
 */
.factory('$mmCourse', function($mmSite, $translate, $q, $log) {

    $log = $log.getInstance('$mmCourse');

    var self = {},
        mods = ["assign", "assignment", "book", "chat", "choice", "data", "database", "date", "external-tool",
            "feedback", "file", "folder", "forum", "glossary", "ims", "imscp", "label", "lesson", "lti", "page", "quiz",
            "resource", "scorm", "survey", "url", "wiki", "workshop"
        ];

    /**
     * Gte a module from Moodle.
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
                    module = section.modules[i];
                    if (module.id === moduleid) {
                        return module;
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
     * @param {Boolean} refresh True when we should not get the value from the cache.
     * @return {Promise} The reject contains the error message, else contains the section.
     */
    self.getSection = function(courseid, sectionid, refresh) {
        var deferred = $q.defer();

        if (sectionid < 0) {
            deferred.reject('Invalid section ID');
            return deferred.promise;
        }

        self.getSections(courseid, refresh).then(function(sections) {
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
     * @param {Number} courseid The course ID.
     * @param {Boolean} refresh True when we should not get the value from the cache.
     * @return {Promise} The reject contains the error message, else contains the sections.
     */
    self.getSections = function(courseid, refresh) {
        var presets = {};
        if (refresh) {
            presets.getFromCache = false;
        }
        return $mmSite.read('core_course_get_contents', {
            courseid: courseid,
            options: []
        }, presets);
    };

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
