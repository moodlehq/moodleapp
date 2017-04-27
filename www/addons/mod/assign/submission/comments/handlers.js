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
 * Handler for comments submission plugin.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignSubmissionCommentsHandler
 */
.factory('$mmaModAssignSubmissionCommentsHandler', function($mmComments) {

    var self = {};

    /**
     * Check if the plugin can be edited in offline for existing submissions.
     * In general, this should return false if the plugin uses Moodle filters. The reason is that the app only prefetches
     * filtered data, and the user should edit unfiltered data.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionCommentsHandler#canEditOffline
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission.
     * @param  {Object} plugin     Plugin.
     * @return {Boolean}           Whether the plugin can be edited in offline for existing submissions.
     */
    self.canEditOffline = function(assign, submission, plugin) {
        // This plugin is read only, but return true to prevent blocking the edition.
        return true;
    };

    /**
     * Whether or not the rule is enabled for the site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionCommentsHandler#isEnabled
     * @return {Promise} Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    self.isEnabled = function() {
        return $mmComments.isPluginEnabled();
    };

    /**
     * Whether or not the plugin is enabled for editing in the site.
     * This should return true if the plugin has no submission component (allow_submissions=false),
     * otherwise the user won't be able to edit submissions at all.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionCommentsHandler#isEnabledForEdit
     * @return {Boolean} Whether the plugin is enabled.
     */
    self.isEnabledForEdit = function() {
        return true;
    };

    /**
     * Get the name of the directive to render this plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionCommentsHandler#getDirectiveName
     * @param  {Object} plugin Plugin to get the directive for.
     * @param  {Boolean} edit  True if editing a submission, false if read only.
     * @return {String} Directive name.
     */
    self.getDirectiveName = function(plugin, edit) {
        return edit ? false : 'mma-mod-assign-submission-comments';
    };

    /**
     * Prefetch submission data.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionCommentsHandler#prefetch
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} plugin     Plugin.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when prefetch is done.
     */
    self.prefetch = function(assign, submission, plugin, siteId) {
        return $mmComments.getComments('module', assign.cmid, 'assignsubmission_comments', submission.id,
                    'submission_comments', 0, siteId).catch(function() {
            // Fail silently (Moodle < 3.1.1, 3.2)
        });
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModAssignSubmissionDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the assign addon will be packaged in custom apps.
    var $mmaModAssignSubmissionDelegate = $mmAddonManager.get('$mmaModAssignSubmissionDelegate');
    if ($mmaModAssignSubmissionDelegate) {
        $mmaModAssignSubmissionDelegate.registerHandler('mmaModAssignSubmissionComments', 'comments',
                                '$mmaModAssignSubmissionCommentsHandler');
    }
});
