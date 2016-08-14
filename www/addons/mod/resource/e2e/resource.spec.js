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

describe('User can manage course resource', function() {

    it('User can click resource tab and landing the resource page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function() {
            return MM.clickOn('Osborne:Transference/Counter transference in the Psycho-analysis process');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Osborne:Transference/Counter transference in the Psycho-analysis process');
            expect(MM.getView().getText()).toMatch('Open the file');
        }).then(function() {
            done();
        });
    });

    it('Click Open the file button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function() {
            return MM.clickOn('Osborne:Transference/Counter transference in the Psycho-analysis process');
        }).then(function () {
            return MM.clickOn('Open the file');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Osborne:Transference/Counter transference in the Psycho-analysis process');
        }).then(function() {
            done();
        });
    });

    it('Click secondary button in the resource page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function() {
            return MM.clickOn('Osborne:Transference/Counter transference in the Psycho-analysis process');
        }).then(function () {
            return $('.button.button-icon.ion-ios-browsers-outline').click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Osborne:Transference/Counter transference in the Psycho-analysis process');
            expect(MM.getView().getText()).toMatch('Open the file');
        }).then(function() {
            done();
        });
    });


});

