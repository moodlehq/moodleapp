@app_parallel_run_legacy_mod @addon_mod_chat @app @mod @mod_chat @javascript @lms_upto4.5
Feature: Test chat navigation

  Background:
    Given the Moodle site is compatible with this feature
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | Student   | first    |
      | student2 | Student   | second   |
    And the following "course enrolments" exist:
      | user     | course | role     |
      | student1 | C1     | student  |
      | student2 | C1     | student  |
    And I enable "chat" "mod" plugin
    And the following "activities" exist:
      | activity   | name            | intro       | course | idnumber | groupmode |
      | chat       | Test chat name  | Test chat   | C1     | chat     | 0         |
    # Create sessions
    # TODO use generator instead
    And I entered the chat activity "Test chat name" on course "Course 1" as "student1" in the app
    And I press "Enter the chat" in the app
    And I set the field "New message" to "Test message" in the app
    And I press "Send" in the app
    Then I should find "Test message" in the app
    # Confirm leave the page
    And I go back in the app
    And I press "OK" in the app

  Scenario: Tablet navigation on chat
    Given I entered the course "Course 1" as "student2" in the app
    And I change viewport size to "1200x640" in the app

    # Sessions
    When I press "Test chat name" in the app
    And I press "Past sessions" in the app
    Then I should find "No sessions found" in the app

    # Sessions — split view
    When I press "Show incomplete sessions" in the app
    Then "Student first" should be selected in the app
    And I should find "Test message" in the app

    When I press "Show incomplete sessions" in the app
    Then I should not find "Student first" in the app
    And I should not find "Test message" in the app
