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

describe('User can see correctly the list of sections of a course', function() {

    it('User can click course contents button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-course-handler').click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Psychology in Cinema');
        }).then(function () {
            done();
        });
    });

    it('Check the section name tabs, of the course', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-course-handler').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('All sections');
            expect(MM.getView().getText()).toMatch('Course welcome');
            expect(MM.getView().getText()).toMatch('Background information');
            expect(MM.getView().getText()).toMatch('Analysis');
            expect(MM.getView().getText()).toMatch('Group Projects and Individual tasks');
            expect(MM.getView().getText()).toMatch('Reflection and Feedback');
        }).then(function () {
            done();
        });
    });

    it('View All section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-course-handler').click();
        }).then(function() {
            return MM.clickOn('All sections');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Course welcome');
            expect(MM.getView().getText()).toMatch('Message from your tutor:');
            expect(MM.getView().getText()).toMatch('Announcements from your tutor');
            expect(MM.getView().getText()).toMatch('Prior Knowledge assessment');
            expect(MM.getView().getText()).toMatch('Factual recall test');
        }).then(function () {
            done();
        });
    });

    it('Course welcome section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-course-handler').click();
        }).then(function() {
            return MM.clickOn('Course welcome');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Message from your tutor:');
            expect(MM.getView().getText()).toMatch('Announcements from your tutor');
            expect(MM.getView().getText()).toMatch('Prior Knowledge assessment');
            expect(MM.getView().getText()).toMatch('Factual recall test');
            expect(MM.getView().getText()).toMatch('Course chat');
        }).then(function () {
            done();
        });
    });

    it('Background information section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-course-handler').click();
        }).then(function() {
            return MM.clickOn('Background information');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Concepts and Characters');
            expect(MM.getView().getText()).toMatch('Films reading:');
            expect(MM.getView().getText()).toMatch('Useful links');
            expect(MM.getView().getText()).toMatch('Video resources');
            expect(MM.getView().getText()).toMatch('Pyschology reading:');
            expect(MM.getView().getText()).toMatch("Osborne:Transference/Counter transference in the Psycho-analysis process");
        }).then(function () {
            done();
        });
    });

    it('Analysis section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-course-handler').click();
        }).then(function() {
            return MM.clickOn('Analysis');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Course discussion');
            expect(MM.getView().getText()).toMatch("From Concept to Reality: Trauma and Film");
        }).then(function () {
            done();
        });
    });

    it('Group Projects and Individual tasks section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-course-handler').click();
        }).then(function() {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Select your focus film');
            expect(MM.getView().getText()).toMatch('Group Project');
            expect(MM.getView().getText()).toMatch('Dissertation: Fight club');
            expect(MM.getView().getText()).toMatch('Grammar help with your essays');
            expect(MM.getView().getText()).toMatch('Discussions about your group projects');
        }).then(function () {
            done();
        });
    });

    it('Reflection and Feedback section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mm-course-handler').click();
        }).then(function() {
            return MM.clickOn('Reflection and Feedback');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Survey: COLLES');
            expect(MM.getView().getText()).toMatch('Feedback: Psychology in Cinema Evaluation');
            expect(MM.getView().getText()).toMatch('Reflective journal');
        }).then(function () {
            done();
        });
    });

});

