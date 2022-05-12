@core @core_course @app @javascript @lms_upto3.10
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

  Scenario: Activity completion, marking the checkbox manually
    Given the following "activities" exist:
      | activity | name         | course | idnumber | completion | completionview |
      | forum    | First forum  | C1     | forum1   | 1          | 0              |
      | forum    | Second forum | C1     | forum2   | 1          | 0              |
    And I entered the course "Course 1" as "student1" in the app
    # Set activities as completed.
    Then I should find "0%" in the app
    And I click on "ion-button[title=\"Not completed: First forum. Select to mark as complete.\"]" "css"
    And I should find "50%" in the app
    And I click on "ion-button[title=\"Not completed: Second forum. Select to mark as complete.\"]" "css"
    And I should find "100%" in the app
    # Set activities as not completed.
    And I click on "ion-button[title=\"Completed: First forum. Select to mark as not complete.\"]" "css"
    And I should find "50%" in the app
    And I click on "ion-button[title=\"Completed: Second forum. Select to mark as not complete.\"]" "css"
    And I should find "0%" in the app
