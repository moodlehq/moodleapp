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

describe('User can see course final grade', function() {

    it('User can click course grade button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-grades-mine-handler').click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Grades');
            expect(MM.getView().getText()).toMatch('Psychology in Cinema');
        }).then(function () {
            done();
        });
    });

    it('User can see main content of course grades', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-grades-mine-handler').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Analysis');
            expect(MM.getView().getText()).toMatch('Collaborative');
            expect(MM.getView().getText()).toMatch('Individual');
        }).then(function () {
            done();
        });
    });

    it('Check the expected final grades of course', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-grades-mine-handler').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Analysis total');
            expect(MM.getView().getText()).toMatch('Group Project -');
            expect(MM.getView().getText()).toMatch('Collaborative total');
        }).then(function () {
            done();
        });
    });

});

