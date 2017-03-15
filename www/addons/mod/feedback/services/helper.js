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
.factory('$mmaModFeedbackHelper', function($ionicHistory, $mmGroups, $translate, $mmSite, $mmUtil, $state, $mmText, $translate) {

    var self = {},
        MODE_RESPONSETIME = 1,
        MODE_COURSE = 2,
        MODE_CATEGORY = 3,
        FEEDBACK_LINE_SEP = '|',
        FEEDBACK_MULTICHOICE_TYPE_SEP = '>>>>>',
        FEEDBACK_MULTICHOICE_ADJUST_SEP = '<<<<<',
        FEEDBACK_MULTICHOICE_HIDENOSELECT = 'h',
        FEEDBACK_MULTICHOICERATED_VALUE_SEP = '####';

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

    /**
     * Process and returns item to print form.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackHelper#getItemForm
     * @param {Object}  item           Item to process
     * @param {Boolean} preview        Previewing options.
     * @return {Object}       Item processed to show form.
     */
    self.getItemForm = function(item, preview) {
        switch (item.typ) {
            case 'label':
                item.name = "";
                item.template = 'label';
                item.presentation = $mmText.replacePluginfileUrls(item.presentation, item.itemfiles);
                break;
            case 'info':
                var type = parseInt(item.presentation, 10);
                if (type == MODE_COURSE || type == MODE_CATEGORY) {
                    item.presentation = item.otherdata;
                } else if (type == MODE_RESPONSETIME) {
                    item.presentation = moment(new Date().getTime()).format($translate.instant('mm.core.dffulldate'));
                } else {
                    // Errors on item, return false.
                    return false;
                }
                item.template = 'label';
                break;
            case 'numeric':
                var range = item.presentation.split(FEEDBACK_LINE_SEP) || [];
                item.rangefrom = range.length > 0 ? parseInt(range[0], 10) || '' : '',
                item.rangeto = range.length > 1 ? parseInt(range[1], 10) || '' : '',
                item.template = 'numeric';
                break;
            case 'textfield':
                var sizeAndLength = item.presentation.split(FEEDBACK_LINE_SEP) || [];
                item.size = sizeAndLength.length > 0 && sizeAndLength[0] >= 5 ? sizeAndLength[0] : 30,
                item.length = sizeAndLength.length > 1 ? sizeAndLength[1] : 255;
                item.template = 'textfield';
                break;
            case 'textarea':
                var widthAndHeight = item.presentation.split(FEEDBACK_LINE_SEP) || [];
                item.width = widthAndHeight.length > 0 && widthAndHeight[0] >= 5 ? widthAndHeight[0] : 30,
                item.height = widthAndHeight.length > 1 ? widthAndHeight[1] : 5;
                item.template = 'textarea';
                break;
            case 'multichoice':
            case 'multichoicerated':
                var parts = item.presentation.split(FEEDBACK_MULTICHOICE_TYPE_SEP) || [];
                item.subtype = parts.length > 0 && parts[0] ? parts[0] : 'r';
                item.presentation = parts.length > 1 ? parts[1] : '';
                if (item.subtype != 'd') {
                    parts = item.presentation.split(FEEDBACK_MULTICHOICE_ADJUST_SEP) || [];
                    item.presentation = parts.length > 0 ? parts[0] : '';
                    // Horizontal are not supported right now.
                    //item.horizontal = parts.length > 1 && !!parts[1];
                } else {
                    item.class = "item-select";
                }

                item.choices = item.presentation.split(FEEDBACK_LINE_SEP) || [];
                item.choices = item.choices.map(function(choice, index) {
                    var weightValue = choice.split(FEEDBACK_MULTICHOICERATED_VALUE_SEP) || [''],
                    choice = weightValue.length == 1 ? weightValue[0] : '(' + weightValue[0] + ') ' + weightValue[1];
                    return {value: index + 1, label: choice};
                });
                if (item.subtype === 'r' && item.options.search(FEEDBACK_MULTICHOICE_HIDENOSELECT) == -1) {
                    item.choices.unshift({value: 0, label: $translate.instant('mma.mod_feedback.not_selected')});
                }
                item.template = 'multichoice-' + item.subtype;
                break;
            case 'pagebreak':
            case 'captcha':
                if (!preview) {
                    // Captcha is not supported right now because it doesn't make sense (app cannot be used as guest).
                    // Otherwise label will be shown on preview.
                    // Pagebreaks are only used on preview.
                    return false;
                }
                break;
            default:
                return false;
        }
        return item;
    };

    return self;
});
