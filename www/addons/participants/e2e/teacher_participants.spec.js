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

describe('User can see more options in participants section as a teacher', function() {

    it('User can see different options in student user', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Barbara Gardner');
        }).then(function() {
            return MM.clickOn('Barbara Gardner');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Send message');
        }).then(function() {
            var width = 500;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
            expect(MM.getView().getText()).toMatch('Remove contact');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Block contact');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('View grades');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Add a new note');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('View course report');
        }).then(function () {
            done();
        });
    });

    it('User can see different options in teacher user', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[2]/div[2]/a[2]')).click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Barbara Gardner');
        }).then(function() {
            var width = 500;
            var height =1800;
            browser.driver.manage().window().setSize(width, height);
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Jeffrey Sanders');
        }).then(function() {
            return MM.clickOn('Jeffrey Sanders');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Email');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('jeffreysanders199@example.com');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Phone');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('9999 0226');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Mobile');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('0414 991 9921');
        }).then(function () {
            done();
        });
    });

});