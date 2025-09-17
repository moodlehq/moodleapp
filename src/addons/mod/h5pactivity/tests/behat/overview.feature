@addon_mod_h5pactivity @app @mod @mod_h5pactivity @javascript @lms_from5.1
Feature: Activities overview for H5P activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
      | student2 | Student   | 2        | student2@example.com |
      | student3 | Student   | 3        | student3@example.com |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | enablecompletion |
      | Course 1 | C1        | 0        | 1                |
    And the following "course enrolments" exist:
      | user | course | role           |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student        |
      | student2 | C1 | student        |
      | student3 | C1 | student        |
    And the following "activity" exists:
      | course          | C1                                    |
      | activity        | h5pactivity                           |
      | name            | H5P activity                          |
      | intro           | description                           |
      | packagefilepath | h5p/tests/fixtures/find-the-words.h5p |
      | idnumber        | h5p                                   |
      | completion      | 1                                     |
      | enabletracking  | 1                                     |
      | reviewmode      | 1                                     |
      | grademethod     | 2                                     |
    And the following "activity" exists:
      | course          | C1                   |
      | activity        | h5pactivity          |
      | name            | Empty H5P activity   |
      | intro           | empty                |
      | idnumber        | empty                |
    And the following "mod_h5pactivity > attempts" exist:
      | user     | h5pactivity  | attempt | interactiontype | rawscore | maxscore | duration | completion | success |
      # student1.
      | student1 | H5P activity | 1       | choice          | 2        | 2        | 1        | 1          | 1       |
      | student1 | H5P activity | 1       | compound        | 2        | 2        | 4        | 1          | 1       |
      | student1 | H5P activity | 2       | choice          | 0        | 2        | 1        | 1          | 0       |
      | student1 | H5P activity | 2       | compound        | 0        | 2        | 4        | 1          | 0       |
      | student1 | H5P activity | 3       | matching        | 2        | 2        | 1        | 1          | 1       |
      | student1 | H5P activity | 3       | compound        | 2        | 2        | 4        | 1          | 1       |
      | student1 | H5P activity | 4       | true-false      | 2        | 2        | 1        | 1          | 1       |
      | student1 | H5P activity | 4       | compound        | 2        | 2        | 4        | 1          | 1       |
      # student2.
      | student2 | H5P activity | 1       | compound        | 0        | 2        | 1        | 1          | 0       |
    # We need to navigate to the activity to deploy the H5P file.
    And I am on the "H5P activity" "h5pactivity activity" page logged in as admin
    And I log out

  Scenario: Students can see relevant columns in the H5P activity overview
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "H5P" in the app
    And I press "H5P activity" "ion-item" in the app
    Then I should find "4" within "Attempts" "ion-item" in the app
    And I should find "75.00" within "Grade" "ion-item" in the app

    When I press "Empty H5P activity" "ion-item" in the app
    Then I should find "0" within "Attempts" "ion-item" in the app
    And I should find "-" within "Grade" "ion-item" in the app

  Scenario: Teachers can see relevant columns in the H5P activity overview
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Activities" in the app
    And I press "H5P" in the app
    And I press "H5P activity" "ion-item" in the app
    Then I should find "Find The Words" within "H5P type" "ion-item" in the app
    And I should find "2 of 3" within "Students who attempted" "ion-item" in the app
    And I should find "5" within "Total attempts" "ion-item" in the app

    When I press "5" within "Total attempts" "ion-item" in the app
    Then I should find "Grading method: Average grade" in the app
    And I should find "Average attempts per student: 3" in the app

    When I close the popup in the app
    And I press "View" within "Actions" "ion-item" in the app
    Then the header should be "H5P activity" in the app
    And I should find "Attempts report" in the app

    When I go back in the app
    And I press "Empty H5P activity" "ion-item" in the app
    Then I should find "Unknown H5P type" within "H5P type" "ion-item" in the app
    And I should find "0 of 3" within "Students who attempted" "ion-item" in the app
    And I should find "0" within "Total attempts" "ion-item" in the app
    And I should be able to press "View" within "Actions" "ion-item" in the app

    When I press "0" within "Total attempts" "ion-item" in the app
    Then I should find "Grading method: Highest grade" in the app
    And I should find "Average attempts per student: 0" in the app
