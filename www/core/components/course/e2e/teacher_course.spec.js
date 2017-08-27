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

describe('User can see more options in course content section as a teacher', function() {

    it('User can see different options in Group Projects and Individual tasks as a teacher  ', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return MM.clickOn('Psychology in Cinema');
        }).then(function() {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Select your focus film');
            expect(MM.getView().getText()).toMatch('Group Project');
            expect(MM.getView().getText()).toMatch('Dissertation: Fight club');
            expect(MM.getView().getText()).toMatch('Dissertation: A Beautiful Mind');
            expect(MM.getView().getText()).toMatch('Dissertation: Spider');
            expect(MM.getView().getText()).toMatch('Grammar help with your essays');
            expect(MM.getView().getText()).toMatch('Discussions about your group projects');
        }).then(function () {
            done();
        });
    });

});