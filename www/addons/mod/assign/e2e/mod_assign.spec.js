/**
 * Created by Supun
 */

describe('User can manage course assign', function() {

    it('View course assign windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Analysis');
        }).then(function () {
            return MM.clickOn('From Concept to Reality: Trauma and Film');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('The screening of trauma transcends the narrative');
        }).then(function() {
            done();
        });
    });

    it('Click description tab', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Analysis');
        }).then(function () {
            return MM.clickOn('From Concept to Reality: Trauma and Film');
        }).then(function () {
            return MM.clickOn('The screening of trauma transcends the narrative');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('The screening of trauma transcends the narrative');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Click PDF file tab', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Analysis');
        }).then(function () {
            return MM.clickOn('From Concept to Reality: Trauma and Film');
        }).then(function () {
            return MM.clickOn('ExampleEssay.pdf');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('The screening of trauma transcends the narrative');
        }).then(function() {
            done();
        });
    });

    it('Click Add submission button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Analysis');
        }).then(function () {
            return MM.clickOn('From Concept to Reality: Trauma and Film');
        }).then(function() {
            return MM.clickOn('Add submission');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('The screening of trauma transcends the narrative');
            expect(MM.getView().getText()).toMatch('ExampleEssay.pdf');
        }).then(function () {
            done();
        });
    });

    it('Click secondary button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Analysis');
        }).then(function () {
            return MM.clickOn('From Concept to Reality: Trauma and Film');
        }).then(function () {
            return $('.secondary-buttons').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('The screening of trauma transcends the narrative');
        }).then(function () {
            done();
        });
    });

});

