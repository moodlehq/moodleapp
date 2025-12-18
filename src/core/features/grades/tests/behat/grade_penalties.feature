@app_parallel_run_grades @addon_mod_assign @app @mod @mod_assign @javascript @lms_from5.0
Feature: Grade penalties in the gradebook

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
    # Add a submission.
    And the following "mod_assign > submissions" exist:
      | assign                | user      | onlinetext                         |
      | Test assignment name  | student1  | I'm the student first submission   |
    And I am on the "Test assignment name" Activity page logged in as teacher1
    And I go to "Student 1" "Test assignment name" activity advanced grading page
    And I set the following fields to these values:
      | Grade out of 100      | 50 |
      | Notify student        | 0  |
    And I press "Save changes"
    And I log out

 Scenario: View gradebook with grade penalties on a phone
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Grades" in the app
    And I press "Test assignment name" in the app
    Then I should find "Late penalty applied -10.00 marks" within "Test assignment name" "tr" in the app

 Scenario: View gradebook with grade penalties on a tablet
    Given I entered the course "Course 1" as "student1" in the app
    And I change viewport size to "1200x640" in the app
    When I press "Grades" in the app
    Then I should find "Late penalty applied -10.00 marks" within "Test assignment name" "tr" in the app
