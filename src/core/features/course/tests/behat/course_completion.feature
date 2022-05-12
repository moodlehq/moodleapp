@core @core_course @app @javascript
Feature: Check course completion feature.
  In order to track the progress of the course on mobile device
  As a student
  I need to be able to update the activity completion status.

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | enablecompletion |
      | Course 1 | C1        | 0        | 1                |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |

  @lms_from3.11
  Scenario: Activity completion, marking the checkbox manually
    Given the following "activities" exist:
      | activity | name         | course | idnumber | completion | completionview |
      | forum    | First forum  | C1     | forum1   | 1          | 0              |
      | forum    | Second forum | C1     | forum2   | 1          | 0              |
    And I entered the course "Course 1" as "student1" in the app
    # Set activities as completed.
    Then I should find "0%" in the app
    And I press "Mark First forum as done" in the app
    And I should find "50%" in the app
    And I press "Mark Second forum as done" in the app
    And I should find "100%" in the app
    # Set activities as not completed.
    And I press "First forum is marked as done. Press to undo." in the app
    And I should find "50%" in the app
    And I press "Second forum is marked as done. Press to undo." in the app
    And I should find "0%" in the app
