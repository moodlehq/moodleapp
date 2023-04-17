@mod @mod_assign @app @javascript
Feature: Test marking workflow in assignment activity in app

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher   | teacher  | teacher1@example.com |
      | student1 | Student1  | student1 | student1@example.com |
      | student2 | Student2  | student2 | student2@example.com |
      | student3 | Student3  | student3 | student3@example.com |
      | student4 | Student4  | student4 | student4@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student |
      | student2 | C1     | student |
      | student3 | C1     | student |
      | student4 | C1     | student |
      And the following "groups" exist:
      | name    | course | idnumber |
      | Group 1 | C1     | G1       |
      | Group 2 | C1     | G2       |
    And the following "group members" exist:
      | user     | group |
      | student1 | G1    |
      | student2 | G1    |
      | student3 | G2    |
    And the following "activities" exist:
      | activity | course | idnumber | name         | assignsubmission_onlinetext_enabled | assignfeedback_comments_enabled | markingworkflow | teamsubmission | groupmode | submissiondrafts |
      | assign   | C1     | assign1  | Group Assign | 1                                   | 1                               | 1               | 1              | 1         | 0                |
    And the following "mod_assign > submissions" exist:
      | assign  | user      | onlinetext |
      | assign1 | student1  | Lorem      |
      | assign1 | student3  | Ipsum      |
    # Mark a submission.
    And I am on the "Group Assign" "assign activity" page logged in as teacher1
    And I follow "View all submissions"
    And I click on "Grade" "link" in the "Student1" "table_row"
    And I set the field "Grade out of 100" to "50"
    And I set the field "Marking workflow state" to "In review"
    And I set the field "Feedback comments" to "Great job! Lol, not really."
    And I set the field "Notify student" to "0"
    And I press "Save changes"
    And I log out

  Scenario: View submissions with marking workflow as teacher
    Given I entered the assign activity "Group Assign" on course "Course 1" as "teacher1" in the app
    And I press "Groups" in the app
    Then I should find "Submitted for grading" within "Student1" "ion-item" in the app
    And I should find "In review" within "Student1" "ion-item" in the app
    And I should find "Submitted for grading" within "Student2" "ion-item" in the app
    And I should find "In review" within "Student2" "ion-item" in the app
    And I should find "Submitted for grading" within "Student3" "ion-item" in the app
    And I should find "Not marked" within "Student3" "ion-item" in the app
    And I should find "No submission" within "Student4" "ion-item" in the app
    And I should not find "Not marked" within "Student4" "ion-item" in the app
