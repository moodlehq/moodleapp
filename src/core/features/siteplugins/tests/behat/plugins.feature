@app @javascript
Feature: Plugins work properly.

  Background:
    Given the following "users" exist:
      | username         |
      | studentusername  |

  Scenario: See more menu button
    When I enter the app
    And I log in as "studentusername"
    And I press the more menu button in the app
    Then I should find "Moodle App Behat (auto-generated)" in the app

    When I press "Moodle App Behat (auto-generated)" in the app
    Then I should find "studentusername" in the app
