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

angular.module('mm.addons.mod_lesson')

/**
 * View user retake controller.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc controller
 * @name mmaModLessonUserRetakeCtrl
 */
.controller('mmaModLessonUserRetakeCtrl', function($scope, $stateParams, $mmaModLesson, $q, $mmLang, $mmUtil, $mmSite, $mmUser,
    $mmaModLessonHelper, mmaModLessonComponent) {

    var lessonId = $stateParams.lessonid,
        courseId = $stateParams.courseid,
        userId = $stateParams.userid || $mmSite.getUserId(),
        retakeNumber = $stateParams.retake,
        lesson;

    $scope.courseId = courseId;
    $scope.component = mmaModLessonComponent;

    // Convenience function to get Lesson data.
    function fetchData() {
        return $mmaModLesson.getLessonById(courseId, lessonId).then(function(lessonData) {
            lesson = lessonData;
            $scope.lesson = lesson;

            // Get the retakes overview for all participants.
            return $mmaModLesson.getRetakesOverview(lesson.id);
        }).then(function(data) {
            // Search the student.
            var student;

            if (!data || !data.students.length) {
                return $mmLang.translateAndReject('mma.mod_lesson.cannotfinduser');
            }

            for (var i = 0; i < data.students.length; i++) {
                if (data.students[i].id == userId) {
                    student = data.students[i];
                    break;
                }
            }

            if (!student) {
                return $mmLang.translateAndReject('mma.mod_lesson.cannotfinduser');
            }
            if (!student.attempts || !student.attempts.length) {
                // No retakes.
                return $mmLang.translateAndReject('mma.mod_lesson.cannotfindattempt');
            }

            student.bestgrade = $mmUtil.roundToDecimals(student.bestgrade, 2);
            angular.forEach(student.attempts, function(retake) {
                if (retakeNumber == retake.try) {
                    // The retake specified as parameter exists. Use it.
                    $scope.selectedRetake = retakeNumber;
                }

                retake.label = $mmaModLessonHelper.getRetakeLabel(retake);
            });

            if (!$scope.selectedRetake) {
                // Retake number not specified or not valid, use the last retake.
                $scope.selectedRetake = student.attempts[student.attempts.length - 1].try;
            }

           return $mmUser.getProfile(student.id, courseId, true).then(function(user) {
                student.profileimageurl = user.profileimageurl;
                return student;
            }).catch(function() {
                // Error getting profile, resolve promise without adding any extra data.
                return student;
            });
        }).then(function(student) {
            $scope.student = student;
            return setRetake($scope.selectedRetake);
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error getting data.', true);
            return $q.reject();
        });
    }

    // Set a group to view the reports.
    function setRetake(retakeNumber) {
        $scope.selectedRetake = retakeNumber;

        return $mmaModLesson.getUserRetake(lesson.id, retakeNumber, userId).then(function(data) {

            if (data && data.completed != -1) {
                // Completed.
                data.userstats.grade = $mmUtil.roundToDecimals(data.userstats.grade, 2);
                data.userstats.timetakenReadable = $mmUtil.formatTimeInstant(data.userstats.timetotake);
            }

            angular.forEach(data && data.answerpages, function(page) {
                if ($mmaModLesson.answerPageIsContent(page)) {
                    page.isContent = true;
                    angular.forEach(page.answerdata && page.answerdata.answers, function(answer) {
                        // Content pages only have 1 valid field in the answer array.
                        answer[0] = $mmaModLessonHelper.getContentPageAnswerDataFromHtml(answer[0]);
                    });
                } else if ($mmaModLesson.answerPageIsQuestion(page)) {
                    page.isQuestion = true;
                    angular.forEach(page.answerdata && page.answerdata.answers, function(answer) {
                        // Only the first field of the answer array requires to be parsed.
                        answer[0] = $mmaModLessonHelper.getQuestionPageAnswerDataFromHtml(answer[0]);
                    });
                }
            });

            $scope.retake = data;
        });
    }

    // Refreshes data.
    function refreshData() {
        var promises = [];

        promises.push($mmaModLesson.invalidateLessonData(courseId));
        if (lesson) {
            promises.push($mmaModLesson.invalidateRetakesOverview(lesson.id));
            promises.push($mmaModLesson.invalidateUserRetakesForUser(lesson.id, userId));
        }

        return $q.all(promises).finally(function() {
            return fetchData();
        });
    }

    // Fetch the data.
    fetchData().finally(function() {
        $scope.retakeLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshData = function() {
        return refreshData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Change the retake displayed.
    $scope.setRetake = function(retakeNumber) {
        $scope.retakeLoaded = false;
        return setRetake(retakeNumber).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error getting attempt.');
            return $q.reject();
        }).finally(function() {
            $scope.retakeLoaded = true;
        });
    };
});
