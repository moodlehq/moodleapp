@addon_mod_chat @app @mod @mod_chat @javascript @lms_upto4.5
Feature: Test basic usage of chat in app
  As a student
  I need basic chat functionality to work

  Background:
    Given the Moodle site is compatible with this feature
    And the following "courses" exist:
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
    And I enable "chat" "mod" plugin
    And the following "activities" exist:
      | activity   | name            | intro       | course | idnumber | groupmode |
      | chat       | Test chat name  | Test chat   | C1     | chat     | 0         |

  Scenario: Receive and send messages & See connected users, beep and talk to
    # Send messages as student1
    Given I entered the chat activity "Test chat name" on course "Course 1" as "student1" in the app
    Then I should find "Enter the chat" in the app
    And I should find "Past sessions" in the app

    When I press "Enter the chat" in the app
    And I set the field "New message" to "Hi!" in the app
    And I press "Send" in the app
    Then I should find "Hi!" in the app

    When I set the field "New message" to "I am David" in the app
    And I press "Send" in the app
    Then I should find "Hi!" in the app
    And I should find "I am David" in the app
    # Confirm leave the page
    And I go back in the app
    And I press "OK" in the app

    # Read messages, view connected users, send beep and reply as student2
    Given I entered the chat activity "Test chat name" on course "Course 1" as "student2" in the app
    And I press "Enter the chat" in the app
    Then I should find "Hi!" in the app
    And I should find "I am David" in the app

    When I press "Users" in the app
    Then I should find "david student" in the app

    When I press "Beep" in the app
    Then I should find "You beeped david student" in the app

    When I set the field "New message" to "Hi David, I am Pau." in the app
    And I press "Send" in the app
    Then I should find "Hi David, I am Pau." in the app
    And the following events should have been logged for "student1" in the app:
      | name                                 | activity | activityname   | course   |
      | \mod_chat\event\course_module_viewed | chat     | Test chat name | Course 1 |
      | \mod_chat\event\message_sent         | chat     | Test chat name | Course 1 |
    And the following events should have been logged for "student2" in the app:
      | name                                 | activity | activityname   | course   |
      | \mod_chat\event\course_module_viewed | chat     | Test chat name | Course 1 |
      | \mod_chat\event\message_sent         | chat     | Test chat name | Course 1 |

  Scenario: Past sessions shown
    # Send messages as student1
    Given I entered the chat activity "Test chat name" on course "Course 1" as "student1" in the app
    When I press "Enter the chat" in the app
    And I set the field "New message" to "Hi!" in the app
    And I press "Send" in the app
    Then I should find "Hi!" in the app

    When I set the field "New message" to "I am David" in the app
    And I press "Send" in the app
    Then I should find "I am David" in the app
    # Confirm leave the page
    And I go back in the app
    And I press "OK" in the app

    # Read messages from past sessions as student2
    Given I entered the chat activity "Test chat name" on course "Course 1" as "student2" in the app
    When I press "Past sessions" in the app
    And I press "Show incomplete sessions" in the app
    And I press "david student" in the app
    Then I should find "Hi!" in the app
    And I should find "I am David" in the app

  Scenario: Prefetch chat
    # Only check that the chat is marked as downloaded to test that lazy handler is working.
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Course downloads" in the app
    And I press "Download" within "Test chat name" "ion-item" in the app
    Then I should find "Downloaded" within "Test chat name" "ion-item" in the app
