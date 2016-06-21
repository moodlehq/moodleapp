/**
 * Created by Supun
 */

describe('User can change App settings', function() {

    it('User can click settings page tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[2]/ion-header-bar/button')).click();
        }).then(function () {
            return MM.clickOn('General');
        }).then(function() {
           return MM.goBack();
        }).then(function () {
           return MM.clickOn('Space usage');
        }).then(function() {
            return MM.goBack();
        }).then(function () {
           return MM.clickOn('Synchronization');
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            return MM.clickOn('About');
        }).then(function() {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

    it('Change general settings', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[2]/ion-header-bar/button')).click();
        }).then(function () {
            return MM.clickOn('General');
        }).then(function () {
            return $('[ng-model="selectedLanguage"]').click();
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[3]/ion-content/div[1]/ul/li[1]/select/option[9]')).click();
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('General');
        }).then(function () {
            return $('[ng-model="selectedLanguage"]').click();
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[2]/ion-content/div[1]/ul/li[1]/select/option[7]')).click();
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('General');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

    it('Change Space usage settings', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[2]/ion-header-bar/button')).click();
        }).then(function () {
            return MM.clickOn('Space usage');
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Change Synchronization settings', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[2]/ion-header-bar/button')).click();
        }).then(function () {
            return MM.clickOn('Synchronization');
            expect(MM.getView().getText()).toMatch('Synchronization settings');
        }).then(function () {
            return $('[ng-click="synchronize(site)"]').click();
            browser.wait($('some-element').isPresent);
        }).then(function(){
            return MM.clickOn("OK");
            done();
        });
    });

    it('Change About settings', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('App settings');
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[2]/ion-header-bar/button')).click();
        }).then(function () {
            return MM.clickOn('About');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Moodle Mobile 3.1.0');
            return MM.goBack();
        }).then(function(){
            done();
        });
    });

});

