@app @javascript @core_reminders @lms_from4.0
Feature: Set a new reminder on activity

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | student  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
    And the following "activities" exist:
      | activity | course               | idnumber  | name          | allowsubmissionsfromdate | duedate               |
      | assign   | C1                   | assign01  | Assignment 01 | ## yesterday ##          | ## now +70 minutes ## |
      | assign   | C1                   | assign02  | Assignment 02 | ## yesterday ##          | ## 1 January 2050 ##  |

  Scenario: Add, delete and update reminder on activity
    Given I entered the assign activity "Assignment 01" on course "Course 1" as "student1" in the app

    Then I should not find "Set a reminder for \"Assignment 01\" (Opened)" in the app
    And I should find "Set a reminder for \"Assignment 01\" (Due)" in the app
    And "Set a reminder for \"Assignment 01\" (Due)" should not be selected in the app

    # Default set
    When I press "Set a reminder for \"Assignment 01\" (Due)" in the app
    Then I should find "Reminder set for " in the app
    And "Set a reminder for \"Assignment 01\" (Due)" should be selected in the app

    # Set from list
    When I press "Set a reminder for \"Assignment 01\" (Due)" in the app
    Then I should find "Set a reminder" in the app
    And "At the time of the event" should be selected in the app
    And "1 hour before" should not be selected in the app
    When I press "1 hour before" in the app
    Then I should find "Reminder set for " in the app
    And "Set a reminder for \"Assignment 01\" (Due)" should be selected in the app

    # Custom set
    When I press "Set a reminder for \"Assignment 01\" (Due)" in the app
    Then I should find "Set a reminder" in the app
    And "At the time of the event" should not be selected in the app
    And "1 hour before" should be selected in the app
    When I press "Custom..." in the app
    Then I should find "Custom reminder" in the app
    When I set the following fields to these values in the app:
       | Value | 4 |
       | Units | minutes |
    And I press "Set reminder" in the app
    Then I should find "Reminder set for " in the app
    And "Set a reminder for \"Assignment 01\" (Due)" should be selected in the app

    # Remove
    When I press "Set a reminder for \"Assignment 01\" (Due)" in the app
    Then "4 minutes before" should be selected in the app
    When I press "Delete reminder" in the app
    Then I should find "Reminder deleted" in the app
    And "Set a reminder for \"Assignment 01\" (Due)" should not be selected in the app

    # Set and check reminder
    When I press "Set a reminder for \"Assignment 01\" (Due)" in the app
    Then I should find "Reminder set for " in the app
    When I press "Set a reminder for \"Assignment 01\" (Due)" in the app
    And I press "Custom..." in the app
    Then I should find "Custom reminder" in the app
    When I set the following fields to these values in the app:
       | Value | 69 |
       | Units | minutes |
    And I press "Set reminder" in the app
    Then I should find "Reminder set for " in the app
    When I wait "50" seconds
    Then a notification with title "Due: Assignment 01" is present in the app
    And I close a notification with title "Due: Assignment 01" in the app

    # Set and check reminder is cancelled
    When I press "Set a reminder for \"Assignment 01\" (Due)" in the app
    And I press "Custom..." in the app
    Then I should find "Custom reminder" in the app
    When I set the following fields to these values in the app:
       | Value | 68 |
       | Units | minutes |
    And I press "Set reminder" in the app
    Then I should find "Reminder set for " in the app
    When I press "Set a reminder for \"Assignment 01\" (Due)" in the app
    Then I should find "Reminder set for " in the app
    When I press "Delete reminder" in the app
    Then I should find "Reminder deleted" in the app
    When I wait "50" seconds
    Then a notification with title "Due: Assignment 01" is not present in the app

  Scenario: Check toast is correct
    Given I entered the assign activity "Assignment 02" on course "Course 1" as "student1" in the app

    When I press "Set a reminder for \"Assignment 02\" (Due)" in the app
    Then I should find "Reminder set for " in the app

    When I press "Set a reminder for \"Assignment 02\" (Due)" in the app
    And I press "1 day before" in the app
    Then I should find "Reminder set for Friday, 31 December 2049, 12:00 AM" in the app
