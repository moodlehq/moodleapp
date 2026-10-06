@app_parallel_run_assign @addon_mod_assign @app @mod @mod_assign @javascript @lms_from5.3 @_file_upload
Feature: In an assignment, teachers can provide feedback comments and files on student submissions
  In order to provide feedback to students on their assignments
  As a teacher,
  I need to create feedback comments and files against their submissions.

  Background:
    Given the Moodle site is compatible with this feature
    And the following "courses" exist:
      | fullname | shortname | category | groupmode |
      | Course 1 | C1 | 0 | 0 |
    And the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | 1 | teacher1@example.com |
      | teacher2 | Teacher | 2 | teacher2@example.com |
      | student1 | Student | 1 | student1@example.com |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | teacher |
      | teacher2 | C1 | editingteacher |
      | student1 | C1 | student |
    And the following "activity" exists:
      | activity                            | assign        |
      | course                              | C1            |
      | idnumber                            | A1            |
      | name                                | Assignment 1  |
      | section                             | 1             |
      | completion                          | 1             |
      | markingworkflow                     | 1             |
      | markingallocation                   | 1             |
      | markercount                         | 2             |
      | assignfeedback_comments_enabled     | 1             |
      | assignfeedback_file_enabled         | 1             |
    And the following "mod_assign > submissions" exist:
      | assign        | user      | onlinetext                   |
      | Assignment 1  | student1  | I'm the student1 submission  |
    And the following "mod_assign > marker_allocations" exist:
      | assign       | user          | marker      |
      | Assignment 1 | student1      | teacher1    |
      | Assignment 1 | student1      | teacher2    |
    And the following "role capability" exists:
      | role                              | editingteacher |
      | mod/assign:managerestrictedgrades | allow          |
    # Marker 1 (Teacher 1) leaves their personalised feedback comment.
    And I am on the "A1" "assign activity" page logged in as teacher1
    And I change window size to "large"
    And I go to "Student 1" "Assignment 1" activity advanced marking page
    And I set the field "Feedback comments" to "Feedback from marker one."
    And I upload "mod/assign/feedback/file/tests/fixtures/feedback.txt" file to "Feedback files" filemanager
    And I set the field "Marking workflow state" to "Marking completed"
    And I press "Save changes"
    # Marker 2 (Teacher 2) leaves their personalised feedback comment.
    And I am on the "A1" "assign activity" page logged in as teacher2
    And I change window size to "large"
    And I go to "Student 1" "Assignment 1" activity advanced marking page
    And I set the field "Feedback comments" to "Feedback from marker two."
    And I set the field "Marking workflow state" to "Marking completed"
    And I press "Save changes"

    # Release the grade so the student can view the feedback.
    And I am on the "A1" "assign activity" page
    And I navigate to "Submissions" in current page administration
    And I click on "Grade actions" "actionmenu" in the "Student 1" "table_row"
    And I choose "Grade" in the open action menu
    And I set the following fields to these values:
      | Grade out of 100       | 50 |
      | Feedback comments      | I'm the teacher feedback |
      | Marking workflow state | Released |
    And I press "Save changes"

  Scenario: Students should see personalised feedback comments from each marker in a multi-marker assignment
    # The student views their assignment and should see each marker's comment under a personalised label.
    Given I entered the assign activity "Assignment 1" on course "Course 1" as "student1" in the app
    Then I should find "I'm the teacher feedback" in the app
    And I should find "Teacher 1" in the app
    And I should find "Teacher 2" in the app

    When I press "Feedback comments" in the app
    And I should find "Marker comment (Teacher 1)" in the app
    And I should find "Feedback from marker one." in the app
    And I should find "Marker comment (Teacher 2)" in the app
    And I should find "Feedback from marker two." in the app
    And I should find "Overall comment" in the app
    And I should find "I'm the teacher feedback" in the app
    And I close the popup in the app
    And I should find "Marker file (Teacher 1)" in the app
    And I should find "feedback.txt" in the app
    But I should not find "Marker file (Teacher 2)" in the app

  Scenario: Students should see anonymised feedback comments in a multi-marker assignment if grader identities are hidden
    Given I am on the "A1" "assign activity" page logged in as teacher2
    And I follow "Settings"
    And I expand all fieldsets
    And I set the field "Hide grader identity from students" to "1"
    And I set the field "Update agreed grades" to "Keep current agreed grades"
    And I press "Save and display"

    # The student views their assignment and should see each marker's comment under a personalised label.
    Given I entered the assign activity "Assignment 1" on course "Course 1" as "student1" in the app
    Then I should find "I'm the teacher feedback" in the app
    And I should not find "Teacher 1" in the app
    And I should not find "Teacher 2" in the app

    When I press "Feedback comments" in the app
    Then I should find "Marker 1 comment" in the app
    And I should find "Feedback from marker one." in the app
    And I should find "Marker 2 comment" in the app
    And I should find "Feedback from marker two." in the app
    And I should find "Overall comment" in the app
    And I should find "I'm the teacher feedback" in the app
    But I should not find "Marker comment (Teacher 1)" in the app
    And I should not find "Marker comment (Teacher 2)" in the app

    When I close the popup in the app
    Then I should find "Marker 1 file" in the app
    And I should find "feedback.txt" in the app
    But I should not find "Marker 2 file" in the app
    And I should not find "Marker file (Teacher 1)" in the app
    And I should not find "Marker file (Teacher 2)" in the app
