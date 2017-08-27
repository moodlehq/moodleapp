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

describe('User can manage course forum', function() {

    it('Click All sections course forum tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('All sections');
        }).then(function () {
            return MM.clickOn('Announcements from your tutor');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('View course forum windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Announcements from your tutor');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('General news and announcements');
            expect(MM.getView().getText()).toMatch('Group Project');
        }).then(function () {
            return MM.clickOn('General news and announcements');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('General news and announcements');
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('View course Forum grade test windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Forum grade test');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Add a new discussion topic');
            expect(MM.getView().getText()).toMatch('Forum grade test');
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('Add a new discussion topic', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Forum grade test');
        }).then(function () {
            return MM.clickOn('Add a new discussion topic');
        }).then(function() {
            return $('[ng-model="newdiscussion.subject"]').sendKeys('Test Discussion Subject');
        }).then(function() {
            return $('[ng-model="newdiscussion.message"]').sendKeys('Test Discussion Message');
        }).then(function() {
            return $('[ng-click="add()"]').click();
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('Add a new Course discussion', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Analysis');
        }).then(function () {
            return MM.clickOn('Course discussion');
        }).then(function () {
            return MM.clickOn('Add a new discussion topic');
        }).then(function() {
            return $('[ng-model="newdiscussion.subject"]').sendKeys('Test Subject');
        }).then(function() {
            return $('[ng-model="newdiscussion.message"]').sendKeys('Test Message');
        }).then(function() {
            return $('[ng-click="add()"]').click();
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('Discussions about your group projects', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Discussions about your group projects');
        }).then(function () {
            return MM.clickOn('Add a new discussion topic');
        }).then(function() {
            return $('[ng-model="newdiscussion.subject"]').sendKeys('Test Group Projects Subject');
        }).then(function() {
            return $('[ng-model="newdiscussion.message"]').sendKeys('Test Group Projects Message');
        }).then(function() {
            return $('[ng-click="add()"]').click();
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('Click secondary button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Announcements from your tutor');
        }).then(function () {
            return $('.secondary-buttons').click();
        }).then(function() {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

    it('Check that the Course discussion post was successfully created', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Analysis');
        }).then(function () {
            return MM.clickOn('Course discussion');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Test Subject');
            expect(MM.getView().getText()).toMatch('Test Message');
            expect(MM.getView().getText()).toMatch('Barbara Gardner');
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('Check that the discussions about group projects was successfully created', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Discussions about your group projects');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Test Group Projects Subject');
            expect(MM.getView().getText()).toMatch('Test Group Projects Message');
            expect(MM.getView().getText()).toMatch('Barbara Gardner');
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

});

