@core @core_message @app @javascript
Feature: Test messages navigation in the app

  Background:
    Given the following "users" exist:
      | username | firstname  |
      | teacher  | Teacher    |
      | student  | Student    |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user    | course | role           |
      | teacher | C1     | editingteacher |
      | student | C1     | student        |

  Scenario: Avoid recursive links to profile
    Given I entered the app as "teacher"
    When I press "Messages" in the app
    And I press "Contacts" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student" in the app
    And I press "Search" "button" in the app
    And I press "Student" in the app
    And I set the field "New message" to "Hi there" in the app
    And I press "Send" in the app
    Then I should find "Hi there" in the app

    When I press "Display options" in the app
    And I press "User info" in the app
    Then I should find "Details" in the app

    When I press "Message" in the app
    Then I should find "Hi there" in the app

    When I press "Display options" in the app
    Then I should not find "User info" in the app

    When I close the popup in the app
    And I press the back button in the app
    And I press the back button in the app
    Then I should find "Hi there" in the app
