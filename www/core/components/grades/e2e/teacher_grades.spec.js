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

describe('User can see course final grade as a teacher', function() {

    it('User can click course grade button as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            return MM.clickOn('Frances Banks');
        }).then(function() {
            return MM.clickOn('View grades');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Grades');
            expect(MM.getView().getText()).toMatch('Psychology in Cinema');
        }).then(function () {
            done();
        });
    });

    it('User can see main content of course grades as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            return MM.clickOn('Frances Banks');
        }).then(function() {
            return MM.clickOn('View grades');
        }).then(function() {
            var width = 900;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Analysis');
            expect(MM.getView().getText()).toMatch('Collaborative');
            expect(MM.getView().getText()).toMatch('Individual');
            expect(MM.getView().getText()).toMatch('Group Project');
        }).then(function () {
            done();
        });
    });

    it('Check the expected final grades of course as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            return MM.clickOn('Frances Banks');
        }).then(function() {
            return MM.clickOn('View grades');
        }).then(function() {
            var width = 900;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Analysis total');
            expect(MM.getView().getText()).toMatch('Collaborative total');
            expect(MM.getView().getText()).toMatch('Individual');
        }).then(function () {
            done();
        });
    });

    it('Check the expected Group Project test grades of course as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            return MM.clickOn('Frances Banks');
        }).then(function() {
            return MM.clickOn('View grades');
        }).then(function() {
            var width = 900;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Group Project');
            expect(MM.getView().getText()).toMatch('60.00 %');
        }).then(function () {
            done();
        });
    });

    it('Check the expected Factual recall test grades of course as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            return MM.clickOn('Frances Banks');
        }).then(function() {
            return MM.clickOn('View grades');
        }).then(function() {
            var width = 900;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Factual recall test');
            expect(MM.getView().getText()).toMatch('8.33 %');
            expect(MM.getView().getText()).toMatch('6.00');
            expect(MM.getView().getText()).toMatch('60.00 %');
            expect(MM.getView().getText()).toMatch('5.00 %');
        }).then(function () {
            done();
        });
    });

    it('Check the expected Dissertation: Fight club test grades of course as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            return MM.clickOn('Frances Banks');
        }).then(function() {
            return MM.clickOn('View grades');
        }).then(function() {
            var width = 900;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Dissertation: Fight');
        }).then(function () {
            done();
        });
    });

    it('Check the expected Dissertation: A Beautiful Mind test grades of course as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            return MM.clickOn('Frances Banks');
        }).then(function() {
            return MM.clickOn('View grades');
        }).then(function() {
            var width = 900;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Dissertation: A Beautiful Mind');
        }).then(function () {
            done();
        });
    });

    it('Check the expected Dissertation: Spider test grades of course as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            return MM.clickOn('Frances Banks');
        }).then(function() {
            return MM.clickOn('View grades');
        }).then(function() {
            var width = 900;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Dissertation: A Beautiful Mind');
        }).then(function () {
            done();
        });
    });

});

