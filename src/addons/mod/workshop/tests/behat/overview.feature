@addon_mod_workshop @app @mod @mod_workshop @javascript @lms_from5.1
Feature: Activities overview for workshop activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | Student   | 1        |
      | student2 | Student   | 2        |
      | student3 | Student   | 3        |
      | student4 | Student   | 4        |
      | student5 | Student   | 5        |
      | student6 | Student   | 6        |
      | student7 | Student   | 7        |
      | student8 | Student   | 8        |
      | teacher1  | Teacher  | T        |
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
      | activity | name       | course | idnumber  | submissiontypetext | submissiontypefile | grade | gradinggrade | gradedecimals | overallfeedbackmethod | latesubmissions | submisstionstart     | submissionend        |
      | workshop | Activity 1 | C1     | workshop1 | 2                  | 1                  | 100   | 5            | 1             | 2                     | 1               | ##1 Jan 2018 08:00## | ##1 Jan 2040 08:00## |
      | workshop | Activity 2 | C1     | workshop1 | 2                  | 1                  | 100   | 5            | 1             | 2                     | 1               | ##today noon##       | ##tomorrow noon##    |

  Scenario: Students can see relevant columns in the workshop overview
    # Workshop is not compatible with grade generators (hopefully someday).
    Given I am on the "Course 1" "grades > Grader report > View" page logged in as "teacher1"
    And I turn editing mode on
    And I change window size to "large"
    And I click on "Activity 1 (submission)" "core_grades > grade_actions" in the "Student 1" "table_row"
    And I choose "Edit grade" in the open action menu
    And I set the following fields to these values:
      | Overridden  | 1                      |
      | Final grade | 10                     |
    And I press "Save changes"
    And I click on "Activity 1 (assessment)" "core_grades > grade_actions" in the "Student 1" "table_row"
    And I choose "Edit grade" in the open action menu
    And I set the following fields to these values:
      | Overridden  | 1                      |
      | Final grade | 20                     |
    And I press "Save changes"
    And I change window size to "medium"
    And I am on the "Activity 1" "workshop activity" page
    And I change phase in workshop "Activity 1" to "Submission phase"
    And I entered the course "Course 1" as "student1" in the app

    When I press "Activities" in the app
    And I press "Workshops" in the app
    And I press "Activity 1" "ion-item" in the app
    Then I should find "Submission phase" in the app
    And I should find "1 January 2040" within "Phase deadline" "ion-item" in the app
    And I should find "10.00" within "Submission grade" "ion-item" in the app
    And I should find "5.00" within "Assessment grade" "ion-item" in the app
    But I should not find "Actions" in the app

    When I press "Activity 2" "ion-item" in the app
    Then I should find "Setup phase" in the app
    And I should find "-" within "Phase deadline" "ion-item" in the app
    And I should find "-" within "Submission grade" "ion-item" in the app
    And I should find "-" within "Assessment grade" "ion-item" in the app

  Scenario: Teachers can see relevant columns in the workshop overview
    Given I log in as "teacher1"
    And I am on the "C1" course page logged in as teacher1
    And I edit assessment form in workshop "Activity 1" as:
      | id_description__idx_0_editor | Aspect1 |
      | id_description__idx_1_editor |         |
      | id_description__idx_2_editor |         |
    And I change phase in workshop "Activity 1" to "Submission phase"
    # Change activity 2 to submission phase to see due date.
    And I am on the "Activity 2" "workshop activity" page
    And I change phase in workshop "Activity 2" to "Submission phase"
    # student1 submits
    And I am on the "Activity 1" "workshop activity" page logged in as student1
    And I add a submission in workshop "Activity 1" as:
      | Title              | Submission1  |
      | Submission content | Some content |
    # teacher1 allocates reviewers and changes the phase to assessment
    When I am on the "Activity 1" "workshop activity" page logged in as teacher1
    And I allocate submissions in workshop "Activity 1" as:
      | Participant | Reviewer  |
      | Student 1   | Student 2 |
      | Student 1   | Student 3 |
      | Student 1   | Student 4 |
    And I am on the "Activity 1" "workshop activity" page
    And I change phase in workshop "Activity 1" to "Assessment phase"
    # student2 assesses work of student1
    And I am on the "Activity 1" "workshop activity" page logged in as student2
    And I assess submission "Student 1" in workshop "Activity 1" as:
      | grade__idx_0            | 10 / 10   |
      | peercomment__idx_0      | Amazing   |
      | Feedback for the author | Good work |
    # student3 assesses work of student1
    And I am on the "Activity 1" "workshop activity" page logged in as student3
    And I assess submission "Student 1" in workshop "Activity 1" as:
      | grade__idx_0            | 10 / 10   |
      | peercomment__idx_0      | Amazing   |
      | Feedback for the author | Good work |
    # student4 assesses work of student1
    And I am on the "Activity 1" "workshop activity" page logged in as student4
    And I assess submission "Student 1" in workshop "Activity 1" as:
      | grade__idx_0            | 6 / 10            |
      | peercomment__idx_0      | You can do better |
      | Feedback for the author | Good work         |
    # teacher1 makes sure he can see all peer grades and changes to grading evaluation phase
    And I am on the "Activity 1" "workshop activity" page logged in as teacher1
    And I change phase in workshop "Activity 1" to "Grading evaluation phase"
    And I press "Re-calculate grades"
    # Now, the test itself.
    And I entered the course "Course 1" as "teacher1" in the app

    When I press "Activities" in the app
    And I press "Workshops" in the app
    And I press "Activity 1" "ion-item" in the app
    Then I should find " Grading evaluation phase" in the app
    And I should find "-" within "Phase deadline" "ion-item" in the app
    And I should find "1 of 8" within "Submissions" "ion-item" in the app
    And I should find "3 of 3" within "Assessments" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "View" in the app
    Then the header should be "Activity 1" in the app
    And I should find "Workshop grades report" in the app

    When I go back in the app
    And I press "Activity 2" "ion-item" in the app
    Then I should find "Submission phase" in the app
    And I should find "Tomorrow" within "Phase deadline" "ion-item" in the app
    And I should find "0 of 8" within "Submissions" "ion-item" in the app
    And I should find "-" within "Assessments" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "View" in the app
    Then the header should be "Activity 2" in the app
    And I should find "Workshop submissions report" in the app
