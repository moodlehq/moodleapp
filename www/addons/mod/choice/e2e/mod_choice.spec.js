/**
 * Created by Supun
 */

describe('User can manage course choice', function() {

    it('Click All sections course choice tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('All sections');
        }).then(function () {
            return MM.clickOn('Prior Knowledge assessment');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('State your prior knowledge here:');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn("Let's make a date!");
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Please choose the best day and time for our next evening session. You can choose more than one if');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Click Course welcome course choice tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Prior Knowledge assessment');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('State your prior knowledge here:');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn("Let's make a date!");
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Please choose the best day and time for our next evening session. You can choose more than one if');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Click Group Projects and Individual tasks course choice tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Select your focus film');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Select here the film you wish to do your in depth group study on.');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('User can manage Prior Knowledge assessment choices', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Prior Knowledge assessment');
        }).then(function() {
            return MM.clickOn('State your prior knowledge here:');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('State your prior knowledge here:');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            return MM.clickOn('I have studied this ');
        }).then(function() {
            return MM.clickOn('I have a good working knowledge ');
        }).then(function() {
            return MM.clickOn('I have some knowledge');
        }).then(function() {
            return MM.clickOn('I am a complete beginner');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it("User can manage Let's make a date! assessment choices", function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn("Let's make a date!");
        }).then(function() {
            return MM.clickOn('Please choose the best day and time for our next evening session.');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Please choose the best day and time for our next evening session.');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            return MM.clickOn('Friday at 18.00');
        }).then(function() {
            return MM.clickOn('Monday at 17.30');
        }).then(function() {
            return MM.clickOn('Wednesday at 19.00');
        }).then(function() {
            return $('[ng-click="save()"]').click();
        }).then(function() {
            return MM.clickOn('Cancel');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it("User can manage Group Projects and Individual tasks assessment choices", function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn("Group Projects and Individual tasks");
        }).then(function() {
            return MM.clickOn('Select your focus film');
        }).then(function() {
            return MM.clickOn('Select here the film you wish to do your in depth group study on.');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Select here the film you wish to do your in depth group study on.');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Click secondary button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn("Group Projects and Individual tasks");
        }).then(function() {
            return MM.clickOn('Select your focus film');
        }).then(function () {
            return $('.secondary-buttons').click();
        }).then(function() {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

});

