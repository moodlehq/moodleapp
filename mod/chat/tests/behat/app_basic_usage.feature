@mod @mod_chat @app @app_upto3.9.4 @javascript
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
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
    And the following "activities" exist:
      | activity   | name            | intro       | course | idnumber | groupmode |
      | chat       | Test chat name  | Test chat   | C1     | chat     | 0         |

  @app @3.8.0
  Scenario: Receive and send messages & See connected users, beep and talk to
    # Send messages as student1
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test chat name" in the app
    Then I should see "Click here to enter the chat now"
    And I should see "View past chat sessions"

    When I press "Click here to enter the chat now" in the app
    And I set the field "New message" to "Hi!"
    And I press "Send" in the app
    And I set the field "New message" to "I am David"
    And I press "Send" in the app
    Then I should see "Hi!"
    And I should see "I am David"

    # Read messages, view connected users, send beep and reply as student2
    When I enter the app
    And I log in as "student2"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test chat name" in the app
    And I press "Click here to enter the chat now" in the app
    Then I should see "Hi!"
    And I should see "I am David"

    When I press "people" in the app
    Then I should see "david student"

    When I press "Beep" in the app
    Then I should see "You beeped david student"

    When I set the field "New message" to "Hi David, I am Pau."
    And I press "Send" in the app
    Then I should see "Hi David, I am Pau."

  @app @3.8.0
  Scenario: Past sessions shown for >=3.5
    # Send messages as student1
    Given I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test chat name" in the app
    And I press "Click here to enter the chat now" in the app
    And I set the field "New message" to "Hi!"
    And I press "Send" in the app
    And I set the field "New message" to "I am David"
    And I press "Send" in the app

    # Read messages from past sessions as student2
    When I enter the app
    And I log in as "student2"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test chat name" in the app
    And I press "View past chat sessions" in the app
    And I press "Show incomplete sessions" in the app
    And I press "david student (2)" in the app
    Then I should see "Hi!"
    And I should see "I am David"
