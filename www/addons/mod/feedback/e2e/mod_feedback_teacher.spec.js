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

describe('User can manage feedback as a Teacher', function () {

    it('View Feedback overview as Teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Self-reflection');
        }).then(function () {
            return MM.clickOn('Your views on this course');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Your views on this course');
        }).then(function () {
            done();
        });
    });

    it('View Feedback responses as Teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Self-reflection');
        }).then(function () {
            return MM.clickOn('Your views on this course');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="access.canviewreports && openFeature(\'respondents\')"]'));
        }).then(function () {
            return MM.clickOn('Barbara Gardner');
        }).then(function () {
            expect(MM.getNavBar().getText()).toContain('Barbara Gardner');
            expect(MM.getView().getText()).toContain('Good');
        }).then(function () {
            done();
        });
    });

    it('View Feedback analysis as Teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Self-reflection');
        }).then(function () {
            return MM.clickOn('Your views on this course');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="setTab(DISPLAY_ANALYSIS)"]'));
        }).then(function () {
            expect($('.chart.chart-doughnut').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

    it('See Feedback non-respondents as Teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Self-reflection');
        }).then(function () {
            return MM.clickOn('Your views on this course');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="openFeature(\'nonrespondents\')"]'));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Donna Taylor');
            expect(MM.getView().getText()).toContain('Non respondents students');
        }).then(function () {
            done();
        });
    });

});