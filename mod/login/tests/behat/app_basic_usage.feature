@mod @mod_login @app @javascript
Feature: Test basic usage of login in app
  I need basic login functionality to work

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | david     | student  |
      | student2 | pau       | student2 |
      | teacher1 | juan      | teacher  |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | teacher1 | C1     | editingteacher |

  Scenario: Add a new site in the app & Site name in displayed when adding a new site
    When I enter the app
    And I press the back button in the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Acceptance test site" in the app

    When I set the field "Username" to "student1" in the app
    And I set the field "Password" to "student1" in the app
    And I press "Log in" near "Forgotten your username or password?" in the app
    Then I should find "Acceptance test site" in the app
    But I should not find "Log in" in the app

  Scenario: Add a non existing site
    When I enter the app
    And I log in as "student1"
    And I press the main menu button in the app
    And I press "Change site" in the app
    And I wait the app to restart
    And I press "Add" in the app
    And I set the field "Your site" to "Wrong Site Address" in the app
    And I press enter in the app
    Then I should find "Cannot connect" in the app
    And I should find "Wrong Site Address" in the app

  Scenario: Delete a site
    When I enter the app
    And I log in as "student1"
    And I press the main menu button in the app
    And I press "Change site" in the app
    And I wait the app to restart
    Then I should find "Acceptance test site" in the app
    And I press "Delete" in the app
    And I press "Delete" near "Acceptance test site" in the app
    And I press "Delete" near "Are you sure you want to delete the site Acceptance test site?" in the app
    Then I should find "Connect to Moodle" in the app
    But I should not find "Acceptance test site" in the app

  Scenario: Require minium version of the app for a site

    # Log in with a previous required version
    Given the following config values are set as admin:
      | minimumversion | 3.8.1 | tool_mobile |
    When I enter the app
    Then I should not find "App update required" in the app

    # Log in with a future required version
    Given the following config values are set as admin:
      | minimumversion | 11.0.0 | tool_mobile |
    When I enter the app
    Then I should find "App update required" in the app
