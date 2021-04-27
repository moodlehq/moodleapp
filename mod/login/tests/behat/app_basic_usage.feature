@mod @mod_login @app @app_upto3.9.4 @javascript
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

  @app @3.8.0
  Scenario: Add a new site in the app & Site name in displayed when adding a new site
    When I enter the app
    And I press the back button in the app
    And I set the field "https://campus.example.edu" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should see "Acceptance test site"

    When I set the field "Username" to "student1" in the app
    And I set the field "Password" to "student1" in the app
    And I press "Log in" near "Forgotten your username or password?" in the app
    Then I should see "Acceptance test site"
    But I should not see "Log in"

  @app @3.8.0
  Scenario: Add a non existing site
    When I enter the app
    And I log in as "student1"
    And I press "menu" in the app
    And I press "Change site" in the app
    And I press "add" in the app
    And I set the field "https://campus.example.edu" to "Wrong Site Address" in the app
    And I press enter in the app
    Then I should see "Cannot connect"
    And I should see "Please check the address is correct."

  @app @3.8.0
  Scenario: Delete a site
    When I enter the app
    And I log in as "student1"
    And I press "menu" in the app
    And I press "Change site" in the app
    Then I should see "Acceptance test site"
    And I press "Delete" in the app
    And I press "trash" in the app
    And I press "Delete" in the app
    Then I should see "Connect to Moodle"
    But I should not see "Acceptance test site"

  @app @3.8.0
  Scenario: Require minium version of the app for a site
    When I enter the app
    And I log in as "teacher1"
    And I press "menu" in the app
    And I press "Website" in the app
    And I switch to the browser tab opened by the app
    And I follow "Log in"
    And I log in as "admin"
    And I press "Side panel"
    And I follow "Site administration"
    And I follow "Mobile authentication"
    And I set the field "Minimum app version required" to "3.8.1"
    And I press "Save changes"
    And I close the browser tab opened by the app
    And I enter the app
    And I log in as "teacher1"
    And I press "menu" in the app
    And I press "Website" in the app
    And I switch to the browser tab opened by the app
    And I follow "Log in"
    And I log in as "admin"
    And I press "Side panel"
    And I follow "Site administration"
    And I follow "Mobile authentication"
    And I set the field "Minimum app version required" to "11.0.0"
    And I press "Save changes"
    And I close the browser tab opened by the app
    And I enter the app
    Then I should see "App update required"
