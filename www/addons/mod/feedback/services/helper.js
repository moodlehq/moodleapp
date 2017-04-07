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

angular.module('mm.addons.mod_feedback')

/**
 * Helper to gather some common functions for feedback.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc service
 * @name $mmaModFeedbackHelper
 */
.factory('$mmaModFeedbackHelper', function($ionicHistory, $mmGroups, $translate, $mmSite, $mmUtil, $state) {

    var self = {};

    /**
     * Get activity feedback group info to be shown on templates.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackHelper#getFeedbackGroupInfo
     * @param  {Number} cmId        Course Module Id of the feedback.
     * @return {Object}             Containing the group info related to the activity.
     */
    self.getFeedbackGroupInfo = function(cmId) {
        var groupInfo = {};

        return $mmGroups.getActivityGroupMode(cmId).then(function(groupMode) {
            if (groupMode === $mmGroups.SEPARATEGROUPS || groupMode === $mmGroups.VISIBLEGROUPS) {
                groupInfo.separateGroups = groupMode === $mmGroups.SEPARATEGROUPS;
                groupInfo.visibleGroups = groupMode === $mmGroups.VISIBLEGROUPS;
                return $mmGroups.getActivityAllowedGroups(cmId);
            }
            return [];
        }).then(function (groups) {
            if (groups.length <= 0) {
                groupInfo.separateGroups = false;
                groupInfo.visibleGroups = false;
            } else {
                groupInfo.groups = [
                    {'id': 0, 'name': $translate.instant('mm.core.allparticipants')}
                ];
                groupInfo.groups = groupInfo.groups.concat(groups);
            }
            return groupInfo;
        });
    };

    /**
     * Helper function to open a feature in the app.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackHelper#openFeature
     * @param {String}  feature          Name of the feature to open.
     * @param {Object}  module           Course module activity object.
     * @param {Number}  courseId         Course Id.
     * @param {Boolean} [notImplemented] If not implemented the browser will be opened. Temporary.
     */
    self.openFeature = function(feature, module, courseId, notImplemented) {
        if (notImplemented) {
            $mmUtil.openInApp($mmSite.getURL() + '/mod/feedback/' + feature + '.php?id=' + module.id);
            return;
        }

        var pageName = feature ? 'site.mod_feedback-' + feature : 'site.mod_feedback',
            backTimes = getHistoryBackCounter(pageName, module.instance);

        if (backTimes < 0) {
            // Go back X times until the the page we want to reach.
            $ionicHistory.goBack(backTimes);
        } else {
            // Not found, open new state.
            var stateParams = {
                module: module,
                moduleid: module.id,
                courseid: courseId,
                feedbackid: module.instance
            };
            $state.go(pageName, stateParams);
        }

        // Check if the page we are going to open is in the history and returns the number of states to go back.
        function getHistoryBackCounter(pageName, feedbackId) {
            var view, historyInstance, backTimes = 0,
                backViewId = $ionicHistory.currentView().backViewId;

            while (backViewId) {
                view = $ionicHistory.viewHistory().views[backViewId];

                if (!view.stateName.startsWith('site.mod_feedback')) {
                    break;
                }

                historyInstance = view.stateParams.feedbackid ? view.stateParams.feedbackid : view.stateParams.module.instance;

                // Check we are not changing to another feedback.
                if (historyInstance && historyInstance == feedbackId) {
                    backTimes--;
                } else {
                    break;
                }

                backViewId = view.backViewId;

                // Page found.
                if (view.stateName == pageName) {
                    break;
                }
            }

            return backTimes;
        }
    };

    return self;
});
