@mod @mod_chat @app @javascript
Feature: Test basic usage of chat in app
  As a student
  I need basic chat functionality to work

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
    And the following "activities" exist:
      | activity   | name            | intro       | course | idnumber | groupmode |
      | chat       | Test chat name  | Test chat   | C1     | chat     | 0         |

    @app @3.8.0 @OK
    Scenario: Receive and send messages, see connected users, beep and talk to
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test chat name" in the app
    Then I should see "Click here to enter the chat now"
    And I should see "View past chat sessions"
    And I press "Click here to enter the chat now" in the app
    And I set the field "New message" to "Hi!"
    And I press "Send" in the app
    And I set the field "New message" to "I am David"
    And I press "Send" in the app
    When I enter the app
    And I log in as "student2"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test chat name" in the app
    And I press "Click here to enter the chat now" in the app
    Then I should see "Hi!"
    And I should see "I am David"
    And I press "people" in the app
    Then I should see "david student"
    And I press "Beep" in the app
    Then I should see "You beeped david student"
    And I set the field "New message" to "Hi David, I am Pau."
    And I press "Send" in the app

    @app @3.8.0 @OK
    Scenario: Past sessions shown for >=3.5
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test chat name" in the app
    Then I should see "Click here to enter the chat now"
    And I should see "View past chat sessions"
    And I press "Click here to enter the chat now" in the app
    And I set the field "New message" to "Hi!"
    And I press "Send" in the app
    And I set the field "New message" to "I am David"
    And I press "Send" in the app
    When I enter the app
    And I log in as "student2"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test chat name" in the app
    Then I should see "Click here to enter the chat now"
    And I should see "View past chat sessions"
    And I press "View past chat sessions" in the app
    And I press "Show incomplete sessions" in the app
    And I press "david student (2)" in the app
    Then I should see "Hi!"
    And I should see "I am David"