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

angular.module('mm.addons.mod_survey')

/**
 * Mod survey prefetch handler.
 *
 * @module mm.addons.mod_survey
 * @ngdoc service
 * @name $mmaModSurveyPrefetchHandler
 */
.factory('$mmaModSurveyPrefetchHandler', function($mmaModSurvey, mmaModSurveyComponent, $mmFilepool, $mmSite, $q, $mmUtil, md5,
            $mmPrefetchFactory) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModSurveyComponent);

    /**
     * Download the module.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Surveys cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the list of files.
     */
    self.getFiles = function(module, courseId) {
        return self.getIntroFiles(module, courseId);
    };

    /**
     * Returns survey intro files.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#getIntroFiles
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID.
     * @return {Promise}         Promise resolved with list of intro files.
     */
    self.getIntroFiles = function(module, courseId) {
        return $mmaModSurvey.getSurvey(courseId, module.id).catch(function() {
            // Not found, return undefined so module description is used.
        }).then(function(survey) {
            return self.getIntroFilesFromInstance(module, survey);
        });
    };

    /**
     * Get revision of a survey (list of questions).
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with revision.
     */
    self.getRevision = function(module, courseId) {
        return $mmaModSurvey.getSurvey(courseId, module.id).then(function(survey) {
            return getRevisionFromSurvey(module.id, survey);
        });
    };

    /**
     * Get revision of a survey.
     *
     * @param {Number} moduleId Module ID.
     * @param {Object} survey   Survey.
     * @return {Promise}        Promise resolved with the revision.
     */
    function getRevisionFromSurvey(moduleId, survey) {
        var promise,
            siteId = $mmSite.getId();

        // We use list of questions instead of template to treat weird case where list of questions is modified in DB.
        // If the survey has been answered, retrieve the revision from DB to prevent showing download again if questions change.
        if (survey.surveydone) {
            promise = $mmFilepool.getPackageRevision(siteId, mmaModSurveyComponent, moduleId).then(function(revision) {
                // This is the full revision, maybe containing the files hash. We only want the questions part.
                revision = '' + revision;
                return revision.split('#')[0];
            }).catch(function() {
                // Package not found, return survey questions.
                return md5.createHash(survey.questions);
            });
        } else {
            promise = $q.when(md5.createHash(survey.questions));
        }

        return promise.then(function(revision) {
            if (typeof survey.introfiles == 'undefined' && survey.intro) {
                // The survey doesn't return introfiles. We'll add a hash of file URLs to detect changes in files.
                // If the survey has introfiles there's no need to do this because they have timemodified.
                var urls = $mmUtil.extractDownloadableFilesFromHtml(survey.intro);
                urls = urls.sort(function (a, b) {
                    return a > b;
                });
                return revision + '#' + md5.createHash(JSON.stringify(urls));
            }
            return revision;
        });
    }

    /**
     * Get timemodified of a survey.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#getTimemodified
     * @param {Object} module   Module to get the timemodified.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        return self.getFiles(module, courseId).then(function(files) {
            return $mmFilepool.getTimemodifiedFromFileList(files);
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModSurvey.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        return $mmaModSurvey.invalidateSurveyData(courseId);
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModSurvey.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return self.prefetchPackage(module, courseId, single, prefetchSurvey);
    };

    /**
     * Prefetch a survey.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchSurvey(module, courseId, single, siteId) {
        var revision,
            timemod;

        // Prefetch the survey data.
        return $mmaModSurvey.getSurvey(courseId, module.id).then(function(survey) {
            // Get revision, timemodified and files.
            var promises = [],
                files = self.getIntroFilesFromInstance(module, survey);

            timemod = $mmFilepool.getTimemodifiedFromFileList(files);

            // Prefetch files.
            angular.forEach(files, function(file) {
                promises.push($mmFilepool.addToQueueByUrl(siteId, file.fileurl, component, module.id, file.timemodified));
            });

            // If survey isn't answered, prefetch the questions.
            if (!survey.surveydone) {
                promises.push($mmaModSurvey.getQuestions(survey.id));
            }

            // Get revision.
            promises.push(getRevisionFromSurvey(module.id, survey).then(function(rev) {
                revision = rev;
            }));

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
     * Remove module downloaded files.
     *
     * @module mm.addons.mod_survey
     * @ngdoc method
     * @name $mmaModSurveyPrefetchHandler#removeFiles
     * @param {Object} module   Module to remove the files.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved when done.
     */
    self.removeFiles = function(module, courseId) {
        return $mmFilepool.removeFilesByComponent($mmSite.getId(), self.component, module.id);
    };

    return self;
});
