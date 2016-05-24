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

// Increase Jasmine timeout.
jasmine.DEFAULT_TIMEOUT_INTERVAL = 180000;

/**
 * Before each it().
 */
beforeEach(function() {

    if (ISBROWSER) {
        // Set the window.
        if (ISTABLET) {
          browser.driver.manage().window().setSize(1024, 768);
        } else {
          browser.driver.manage().window().setSize(400, 640);
        }

        // Open the main URL.
        browser.driver.get(DEVICEURL);
    }

    // Wait for the login page.
    return browser.driver.wait(function() {
      return browser.driver.isElementPresent(by.id('mm-login-site')).then(function(e) {
        return e === true;
      });
    }, 50000);
});
