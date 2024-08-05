@addon_mod_assign @app @javascript
Feature: Test marking workflow in assignment activity in app

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher   | teacher  | teacher1@example.com |
      | student1 | Student1  | student1 | student1@example.com |
      | student2 | Student2  | student2 | student2@example.com |
      | student3 | Student3  | student3 | student3@example.com |
      | student4 | Student4  | student4 | student4@example.com |
      | student5 | Student5  | student5 | student5@example.com |
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
      | student5 | C1     | student |
    And the following "groups" exist:
      | name    | course | idnumber |
      | Group 1 | C1     | G1       |
      | Group 2 | C1     | G2       |
      | Group 3 | C1     | G3       |
    And the following "group members" exist:
      | user     | group |
      | student1 | G1    |
      | student2 | G1    |
      | student3 | G2    |
      | student4 | G3    |
    And the following "activities" exist:
      | activity | course | idnumber | name         | assignsubmission_onlinetext_enabled | assignfeedback_comments_enabled | markingworkflow | teamsubmission | groupmode | submissiondrafts |
      | assign   | C1     | assign1  | Group Assign | 1                                   | 1                               | 1               | 1              | 1         | 0                |
    And the following "mod_assign > submissions" exist:
      | assign  | user      | onlinetext |
      | assign1 | student1  | Lorem      |
      | assign1 | student3  | Ipsum      |
      | assign1 | student4  | Dolor      |
    # Mark submissions.
    And I am on the "Group Assign" "assign activity" page logged in as teacher1
    And I follow "View all submissions"
    And I change window size to "large"
    And I click on "Grade" "link" in the "Student1" "table_row"
    And I set the field "Grade out of 100" to "50"
    And I set the field "Marking workflow state" to "In review"
    And I set the field "Feedback comments" to "Great job! Lol, not really."
    And I set the field "Notify student" to "0"
    And I press "Save changes"
    And I am on the "Group Assign" "assign activity" page
    And I follow "View all submissions"
    And I click on "Grade" "link" in the "Student3" "table_row"
    And I set the field "Grade out of 100" to "30"
    And I set the field "Marking workflow state" to "Released"
    And I set the field "Feedback comments" to "Needs to be improved."
    And I set the field "Notify student" to "0"
    And I press "Save changes"
    And I log out

  Scenario: View submissions with marking workflow and using points as teacher
    Given I entered the assign activity "Group Assign" on course "Course 1" as "teacher1" in the app
    When I press "Groups" in the app
    Then I should find "Submitted for grading" within "Student1" "ion-item" in the app
    And I should find "In review" within "Student1" "ion-item" in the app
    And I should find "Submitted for grading" within "Student2" "ion-item" in the app
    And I should find "In review" within "Student2" "ion-item" in the app
    And I should find "Submitted for grading" within "Student3" "ion-item" in the app
    And I should find "Released" within "Student3" "ion-item" in the app
    And I should find "Submitted for grading" within "Student4" "ion-item" in the app
    And I should find "Not marked" within "Student4" "ion-item" in the app
    And I should find "No submission" within "Student5" "ion-item" in the app
    And I should not find "Not marked" within "Student5" "ion-item" in the app

    When I press "Student1" in the app
    And I press "Grade" in the app
    Then I should find "Submitted for grading" in the app
    And I should find "50 / 100" within "Current grade in assignment" "ion-item" in the app
    And I should find "-" within "Current grade in gradebook" "ion-item" in the app
    And I should find "In review" within "Marking workflow state" "ion-item" in the app
    And the field "Grade out of 100" matches value "50" in the app
    And I should not find "Graded by" in the app

    When I press the back button in the app
    And I press "Student3" in the app
    And I press "Grade" in the app
    Then I should find "Submitted for grading" in the app
    And I should find "30" within "Current grade in gradebook" "ion-item" in the app
    And I should find "Released" within "Marking workflow state" "ion-item" in the app
    And I should find "Teacher teacher" within "Graded by" "ion-item" in the app
    And the field "Grade out of 100" matches value "30" in the app
    And I should not find "Current grade in assignment" in the app

  Scenario: Grade submissions with marking workflow and using points
    Given I entered the assign activity "Group Assign" on course "Course 1" as "teacher1" in the app
    And I press "Groups" in the app
    And I press "Student1" in the app
    And I press "Grade" in the app
    When I set the field "Grade out of 100" to "60" in the app
    And I press "Done" in the app
    And I wait loading to finish in the app
    And I press "Student1" in the app
    And I press "Grade" in the app
    Then I should find "60 / 100" within "Current grade in assignment" "ion-item" in the app
    And I should find "-" within "Current grade in gradebook" "ion-item" in the app
    And I should find "In review" within "Marking workflow state" "ion-item" in the app
    And the field "Grade out of 100" matches value "60" in the app

    When I press the back button in the app
    And I press "Student3" in the app
    And I press "Grade" in the app
    When I set the field "Grade out of 100" to "80" in the app
    And I press "Done" in the app
    And I wait loading to finish in the app
    And I press "Student3" in the app
    And I press "Grade" in the app
    Then I should find "80" within "Current grade in gradebook" "ion-item" in the app
    And I should find "Released" within "Marking workflow state" "ion-item" in the app
    And I should find "Teacher teacher" within "Graded by" "ion-item" in the app
    And the field "Grade out of 100" matches value "80" in the app
    And I should not find "Current grade in assignment" in the app
