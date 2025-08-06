@addon_mod_assign @app @mod @mod_assign @javascript @lms_from5.1
Feature: Activities overview for assign activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | Username  | 1        |
      | student2 | Username  | 2        |
      | student3 | Username  | 3        |
      | student4 | Username  | 4        |
      | student5 | Username  | 5        |
      | student6 | Username  | 6        |
      | student7 | Username  | 7        |
      | student8 | Username  | 8        |
      | teacher1 | Teacher   | T        |
    And the following "courses" exist:
      | fullname | shortname | groupmode |
      | Course 1 | C1        | 1         |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | student3 | C1     | student        |
      | student4 | C1     | student        |
      | student5 | C1     | student        |
      | student6 | C1     | student        |
      | student7 | C1     | student        |
      | student8 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name           | course | idnumber | duedate              | assignsubmission_onlinetext_enabled | assignsubmission_file_enabled | submissiondrafts |
      | assign   | Date assign    | C1     | assign1  | ##1 Jan 2040 08:00## | 1                                   | 0                             | 0                |
      | assign   | No submissions | C1     | assign2  | ##tomorrow noon##    | 1                                   | 0                             | 0                |
      | assign   | Pending grades | C1     | assign3  |                      | 1                                   | 0                             | 0                |
    And the following "mod_assign > submissions" exist:
      | assign         | user     | onlinetext                          |
      | Date assign    | student1 | This is a submission for assignment |
      | Pending grades | student1 | This is a submission for assignment |
      | Pending grades | student2 | This is a submission for assignment |
    And the following "grade grades" exist:
      | gradeitem      | user     | grade |
      | Pending grades | student1 | 50    |

  Scenario: Teachers can see relevant columns in the assign overview
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Activities" in the app
    And I press "Assignments" in the app
    And I press "Date assign" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "1 of 8" within "Submissions" "ion-item" in the app

    When I press "Grade" within "Actions" "ion-item" in the app
    Then the header should be "Date assign" in the app

    When I go back in the app
    And I press "No submissions" "ion-item" in the app
    Then I should find "Tomorrow" within "Due date" "ion-item" in the app
    And I should find "0 of 8" within "Submissions" "ion-item" in the app
    And I should be able to press "View" within "Actions" "ion-item" in the app

    When I press "Pending grades" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "2 of 8" within "Submissions" "ion-item" in the app
    And I should be able to press "Grade" within "Actions" "ion-item" in the app

  Scenario: The assign overview actions has information about the number of pending elements to grade
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Activities" in the app
    And I press "Assignments" in the app
    And I press "Date assign" "ion-item" in the app
    Then I should find "Grade" within "Actions" "ion-item" in the app
    And I should find "1" within "Grade" "ion-button" in the app

    When I press "Pending grades" "ion-item" in the app
    Then I should find "Grade" within "Actions" "ion-item" in the app
    And I should find "2" within "Grade" "ion-button" in the app

    # Validate alert badge updates.
    When the following "grade grades" exist:
      | gradeitem      | user     | grade |
      | Date assign    | student1 | 50    |
      | Pending grades | student1 | 50    |
    And I pull to refresh in the app
    And I press "Assignments" in the app
    And I press "Date assign" "ion-item" in the app
    Then I should find "View" within "Actions" "ion-item" in the app
    And I should not find "Grade" within "Actions" "ion-item" in the app
    And I should not find "1" within "Actions" "ion-item" in the app

    When I press "Pending grades" "ion-item" in the app
    Then I should find "Grade" within "Actions" "ion-item" in the app
    And I should find "1" within "Grade" "ion-button" in the app

  Scenario: The assign overview actions has different label action based on assignment configuration
    Given the following "activity" exists:
      | course                              | C1            |
      | activity                            | assign        |
      | name                                | Feedback only |
      | idnumber                            | assign4       |
      | submissiondrafts                    | 0             |
      | assignsubmission_onlinetext_enabled | 1             |
      | assignfeedback_comments_enabled     | 1             |
      | assignfeedback_editpdf_enabled      | 1             |
    And the following "activity" exists:
      | course                              | C1            |
      | activity                            | assign        |
      | name                                | Neither grading nor feedback |
      | idnumber                            | assign5       |
      | submissiondrafts                    | 0             |
      | assignsubmission_onlinetext_enabled | 1             |
      | assignfeedback_comments_enabled     | 0             |
      | assignfeedback_editpdf_enabled      | 0             |
    And the following "mod_assign > submissions" exist:
      | assign                       | user     | onlinetext                              |
      | Feedback only                | student1 | Feedback only assignment                |
      | Neither grading nor feedback | student1 | Neither grading nor feedback submission |
    And I am on the "Feedback only" "assign activity editing" page logged in as "teacher1"
    And I expand all fieldsets
    And I set the field "grade[modgrade_type]" to "None"
    And I press "Save and return to course"
    And I am on the "Neither grading nor feedback" "assign activity editing" page
    And I expand all fieldsets
    And I set the field "grade[modgrade_type]" to "None"
    And I press "Save and return to course"
    And I entered the course "Course 1" as "teacher1" in the app

    When I press "Activities" in the app
    And I press "Assignments" in the app
    And I press "Date assign" "ion-item" in the app
    Then I should find "Grade" within "Actions" "ion-item" in the app

    When I press "Feedback only" "ion-item" in the app
    Then I should find "View" within "Actions" "ion-item" in the app
    And I should find "1 of 8" within "Submissions" "ion-item" in the app

    When I press "Neither grading nor feedback" "ion-item" in the app
    Then I should find "View" within "Actions" "ion-item" in the app
    And I should find "1 of 8" within "Submissions" "ion-item" in the app

  Scenario: Students can see relevant columns in the assign overview
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Assignments" in the app
    And I press "Date assign" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "Submitted for grading" within "Submission status" "ion-item" in the app
    And I should find "-" within "Grade" "ion-item" in the app

    When I press "No submissions" "ion-item" in the app
    Then I should find "Tomorrow" within "Due date" "ion-item" in the app
    And I should find "No submission" within "Submission status" "ion-item" in the app
    And I should find "-" within "Grade" "ion-item" in the app

    When I press "Pending grades" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "Submitted for grading" within "Submission status" "ion-item" in the app
    And I should find "50.00" within "Grade" "ion-item" in the app
