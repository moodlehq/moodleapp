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

describe('User can see correctly the list of sections of a course', function () {

    it('User can click course contents button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Psychology in Cinema');
        }).then(function () {
            done();
        });
    });

    it('Check the section name tabs, of the course', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            expect(MM.getView().getText()).toContain('All sections');
            expect(MM.getView().getText()).toContain('Course welcome');
            expect(MM.getView().getText()).toContain('Background information');
            expect(MM.getView().getText()).toContain('Analysis');
            expect(MM.getView().getText()).toContain('Group Projects and Individual tasks');
            expect(MM.getView().getText()).toContain('Reflection and Feedback');
        }).then(function () {
            done();
        });
    });

    it('View All section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('All sections');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Course welcome');
            expect(MM.getView().getText()).toContain('Message from your tutor:');
            expect(MM.getView().getText()).toContain('Announcements from your tutor');
            expect(MM.getView().getText()).toContain('Prior Knowledge assessment');
            expect(MM.getView().getText()).toContain('Factual recall test');
        }).then(function () {
            done();
        });
    });

    it('Visit an activity from All Sections tab', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('All sections');
        }).then(function () {
            return MM.clickOn('One approach to digital literacy');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('1. Models of digital literacy');
        }).then(function () {
            done();
        });
    });

    it('Course welcome section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Message from your tutor:');
            expect(MM.getView().getText()).toContain('Announcements from your tutor');
            expect(MM.getView().getText()).toContain('Prior Knowledge assessment');
            expect(MM.getView().getText()).toContain('Factual recall test');
            expect(MM.getView().getText()).toContain('Course chat');
        }).then(function () {
            done();
        });
    });

    it('Background information section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Concepts and Characters');
            expect(MM.getView().getText()).toContain('Films reading:');
            expect(MM.getView().getText()).toContain('Useful links');
            expect(MM.getView().getText()).toContain('Video resources');
        }).then(function () {
            done();
        });
    });

    it('Analysis section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Analysis');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Course discussion');
            expect(MM.getView().getText()).toContain("From Concept to Reality: Trauma and Film");
        }).then(function () {
            done();
        });
    });

    it('Group Projects and Individual tasks section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Select your focus film');
            expect(MM.getView().getText()).toContain('Group Project');
            expect(MM.getView().getText()).toContain('Dissertation: Fight club');
            expect(MM.getView().getText()).toContain('Grammar help with your essays');
        }).then(function () {
            done();
        });
    });

    it('Reflection and Feedback section tab content', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Survey: COLLES');
            expect(MM.getView().getText()).toContain('Feedback: Psychology in Cinema Evaluation');
            expect(MM.getView().getText()).toContain('Reflective journal');
        }).then(function () {
            done();
        });
    });

});

