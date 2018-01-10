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

describe('User can enter course workshop', function () {

    it('View course workshop', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Workshop: Transmediation");
        }).then(function () {
            browser.sleep(5000); // Wait for css to render.
            expect(MM.getNavBar().getText()).toContain("Workshop: Transmediation");
            expect(MM.getView().getText()).toContain('Submission phase');
            expect(MM.getView().getText()).toContain('Instructions for submission');
        }).then(function () {
            done();
        });
    });
});