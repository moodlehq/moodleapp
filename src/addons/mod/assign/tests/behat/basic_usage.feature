@app_parallel_run_assign @addon_mod_assign @app @mod @mod_assign @javascript
Feature: Test basic usage of assignment activity in app
  In order to participate in the assignment while using the mobile app
  I need basic assignment functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | teacher | teacher1@example.com |
      | student1 | Student | student | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |
    And the following "activities" exist:
      | activity | course | idnumber | name         | intro                        | assignsubmission_onlinetext_enabled | assignfeedback_comments_enabled | duedate                       | attemptreopenmethod | maxattempts |
      | assign   | C1     | assign1  | assignment1  | Test assignment description1 | 1                                   | 1                               | ## 20 August 2002 12:00 PM ## | manual              | -1          |

  Scenario: View assign description, due date & View list of student submissions (as teacher) & View own submission or student submission
    # Create, edit and submit as a student
    Given I entered the assign activity "assignment1" on course "Course 1" as "student1" in the app
    Then the header should be "assignment1" in the app
    And I should find "Test assignment description1" in the app
    And I should find "Due:" in the app
    And I should find "20 August 2002, 12:00 PM" in the app

    When I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test" in the app
    And I press "Save" in the app
    Then I should find "Draft (not submitted)" in the app
    And I should find "Not graded" in the app

    When I press "Edit submission" in the app
    And I set the field "Online text submissions" to "Submission test edited" in the app
    And I press "Save" in the app
    And I press "OK" in the app
    Then I should find "Submission test edited" in the app

    When I press "Submit assignment" in the app
    And I press "OK" in the app
    Then I should find "Submitted for grading" in the app
    And I should find "Not graded" in the app
    And I should find "Submission test edited" in the app

    # View as a teacher
    Given I entered the assign activity "assignment1" on course "Course 1" as "teacher1" in the app
    Then the header should be "assignment1" in the app

    When I press "Submitted" in the app
    Then I should find "Student student" in the app
    And I should find "Not graded" in the app

    When I press "Student student" in the app
    Then I should find "Online text submissions" in the app
    And I should find "Submission test edited" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                                   | activity | activityname | course   |
      | \assignsubmission_onlinetext\event\assessable_uploaded | assign   | assignment1  | Course 1 |
      | \assignsubmission_onlinetext\event\submission_created  | assign   | assignment1  | Course 1 |
      | \assignsubmission_onlinetext\event\submission_updated  | assign   | assignment1  | Course 1 |
      | \mod_assign\event\assessable_submitted                 | assign   | assignment1  | Course 1 |
      | \mod_assign\event\course_module_viewed                 | assign   | assignment1  | Course 1 |
      | \mod_assign\event\statement_accepted                   | assign   | assignment1  | Course 1 |
      | \mod_assign\event\submission_status_viewed             | assign   | assignment1  | Course 1 |
    And the following events should have been logged for "teacher1" in the app:
      | name                                                   | activity | activityname | course   |
      | \mod_assign\event\grading_table_viewed                 | assign   | assignment1  | Course 1 |
      | \mod_assign\event\course_module_viewed                 | assign   | assignment1  | Course 1 |

  Scenario: Edit/Add submission (online text) & Add new attempt from previous submission & Submit for grading
    # Submit first attempt as a student
    Given I entered the assign activity "assignment1" on course "Course 1" as "student1" in the app
    Then I should find "assignment1" in the app

    When I replace "/Assignment is overdue by: .*/" within "addon-mod-assign-submission ion-item.overdue" with "Assignment is overdue by: [Overdue date]"
    Then the UI should match the snapshot

    When I press "Add submission" in the app
    Then I set the field "Online text submissions" to "Submission test 1st attempt" in the app
    And I press "Save" in the app
    And I should find "Draft (not submitted)" in the app
    And I should find "Not graded" in the app
    And I press "Submit assignment" in the app
    And I press "OK" in the app

    # Allow more attempts as a teacher
    Given I entered the assign activity "assignment1" on course "Course 1" as "teacher1" in the app
    When I press "Participants" in the app
    And I press "Student student" in the app
    And I press "Grade" "ion-button" in the app
    Then I should find "1 out of Unlimited" in the app
    When I press "Allow another attempt" in the app
    And I set the field "Feedback comments" to "Maybe next time" in the app
    And I press "Grade" "ion-button" in the app
    Then I should find "Reopened" in the app
    And I should find "Not graded" in the app
    And I should find "Previous attempts" in the app
    When I press "Attempt 1" in the app
    And I should find "Maybe next time" within "Feedback comments" "ion-item" in the app

    # Submit second attempt as a student
    Given I entered the assign activity "assignment1" on course "Course 1" as "student1" in the app
    When I pull to refresh in the app
    Then I should find "Reopened" in the app
    And I should find "Attempt 2" in the app
    And I should find "Add a new attempt based on previous submission" in the app
    And I should find "Add a new attempt" in the app
    And I should find "Previous attempts" in the app
    When I press "Attempt 1" in the app
    Then I should find "Submission test 1st attempt" in the app
    And I should find "Maybe next time" within "Feedback comments" "ion-item" in the app

    When I press "Add a new attempt based on previous submission" in the app
    And I press "OK" in the app
    Then I should find "Submission test 1st attempt" in the app

    When I set the field "Online text submissions" to "Submission test 2nd attempt" in the app
    And I press "Save" in the app
    And I press "OK" in the app
    And I press "Submit assignment" in the app
    And I press "OK" in the app

    # View second attempt as a teacher
    Given I entered the assign activity "assignment1" on course "Course 1" as "teacher1" in the app
    When I press "Participants" in the app
    And I pull to refresh in the app
    And I press "Student student" in the app
    Then I should find "Online text submissions" in the app
    And I should find "Submission test 2nd attempt" in the app

  @lms_from4.5
  Scenario: Remove submission (online text)
    Given I entered the assign activity "assignment1" on course "Course 1" as "student1" in the app
    And I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test" in the app
    And I press "Save" in the app

    When I press "Remove submission" in the app
    And I press "DELETE" in the app
    Then I should find "No attempt" in the app

  Scenario: Add submission offline (online text) & Submit for grading offline & Sync submissions
    Given I entered the course "Course 1" as "student1" in the app
    And I press "assignment1" in the app
    When I press "Add submission" in the app
    And I switch network connection to offline
    And I set the field "Online text submissions" to "Submission test" in the app
    And I press "Save" in the app
    And I press "Submit assignment" in the app
    And I press "OK" in the app
    Then I should find "This Assignment has offline data to be synchronised." in the app

    When I switch network connection to wifi
    And I go back in the app
    And I press "assignment1" in the app
    And I press "Information" in the app
    And I press "Refresh" in the app
    Then I should find "Submitted for grading" in the app
    But I should not find "This Assignment has offline data to be synchronised." in the app

  Scenario: Edit an offline submission before synchronising it
    Given I entered the course "Course 1" as "student1" in the app
    And I press "assignment1" in the app
    When I press "Add submission" in the app
    And I switch network connection to offline
    And I set the field "Online text submissions" to "Submission test original offline" in the app
    And I press "Save" in the app
    Then I should find "This Assignment has offline data to be synchronised." in the app
    And I should find "Submission test original offline" in the app

    When I press "Edit submission" in the app
    And I set the field "Online text submissions" to "Submission test edited offline" in the app
    And I press "Save" in the app
    Then I should find "This Assignment has offline data to be synchronised." in the app
    And I should find "Submission test edited offline" in the app
    But I should not find "Submission test original offline" in the app

    When I press "Submit assignment" in the app
    And I press "OK" in the app
    Then I should find "This Assignment has offline data to be synchronised." in the app

    When I switch network connection to wifi
    And I go back in the app
    And I press "assignment1" in the app
    Then I should find "Submitted for grading" in the app
    And I should find "Submission test edited offline" in the app
    But I should not find "This Assignment has offline data to be synchronised." in the app

  @lms_from4.5
  Scenario: Remove submission offline and syncrhonize it
    Given I entered the course "Course 1" as "student1" in the app
    And I press "assignment1" in the app
    When I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test" in the app
    And I press "Save" in the app
    Then I should find "Draft (not submitted)" in the app

    # Remove submission added online.
    When I switch network connection to offline
    And I press "Remove submission" in the app
    And I press "DELETE" in the app
    Then I should find "No attempt" in the app
    And I should find "This Assignment has offline data to be synchronised." in the app

    # Synchronize submission removal.
    When I switch network connection to wifi
    And I press the back button in the app
    And I press "assignment1" in the app
    Then I should find "No attempt" in the app
    But I should not find "This Assignment has offline data to be synchronised." in the app

    # Remove submission added offline (while offline)
    Given I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test offline" in the app
    And I switch network connection to offline
    And I press "Save" in the app

    When I press "Remove submission" in the app
    And I press "DELETE" in the app
    Then I should find "No attempt" in the app
    But I should not find "This Assignment has offline data to be synchronised." in the app

    # Remove submission added offline (while online before synchronising)
    Given I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test offline" in the app
    And I switch network connection to offline
    And I press "Save" in the app
    And I switch network connection to wifi

    When I press "Remove submission" in the app
    And I press "DELETE" in the app
    Then I should find "No attempt" in the app
    But I should not find "This Assignment has offline data to be synchronised." in the app

  @lms_from4.5
  Scenario: Add submission offline after removing a submission offline
    Given I entered the course "Course 1" as "student1" in the app
    And I press "assignment1" in the app
    When I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test online" in the app
    And I press "Save" in the app
    And I switch network connection to offline
    And I press "Remove submission" in the app
    And I press "DELETE" in the app
    Then I should find "This Assignment has offline data to be synchronised." in the app
    And I should find "No attempt" in the app

    When I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test offline" in the app
    And I press "Save" in the app
    And I press "OK" in the app
    Then I should find "This Assignment has offline data to be synchronised." in the app
    And I should find "Submission test offline" in the app

    When I switch network connection to wifi
    And I go back in the app
    And I press "assignment1" in the app
    Then I should find "Submission test offline" in the app
    But I should not find "This Assignment has offline data to be synchronised." in the app
