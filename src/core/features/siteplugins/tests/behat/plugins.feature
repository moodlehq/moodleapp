@app_parallel_run_siteplugins @core_siteplugins @app @javascript
Feature: Plugins work properly.

  Background:
    Given the following "users" exist:
      | username         |
      | studentusername  |

  Scenario: See more menu button
    Given I entered the app as "studentusername"
    When I press the more menu button in the app
    Then I should find "Moodle App Behat (auto-generated)" in the app

    When I press "Moodle App Behat (auto-generated)" in the app
    Then I should find "studentusername" in the app

  Scenario: Use lifecycle hooks
    Given I entered the app as "studentusername"
    When I press the more menu button in the app
    And I press "Moodle App Behat (auto-generated)" in the app
    Then I should find "Lifecycle hook called" in the app

  Scenario: Use Angular directives
    Given I entered the app as "studentusername"
    When I press the more menu button in the app
    And I press "Moodle App Behat (auto-generated)" in the app
    And I set the field "the Ultimate Question" to "42" in the app
    Then I should find "That is correct!" in the app
