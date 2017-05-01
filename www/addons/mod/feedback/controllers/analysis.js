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
 * Feedback analysis controller.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc controller
 * @name mmaModFeedbackAnalysisCtrl
 */
.controller('mmaModFeedbackAnalysisCtrl', function($scope, $stateParams, $mmaModFeedback, $mmUtil, $q, $mmCourse, $mmText, $mmApp,
            mmaModFeedbackComponent, $mmEvents, $translate, $mmGroups, mmCoreEventOnlineStatusChanged, $mmaModFeedbackHelper,
            $ionicHistory) {
    var feedbackId = $stateParams.feedbackid,
        module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        feedback;

    $scope.title = $stateParams.title;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('feedback');
    $scope.courseId = courseId;
    $scope.refreshIcon = 'spinner';
    $scope.component = mmaModFeedbackComponent;
    $scope.componentId = module.id;
    $scope.selectedGroup = $stateParams.group || 0;
    $scope.chartOptions = {
        'legend': {
            'display': true,
            'position': 'bottom',
            'labels': {
                'generateLabels': function(chart) {
                    var data = chart.data;
                    if (data.labels.length && data.labels.length) {
                        var datasets = data.datasets[0];
                        return data.labels.map(function(label, i) {
                            return {
                                text: label + ': ' + datasets.data[i],
                                fillStyle: datasets.backgroundColor[i],
                                // Below is extra data used for toggling the datasets
                                datasetIndex: i
                            };
                        });
                    } else {
                        return [];
                    }
                }
            }
        }
    };

    // Convenience function to get feedback data.
    function fetchFeedbackAnalysisData(refresh, showErrors) {
        $scope.isOnline = $mmApp.isOnline();
        return $mmaModFeedback.getFeedback(courseId, module.id).then(function(feedbackData) {
            feedback = feedbackData;

            $scope.title = feedback.name || $scope.title;
            $scope.description = feedback.intro;

            $scope.feedback = feedback;

            return $mmaModFeedback.getFeedbackAccessInformation(feedback.id);
        }).then(function(accessData) {
            $scope.access = accessData;

            if (accessData.canviewanalysis) {
                // Get groups (only for teachers).
                return $mmaModFeedbackHelper.getFeedbackGroupInfo(feedback.coursemodule).then(function(groupInfo) {
                    $scope.groupInfo = groupInfo;
                    return $scope.setGroup($scope.selectedGroup);
                });
            } else {
                $ionicHistory.goBack();
            }
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData();
            }

            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function(){
            $scope.feedbackLoaded = true;
        });
    }

    // Set group to see the analysis.
    $scope.setGroup = function(groupId) {
        $scope.selectedGroup = groupId;

        return $mmaModFeedback.getAnalysis(feedback.id, groupId).then(function(analysis) {
            var number = 1;
            $scope.items = analysis.itemsdata.map(function(item) {
                // Move data inside item.
                item.item.data = item.data;
                item = item.item;
                item.number = number++;
                if (item.data && item.data.length) {
                    return parseAnalysisInfo(item);
                }
                return false;
            }).filter(function(item) {
                return item;
            });

            $scope.warning = "";
            if (analysis.warnings.length) {
                for (var x in analysis.warnings) {
                    var warning = analysis.warnings[x];
                    if (warning.warningcode == 'insufficientresponsesforthisgroup') {
                        $scope.warning = warning.message;
                    }
                }
            }

            $scope.feedback.completedCount = analysis.completedcount;
            $scope.feedback.itemsCount = analysis.itemscount;
        });
    };

    // Parse the analysis info to show the info correctly formatted.
    function parseAnalysisInfo(item) {
        switch (item.typ) {
            case 'numeric':
                item.average = item.data.reduce(function (prev, current) {
                    return prev + current;
                }) / item.data.length;
                item.template = 'numeric';
                break;

            case 'info':
                item.data = item.data.map(function(dataItem) {
                    dataItem = $mmText.parseJSON(dataItem);
                    return typeof dataItem.show != "undefined" ? dataItem.show : false;
                }).filter(function(dataItem) {
                    // Filter false entries.
                    return dataItem;
                });
            case 'textfield':
            case 'textarea':
                item.template = 'list';
                break;

            case 'multichoicerated':
            case 'multichoice':
                item.data = item.data.map(function(dataItem) {
                    dataItem = $mmText.parseJSON(dataItem);
                    return typeof dataItem.answertext != "undefined" ? dataItem : false;
                }).filter(function(dataItem) {
                    // Filter false entries.
                    return dataItem;
                });

                // Format labels.
                item.labels = item.data.map(function(dataItem) {
                    dataItem.quotient = parseFloat(dataItem.quotient * 100).toFixed(2);
                    var label = "";

                    if (typeof dataItem.value != "undefined") {
                        label = '(' + dataItem.value + ') ';
                    }
                    label += dataItem.answertext;
                    label += dataItem.quotient > 0 ? ' (' + dataItem.quotient + '%)' : "";
                    return label;
                });
                item.chartData = item.data.map(function(dataItem) {
                    return dataItem.answercount;
                });

                if (item.typ == 'multichoicerated') {
                    item.average = item.data.reduce(function (prev, current) {
                        return prev + current.avg;
                    }, 0.0);
                }

                var subtype = item.presentation.charAt(0);
                item.single = subtype != 'c';

                item.template = 'chart';
                break;
        }

        return item;
    }

    // Convenience function to refresh all the data.
    function refreshAllData(showErrors) {
        var promises = [];
        promises.push($mmaModFeedback.invalidateFeedbackData(courseId));
        if (feedback) {
            promises.push($mmaModFeedback.invalidateFeedbackAccessInformationData(feedback.id));
            promises.push($mmaModFeedback.invalidateAnalysisData(feedback.id));
            promises.push($mmGroups.invalidateActivityAllowedGroups(feedback.coursemodule));
            promises.push($mmGroups.invalidateActivityGroupMode(feedback.coursemodule));
        }

        return $q.all(promises).finally(function() {
            return fetchFeedbackAnalysisData(true, showErrors);
        });
    }

    fetchFeedbackAnalysisData().finally(function() {
        $scope.refreshIcon = 'ion-refresh';
    });

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModFeedbackComponent, module.id);
    };

    // Pull to refresh.
    $scope.refreshFeedback = function(showErrors) {
        if ($scope.feedbackLoaded) {
            $scope.refreshIcon = 'spinner';
            return refreshAllData(showErrors).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Function to link implemented features.
    $scope.openFeature = function(feature) {
        $mmaModFeedbackHelper.openFeature(feature, module, courseId, $scope.selectedGroup);
    };

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });
});