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

describe('User can attempt quizzes', function() {

    it('Open a quiz', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Grammar help with your essays');
            done();
        });
    });

    it('Attept Quiz', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            return MM.clickOn('Attempt quiz now');
            done();
        });
    });

    it('Continue the last attempt', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            return MM.clickOn('Continue the last attempt');
        }).then(function(){
            return element(by.xpath('/html/body/div[4]/div/div[3]/button')).click();
            done();
        });
    });

    it('Check questions without submitting answer', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            return MM.clickOn('Continue the last attempt');
        }).then(function() {
            return MM.clickOn('Check');
        }).then(function () {
            return MM.clickOn('OK');
            expect(MM.getView().getText()).toMatch('Please select an answer.');
            done();
        });
    });

    it('User can select answer', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            return MM.clickOn('Continue the last attempt');
        }).then(function() {
            return element(by.xpath('//*[@id="mma-mod_quiz-question-1"]/mm-question/div[1]/section/label[1]/label/div/i')).click();
        }).then(function() {
            return element(by.xpath('//*[@id="mma-mod_quiz-question-1"]/mm-question/div[1]/section/label[2]/label/div/i')).click();
        }).then(function() {
            return element(by.xpath('//*[@id="mma-mod_quiz-question-1"]/mm-question/div[1]/section/label[3]/label/div/i')).click();
        }).then(function () {
            return MM.clickOn('Check');
            done();
        });
    });
});

