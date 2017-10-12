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

describe('User can manage course files section', function() {

    it('Click the My files tab in main menu', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My files');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('My files');
        }).then(function() {
            done();
        });
    });

    it('User can land the My files page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My files');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('My files');
            expect(MM.getView().getText()).toMatch('My private files');
            expect(MM.getView().getText()).toMatch('The files that are available in your private area on this Moodle site.');
            expect(MM.getView().getText()).toMatch('Site files');
            expect(MM.getView().getText()).toMatch('The other files that are available to you on this Moodle site.');
        }).then(function() {
            done();
        });
    });

    it('Visit My private files in files page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My files');
        }).then(function() {
            return MM.clickOn('My private files');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('My private files');
            expect(MM.getView().getText()).toMatch('MyPictures');
            expect(MM.getView().getText()).toMatch('My essay notes.odt');
        }).then(function() {
            done();
        });
    });

    it('Click upload button in my private files section', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My files');
        }).then(function() {
            return MM.clickOn('My private files');
        }).then(function() {
            return $('.button.button-icon.ion-plus').click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Upload a file');
            expect(MM.getView().getText()).toMatch('Photo albums');
            expect(MM.getView().getText()).toMatch('Camera');
            expect(MM.getView().getText()).toMatch('Audio');
            expect(MM.getView().getText()).toMatch('Video');
        }).then(function() {
            done();
        });
    });

    it('Click My Pictures tab in my private files section', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My files');
        }).then(function() {
            return MM.clickOn('My private files');
        }).then(function() {
            return MM.clickOn('MyPictures');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('MyPictures');
            expect(MM.getView().getText()).toMatch('LakeDistrictUK.jpg');
        }).then(function() {
            done();
        });
    });

    it('Click essay notes tab in my private files section', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My files');
        }).then(function() {
            return MM.clickOn('My private files');
        }).then(function() {
            return MM.clickOn('My essay notes.odt');
        }).then(function() {
            done();
        });
    });

    it('Visit Site files section in my files page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My files');
        }).then(function() {
            return MM.clickOn('Site files');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Site files');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Art and Media');
            expect(MM.getView().getText()).toMatch('Society and Environment');
            expect(MM.getView().getText()).toMatch('Languages');
            expect(MM.getView().getText()).toMatch('Physical Education');
            expect(MM.getView().getText()).toMatch('Science and Mathematics');
            expect(MM.getView().getText()).toMatch('ICT and Computing');
            expect(MM.getView().getText()).toMatch('Mount Orange Community');
            expect(MM.getView().getText()).toMatch('Moodle Resources');
        }).then(function() {
            done();
        });
    });

});

