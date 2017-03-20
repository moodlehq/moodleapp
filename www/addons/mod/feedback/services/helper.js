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
.factory('$mmaModFeedbackHelper', function($ionicHistory, $mmGroups, $translate, $mmSite, $mmUtil, $state, $mmText,
        $mmaModFeedback) {

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
                return getItemFormLabel(item);
            case 'info':
                return getItemFormInfo(item);
            case 'numeric':
                return getItemFormNumeric(item);
            case 'textfield':
                return getItemFormTextfield(item);
            case 'textarea':
                return getItemFormTextarea(item);
            case 'multichoice':
                return getItemFormMultichoice(item);
            case 'multichoicerated':
                return getItemFormMultichoice(item);
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

        // Helper functions by type:
        function getItemFormLabel(item) {
            item.name = "";
            item.template = 'label';
            item.presentation = $mmText.replacePluginfileUrls(item.presentation, item.itemfiles);
            return item;
        }

        function getItemFormInfo(item) {
            var type = parseInt(item.presentation, 10);

            if (type == MODE_COURSE || type == MODE_CATEGORY) {
                item.presentation = item.otherdata;
                item.value = typeof item.value != "undefined" ? item.value : item.otherdata;
            } else if (type == MODE_RESPONSETIME) {
                item.value = typeof item.value != "undefined" ? item.value : new Date().getTime();
                item.presentation = moment(item.value).format($translate.instant('mm.core.dffulldate'));
            } else {
                // Errors on item, return false.
                return false;
            }

            item.template = 'label';

            return item;
        }

        function getItemFormNumeric(item) {
            var range = item.presentation.split(FEEDBACK_LINE_SEP) || [];
            item.rangefrom = range.length > 0 ? parseInt(range[0], 10) || '' : '';
            item.rangeto = range.length > 1 ? parseInt(range[1], 10) || '' : '';
            item.template = 'numeric';
            item.value = typeof item.value != "undefined" ? item.value : "";

            return item;
        }

        function getItemFormTextfield(item) {
            var sizeAndLength = item.presentation.split(FEEDBACK_LINE_SEP) || [];
            item.size = sizeAndLength.length > 0 && sizeAndLength[0] >= 5 ? sizeAndLength[0] : 30;
            item.length = sizeAndLength.length > 1 ? sizeAndLength[1] : 255;
            item.value = typeof item.value != "undefined" ? item.value : "";
            item.template = 'textfield';

            return item;
        }

        function getItemFormTextarea(item) {
            var widthAndHeight = item.presentation.split(FEEDBACK_LINE_SEP) || [];
            item.width = widthAndHeight.length > 0 && widthAndHeight[0] >= 5 ? widthAndHeight[0] : 30;
            item.height = widthAndHeight.length > 1 ? widthAndHeight[1] : 5;
            item.value = typeof item.value != "undefined" ? item.value : "";
            item.template = 'textarea';

            return item;
        }

        function getItemFormMultichoice(item) {
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
                var weightValue = choice.split(FEEDBACK_MULTICHOICERATED_VALUE_SEP) || [''];
                choice = weightValue.length == 1 ? weightValue[0] : '(' + weightValue[0] + ') ' + weightValue[1];
                return {value: index + 1, label: choice};
            });

            if (item.subtype === 'r' && item.options.search(FEEDBACK_MULTICHOICE_HIDENOSELECT) == -1) {
                item.choices.unshift({value: 0, label: $translate.instant('mma.mod_feedback.not_selected')});
                item.value = typeof item.value != "undefined" ? parseInt(item.value, 10) : 0;
            } else if (item.subtype === 'd') {
                item.choices.unshift({value: 0, label: ''});
                item.value = typeof item.value != "undefined" ? parseInt(item.value, 10) : 0;
            } else if (item.subtype === 'c') {
                if (typeof item.value == "undefined") {
                    item.value = "";
                } else {
                    var values = item.value.split(FEEDBACK_LINE_SEP);
                    angular.forEach(item.choices, function(choice) {
                        for (var x in values) {
                            if (choice.value == values[x]) {
                                choice.checked = true;
                                return;
                            }
                        }
                    });
                }
            } else {
                item.value = typeof item.value != "undefined" ? parseInt(item.value, 10) : "";
            }
            item.template = 'multichoice-' + item.subtype;

            return item;
        }
    };

    /**
     * Get a single feedback page items. If offline or server down it will use getItems to calculate dependencies.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackHelper#getPageItems
     * @param   {Number}    feedbackId      Feedback ID.
     * @param   {Number}    page            The page to get.
     * @return  {Promise}                   Promise resolved when the info is retrieved.
     */
    self.getPageItems = function(feedbackId, page) {
        return $mmaModFeedback.getPageItems(feedbackId, page).then(function(response) {
            return fillValues(feedbackId, response.items).then(function(items) {
                response.items = items;
                return response;
            });
        }).catch(function() {
            // If getPageItems fail we should calculate it using getItems.
            return $mmaModFeedback.getItems(feedbackId).then(function(response) {
                return fillValues(feedbackId, response.items).then(function(items) {
                    // Separate items by pages.
                    var pageItems = [],
                        currentPage = 0,
                        previousPageItems = [],

                    pageItems = items.filter(function(item) {
                        // Greater page, discard all entries.
                        if (currentPage > page) {
                            return false;
                        }

                        if (item.typ == "pagebreak") {
                            currentPage++;
                            return false;
                        }

                        // Save items on previous page to check dependencies and discard entry.
                        if (currentPage < page) {
                            previousPageItems.push(item);
                            return false;
                        }

                        // Filter depending items.
                        if (item && item.dependitem > 0 && previousPageItems.length > 0) {
                            return checkDependencyItem(previousPageItems, item);
                        }

                        // Filter items with errors.
                        return item;
                    });

                    // Check if there are more pages.
                    response.hasprevpage = page > 0;
                    response.hasnextpage = currentPage > page;
                    response.items = pageItems;

                    return response;
                });
            });
        });
    };

    /**
     * Check dependency of a question item.
     *
     * @param   {Number}   feedbackId Feedback ID.
     * @param   {Array}    items      Item to fill the value.
     * @return  {Promise}             Resolved with values when done.
     */
    function fillValues(feedbackId, items) {
        return $mmaModFeedback.getCurrentValues(feedbackId).then(function(values) {
            angular.forEach(items, function(itemData) {
                if (!itemData.hasvalue) {
                    return;
                }

                for (var x in values) {
                    if (values[x].item == itemData.id) {
                        itemData.value = values[x].value;
                        return;
                    }
                }
            });
            return items;
        }).catch(function() {
            // Ignore errors.
            return items;
        });
    }

    /**
     * Check dependency of a question item.
     *
     * @param   {Array}     tems       All question items to check dependency.
     * @param   {Number}    item       Item to check.
     * @return  {Boolean}              Return true if dependency is acomplished and it can be shown. False, otherwise.
     */
    function checkDependencyItem(items, item) {
        var depend;
        for (var x in items) {
            if (items[x].id == item.dependitem) {
                depend = items[x];
                break;
            }
        }

        // Item not found, looks like dependent item has been removed or is in the same or following pages.
        if (!depend) {
            return true;
        }

        var value;
        switch (depend.typ) {
            case 'label':
                return false;
            case 'multichoice':
            case 'multichoicerated':
                return compareDependItemMultichoice(depend, item.dependvalue);
        }

        return item.dependvalue == depend.value;

        // Helper functions by type:
        function compareDependItemMultichoice(item, dependValue) {
            var values, choices,
                parts = item.presentation.split(FEEDBACK_MULTICHOICE_TYPE_SEP) || [],
                subtype = parts.length > 0 && parts[0] ? parts[0] : 'r';

            choices = parts[1] || '';
            choices = choices.split(FEEDBACK_MULTICHOICE_ADJUST_SEP)[0] || '';
            choices = choices.split(FEEDBACK_LINE_SEP) || [];


            if (subtype === 'c') {
                if (typeof item.value == "undefined") {
                    values = [''];
                } else {
                    values = item.value.split(FEEDBACK_LINE_SEP);
                }
            } else {
                values = [item.value];
            }

            for (var index = 0; index < choices.length; index++) {
                for (var x in values) {
                    if (values[x] == index + 1) {
                        var value = choices[index];
                        if (item.typ == 'multichoicerated') {
                            value = value.split(FEEDBACK_MULTICHOICERATED_VALUE_SEP)[1] || '';
                        }
                        if (value.trim() == dependValue) {
                            return true;
                        }
                        // We can finish checking if only searching on one value and we found it.
                        if (values.length == 1) {
                            return false;
                        }
                    }
                }
            }
            return false;
        }
    }

    return self;
});
