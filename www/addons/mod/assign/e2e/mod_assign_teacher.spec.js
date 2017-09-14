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

describe('User can manage course assign as Teacher', function () {

    it('View assignment as teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Participants');
            expect(MM.getView().getText()).toContain('Submitted');
            expect(MM.getView().getText()).toContain('Needs grading');
        }).then(function () {
            done();
        });
    });

    it('View submission list', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="gotoSubmissionList()"]'));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Brian Franklin');
            done();
        });
    });

    it('View assignments that needs to be graded', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="gotoSubmissionList(mmaModAssignNeedGrading, needsGradingAvalaible)"]'));
        }).then(function () {
            done();
        });
    });

    it('Grade a submission', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="gotoSubmissionList(mmaModAssignSubmissionStatusSubmitted, summary.submissionssubmittedcount)"]'));
        }).then(function () {
            return MM.clickOn('Brian Franklin');
        }).then(function () {
            return MM.clickOnElement($('a[ng-click="changeShowSubmission(false)"]'));
        }).then(function () {
            $('input[ng-model="grade.grade"]').sendKeys(20);
        }).then(function () {
            return MM.clickOnElement($('[ng-click="goToEdit()"]'));
        }).then(function () {
            browser.sleep(10000);
            browser.switchTo().frame($('.cke').$('.cke_inner').$('.cke_contents').$('iframe').click().sendKeys('Good'));
        }).then(function () {
            return MM.clickOnElement($('[ng-click="done()"]'));
        }).then(function () {
            return MM.clickOnElement($('[ng-click="submitGrade()"]'));
        }).then(function () {
            done();
        });
    });

});