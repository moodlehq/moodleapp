@app @javascript
Feature: It navigates properly after receiving push notifications.

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
      | forcelogout | 1 | tool_mobile |

  Scenario: Open a forum push notification
    When I enter the app
    And I log in as "student2"
    And I press the main menu button in the app
    And I press "Log out" in the app
    And I press "Add" in the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I log in as "student1"
    And I receive a forum push notification for:
      | username | course | module | discussion  |
      | student2 | C1     | forum  | Forum topic |
    Then I should find "Reconnect" in the app

    When I set the field "Password" to "student2" in the app
    And I press "Log in" in the app
    Then I should find "Forum topic" in the app
    And I should find "Forum message" in the app
