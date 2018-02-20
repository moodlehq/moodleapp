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

describe('User can see New staff induction test as a teacher', function () {

    it('User can see New staff induction page', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('New staff induction');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('New staff induction');
            expect(MM.getView().getText()).toContain('All sections');
            expect(MM.getView().getText()).toContain('Welcome');
            expect(MM.getView().getText()).toContain('Policies and Procedures');
            expect(MM.getView().getText()).toContain('IT skills');
        }).then(function () {
            done();
        });
    });

    it('User can click Welcome tab', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('New staff induction');
        }).then(function () {
            return MM.clickOn('Welcome');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Welcome');
            expect(MM.getView().getText()).toContain('Welcome');
            expect(MM.getView().getText()).toContain('Welcome to this short new staff induction course.');
            expect(MM.getView().getText()).toContain('Induction Q and A');
        }).then(function () {
            done();
        });
    });

    it('User can click Policies and Procedures tab', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('New staff induction');
        }).then(function () {
            return MM.clickOn('Policies and Procedures');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Policies and Procedures');
            expect(MM.getView().getText()).toContain('Health and Safety');
            expect(MM.getView().getText()).toContain('Staff leave policy quiz');
            expect(MM.getView().getText()).toContain('Dress code');
            expect(MM.getView().getText()).toContain('Internet Usage policy');
        }).then(function () {
            done();
        });
    });

    it('User can click IT skills tab', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('New staff induction');
        }).then(function () {
            return MM.clickOn('IT skills');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('IT skills');
            expect(MM.getView().getText()).toContain('Your presentational skills');
            expect(MM.getView().getText()).toContain('Email task');
            expect(MM.getView().getText()).toContain('Spreadsheet basics');
        }).then(function () {
            done();
        });
    });

});