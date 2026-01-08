@app_parallel_run_assign @addon_mod_assign @app @mod @mod_assign @javascript @lms_from5.0
Feature: Grade penalties in the assignment activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "users" exist:
      | username | firstname | lastname | email                 |
      | teacher1 | Teacher   | 1        | teacher1@example.com  |
      | student1 | Student   | 1        | student10@example.com |
    And the following "course enrolments" exist:
      | user | course | role           |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student        |
    And I enable grade penalties for assignment
    And the following "activity" exists:
      | activity                             | assign                      |
      | course                               | C1                          |
      | name                                 | Test assignment name        |
      | intro                                | Test assignment description |
      | grade                                | 100                         |
      | duedate                              | ##yesterday##               |
      | gradepenalty                         | 1                           |
      | assignsubmission_onlinetext_enabled  | 1                           |
      | submissiondrafts                     | 0                           |
      | maxattempts                          | -1                          |
      | attemptreopenmethod                  | manual                      |
    # Add a submission.
    And the following "mod_assign > submissions" exist:
      | assign                | user      | onlinetext                         |
      | Test assignment name  | student1  | I'm the student first submission   |
    And I am on the "Test assignment name" Activity page logged in as teacher1
    And I go to "Student 1" "Test assignment name" activity advanced grading page
    And I set the following fields to these values:
      | Grade out of 100      | 50 |
      | Notify student        | 0  |
      | Allow another attempt | 1  |
    And I press "Save changes"
    And I log out

  Scenario: View submission with grade penalty as student
    Given I entered the assign activity "Test assignment name" on course "Course 1" as "student1" in the app
    When I press "Attempt 1" in the app
    Then I should find "Late penalty applied -10.00 marks" within "Feedback" "ion-card" in the app
    And I should find "Late penalty applied -10.00 marks" within "Attempt 1" "ion-accordion" in the app

  Scenario: View activity summary with grade penalty as student
    Given I entered the assign activity "Test assignment name" on course "Course 1" as "student1" in the app
    When I press "Information" "ion-button" in the app
    And I press "Grade" "ion-item" in the app
    Then I should find "Late penalty applied -10.00 marks" within "Gradebook" "ion-card" in the app

  Scenario: View submission with grade penalty as teacher
    Given I entered the assign activity "Test assignment name" on course "Course 1" as "teacher1" in the app
    When I press "Participants" in the app
    And I press "Student 1" in the app
    And I press "Attempt 1" in the app
    Then I should find "Late penalty applied -10.00 marks" within "Feedback" "ion-card" in the app
    And I should find "Late penalty applied -10.00 marks" within "Attempt 1" "ion-accordion" in the app

  Scenario: Edit feedback with grade penalty as teacher
    Given I entered the assign activity "Test assignment name" on course "Course 1" as "teacher1" in the app
    When I press "Participants" in the app
    And I press "Student 1" in the app
    And I press "Grade" "ion-button" in the app
    Then I should find "Late penalty applied -10.00 marks" in the app
