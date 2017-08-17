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

describe('User can manage course label content', function () {

    it('View course label in course content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            expect(MM.getView().getText()).toContain('This course explores Digital Literacy');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Extra resources');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Useful links to take your learning further.');
        }).then(function () {
            done();
        });
    });

});

