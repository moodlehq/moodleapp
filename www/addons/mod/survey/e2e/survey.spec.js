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

describe('User can manage course survey', function() {

    it('User can click survey tab and landing the survey page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function() {
            return MM.clickOn('Survey: COLLES');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Survey: COLLES');
            expect(MM.getView().getText()).toMatch('Relevance');
        }).then(function() {
            done();
        });
    });

    it('Click the description in the survey page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function() {
            return MM.clickOn('Survey: COLLES');
        }).then(function () {
            return MM.clickOn('This survey is designed to help you reflect on your participation with others in the course.');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('This survey is designed to help you reflect on your participation with others in the course.');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('View the survey questions', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function() {
            return MM.clickOn('Survey: COLLES');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('1 I prefer that my learning focuses on issues that interest me.');
            expect(MM.getView().getText()).toMatch('2 I found that my learning focuses on issues that interest me.');
            expect(MM.getView().getText()).toMatch('3 I prefer that what I learn is important for my professional practice.');
            expect(MM.getView().getText()).toMatch('4 I found that what I learn is important for my professional practice.');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('User can select survey responses', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function() {
            return MM.clickOn('Survey: COLLES');
        }).then(function() {
            var width = 900;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[4]/ion-content/div[1]/mm-loading/div/section/div[2]/div/div/div[2]/select')).click();
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[4]/ion-content/div[1]/mm-loading/div/section/div[2]/div/div/div[2]/select/option[4]')).click();
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Sometimes');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

});

