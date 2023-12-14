@app @javascript
Feature: It navigates properly using deep links.

  Background:
    Given the following "users" exist:
      | username |
      | student1 |
      | student2 |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student2 | C1     | student |
    And the following "activities" exist:
      | activity   | name       | intro       | course | idnumber |
      | forum      | Test forum | Test forum  | C1     | forum    |
    And the following forum discussions exist in course "Course 1":
      | forum      | user     | name        | message       |
      | Test forum | student1 | Forum topic | Forum message |
    And the following config values are set as admin:
      | forcelogout     | 1 | tool_mobile |
      | defaulthomepage | 0 |             |

  Scenario: Receive a push notification
    Given I entered the app as "student2"
    When I log out in the app
    And I press "Add" in the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I log in as "student1"
    And I click a push notification in the app for:
      | username | module | discussion  |
      | student2 | forum  | Forum topic |
    And I wait the app to restart
    Then I should find "Reconnect" in the app

    When I set the field "Password" to "student2" in the app
    And I press "Log in" in the app
    Then I should find "Forum topic" in the app
    And I should find "Forum message" in the app
    But I should not find "Site home" in the app

    When I press the back button in the app
    Then I should find "Site home" in the app
    But I should not find "Forum topic" in the app
    And I should not find "Forum message" in the app

  Scenario: Open a link with a custom URL
    When I launch the app
    And I open a custom link in the app for:
      | discussion  |
      | Forum topic |
    And I log in as "student1"
    And I wait loading to finish in the app
    Then I should find "Forum topic" in the app
    And I should find "Forum message" in the app
    But I should not find "Site home" in the app

    When I press the back button in the app
    Then I should find "Site home" in the app
    But I should not find "Forum topic" in the app
    And I should not find "Forum message" in the app

  Scenario: Open a link with a custom URL that calls WebServices for a logged out site
    Given I entered the app as "student2"
    When I log out in the app
    And I open a custom link in the app for:
      | forum      |
      | Test forum |
    Then I should find "Reconnect" in the app

    When I set the field "Password" to "student2" in the app
    And I press "Log in" in the app
    Then I should find "Test forum" in the app

    When I press the back button in the app
    Then I should find "Site home" in the app
    But I should not find "Test forum" in the app
