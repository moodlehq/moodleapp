@app_parallel_run_choice @addon_mod_choice @app @mod @mod_choice @javascript @lms_from5.1
Feature: Activities overview for choice activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | Student   | 1        |
      | student2 | Student   | 2        |
      | student3 | Student   | 3        |
      | teacher1 | Teacher   | T        |
    And the following "courses" exist:
      | fullname | shortname | enablecompletion |
      | Course 1 | C1        | 1                |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | student3 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name     | intro                | course | idnumber | option             | section | completion | allowmultiple | timeclose      |
      | choice   | Choice 1 | Choice Description 1 | C1     | choice1  | Option 1, Option 2 | 1       | 1          | 1             | 1 January 2040 |
      | choice   | Choice 2 | Choice Description 2 | C1     | choice2  | Option A, Option B | 1       | 0          | 0             |                |
      | choice   | Choice 3 | Choice Description 3 | C1     | choice3  | Option A           | 1       | 0          | 0             |                |
    And the following "mod_choice > responses" exist:
      | choice  | user     | responses          |
      | choice1 | student1 | Option 1, Option 2 |
      | choice1 | student3 | Option 2           |
      | choice2 | student2 | Option A           |

  Scenario: The choice overview report should generate log events
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Choices" in the app
    Then the following events should have been logged for "student1" in the app:
      | name                                                 | course   |
      | \core\event\course_overview_viewed                   | Course 1 |
      | \mod_choice\event\course_module_instance_list_viewed | Course 1 |

  Scenario: Students can see relevant columns and content in the choice overview
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Choices" in the app
    And I press "Choice 1" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "Answered" "ion-icon" within "Responded" "ion-item" in the app

    When I press "Choice 2" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "-" within "Responded" "ion-item" in the app
    And I should not find "Answered" within "Responded" "ion-item" in the app

    When I press "Choice 3" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "-" within "Responded" "ion-item" in the app
    And I should not find "Answered" "ion-icon" within "Responded" "ion-item" in the app

  Scenario: Teachers can see relevant columns and content in the choice overview
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Activities" in the app
    And I press "Choices" in the app
    And I press "Choice 1" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "2" within "Students who responded" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "View" within "Actions" "ion-item" in the app
    Then the header should be "Choice 1" in the app

    When I go back in the app
    And I press "Choice 2" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "1" within "Students who responded" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "Choice 3" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "0" within "Students who responded" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app
