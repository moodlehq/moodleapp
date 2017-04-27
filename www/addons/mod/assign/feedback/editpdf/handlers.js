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
 * Handler for editpdf feedback plugin.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignFeedbackEditpdfHandler
 */
.factory('$mmaModAssignFeedbackEditpdfHandler', function($mmaModAssign, $mmFilepool, $q, mmaModAssignComponent) {

    var self = {};

    /**
     * Whether or not the rule is enabled for the site.
     *
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Get the name of the directive to render this plugin.
     *
     * @return {String} Directive name.
     */
    self.getDirectiveName = function() {
        return 'mma-mod-assign-feedback-editpdf';
    };

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Data returned by $mmaModAssign#getSubmissionStatus.
     * @param  {Object} plugin     Plugin.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when prefetch is done.
     */
    self.getPluginFiles = function(assign, submission, plugin, siteId) {
        return $mmaModAssign.getSubmissionPluginAttachments(plugin);
    };

    return self;
})

.run(function($mmAddonManager) {
    // Use addon manager to inject $mmaModAssignFeedbackDelegate. This is to provide an example for remote addons,
    // since they cannot assume that the assign addon will be packaged in custom apps.
    var $mmaModAssignFeedbackDelegate = $mmAddonManager.get('$mmaModAssignFeedbackDelegate');
    if ($mmaModAssignFeedbackDelegate) {
        $mmaModAssignFeedbackDelegate.registerHandler('mmaModAssignFeedbackEditpdf', 'editpdf',
                '$mmaModAssignFeedbackEditpdfHandler');
    }
});
