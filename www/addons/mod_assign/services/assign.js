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

angular.module('mm.addons.mod_assign')

/**
 * Assignments service.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name $mmaModAssign
 */
.factory('$mmaModAssign', function($mmSite, $q, $mmUser) {
    var self = {};

    /**
     * Get an assignment.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getAssignment
     * @param {Number} courseid   Course ID the assignment belongs to.
     * @param {Number} cmid       Assignment module ID.
     * @param {Boolean} [refresh] True when we should not get the value from the cache.
     * @return {Promise}          Promise resolved with the assignment.
     */
    self.getAssignment = function(courseid, cmid, refresh) {
        var params = {
                "courseids": [courseid]
            },
            preSets = {};

        if (refresh) {
            preSets.getFromCache = false;
        }

        return $mmSite.read('mod_assign_get_assignments', params, preSets).then(function(response) {
            if (response.courses && response.courses.length) {
                var assignments = response.courses[0].assignments;
                for (var i = 0; i < assignments.length; i++) {
                    if (assignments[i].cmid == cmid) {
                        return assignments[i];
                    }
                }
                return $q.reject();
            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Get attachments of a submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionAttachments
     * @param {Object} submission Submission.
     * @return {Object[]}         Submission attachments.
     */
    self.getSubmissionAttachments = function(submission) {
        var files = [];
        if (submission.plugins) {
            submission.plugins.forEach(function(plugin) {
                if (plugin.type === 'file' && plugin.fileareas && plugin.fileareas[0] && plugin.fileareas[0].files) {
                    files = plugin.fileareas[0].files;
                    angular.forEach(files, function(file) {
                        file.filename = file.filepath;
                    });
                }
            });
        }
        return files;
    };

    /**
     * Get text of a submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionText
     * @param {Object} submission Submission.
     * @return {String}           Submission text.
     */
    self.getSubmissionText = function(submission) {
        var text = '';
        if (submission.plugins) {
            angular.forEach(submission.plugins, function(plugin) {
                if (plugin.type === 'onlinetext' && plugin.editorfields) {
                    text = plugin.editorfields[0].text;

                    // Online text contains '@@PLUGINFILE@@' for each embedded file. Replace those with the right URL.
                    if (plugin.fileareas && plugin.fileareas[0] && plugin.fileareas[0].files && plugin.fileareas[0].files[0]) {
                        var fileURL =  plugin.fileareas[0].files[0].fileurl;
                        fileURL = fileURL.substr(0, fileURL.lastIndexOf('/')).replace('pluginfile.php/', 'pluginfile.php?file=/');
                        text = text.replace(/@@PLUGINFILE@@/g, fileURL);
                    }
                }
            });
        }
        return text;
    };

    /**
     * Get an assignment submissions.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissions
     * @param {Number}  id        Assignment id.
     * @param {Boolean} [refresh] True when we should not get the value from the cache.
     * @return {Promise}          Promise resolved with:
     *                                    - canviewsubmissions: True if user can view submissions, false otherwise.
     *                                    - submissions: Array of submissions.
     */
    self.getSubmissions = function(id, refresh) {
        var params = {
                "assignmentids": [id]
            },
            preSets = {};

        if (refresh) {
            preSets.getFromCache = false;
        }

        return $mmSite.read('mod_assign_get_submissions', params, preSets).then(function(response) {
            // Check if we can view submissions, with enough permissions.
            if (response.warnings.length > 0 && response.warnings[0].warningcode == 1) {
                return {canviewsubmissions: false};
            } else {
                if (response.assignments && response.assignments.length) {
                    return {
                        canviewsubmissions: true,
                        submissions: response.assignments[0].submissions
                    };
                } else {
                    return $q.reject();
                }
            }
        });
    };

    /**
     * Get user data for submissions since they only have userid.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionsUserData
     * @param {Object[]} submissions Submissions to get the data for.
     * @param {Number}   courseid    ID of the course the submissions belong to.
     * @return {Promise}             Promise always resolved. Resolve param is the formatted submissions.
     */
    self.getSubmissionsUserData = function(submissions, courseid) {
        var promises = [];

        angular.forEach(submissions, function(submission) {
            var promise = $mmUser.getProfile(submission.userid, courseid, true).then(function(user) {
                submission.userfullname = user.fullname;
                submission.userprofileimageurl = user.profileimageurl;
            }, function() {
                // Error getting profile, resolve promise without adding any extra data.
            });
            promises.push(promise);
        });
        return $q.all(promises).then(function() {
            return submissions;
        });
    };

    /**
     * Check if assignments plugin is enabled.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#isPluginEnabled
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        return $mmSite.wsAvailable('mod_assign_get_assignments') && $mmSite.wsAvailable('mod_assign_get_submissions');
    };

    return self;
});
