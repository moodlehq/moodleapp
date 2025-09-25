@addon_mod_lesson @app @mod @mod_lesson @javascript @lms_from5.1
Feature: Activities overview for lesson activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | Username  | 1        |
      | student2 | Username  | 2        |
      | student3 | Username  | 3        |
      | teacher1 | Teacher   | T        |
    And the following "courses" exist:
      | fullname | shortname | groupmode |
      | Course 1 | C1        | 1         |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | student3 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity  | name      | course | idnumber | retake  | deadline     |
      | lesson    | Lesson 1  | C1     | lesson1  | 1       | ##tomorrow## |
      | lesson    | Lesson 2  | C1     | lesson2  | 0       | 0            |
    And the following "mod_lesson > pages" exist:
      | lesson       | qtype     | title      | content                                |
      | lesson1      | truefalse | Question 1 | The number 10 is greater than 5        |
    And the following "mod_lesson > answers" exist:
      | page       | answer    | jumpto         | score   |
      | Question 1 | True      | End of lesson  |  1      |
      | Question 1 | False     | End of lesson  |  0      |
    And the following "mod_lesson > submissions" exist:
      | lesson    | user     | grade  |
      | Lesson 1  | student1 | 50     |
      | Lesson 1  | student1 | 60     |
      | Lesson 1  | student1 | 100    |
      | Lesson 1  | student2 | 90     |

  Scenario: The lesson overview report should generate log events
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Lessons" in the app
    Then the following events should have been logged for "student1" in the app:
      | name                                                 | course   |
      | \core\event\course_overview_viewed                   | Course 1 |
      | \mod_lesson\event\course_module_instance_list_viewed | Course 1 |

  Scenario: Teacher can see the lesson relevant information in the lesson overview
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Activities" in the app
    And I press "Lessons" in the app
    And I press "Lesson 1" "ion-item" in the app
    Then I should find "Tomorrow" within "Due date" "ion-item" in the app
    And I should find "2 of 3" within "Students who attempted" "ion-item" in the app
    And I should find "4" within "Total attempts" "ion-item" in the app
    But I should not find "This lesson allows students to attempt it more than once" in the app

    When I press "4" within "Total attempts" "ion-item" in the app
    Then I should find "This lesson allows students to attempt it more than once" in the app
    And I should find "Average attempts per student: 2" in the app

    When I close the popup in the app
    And I press "View" in the app
    Then the header should be "Lesson 1" in the app
    And I should find "Lesson statistics" in the app

    When I go back in the app
    And I press "Lesson 2" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "0 of 3" within "Students who attempted" "ion-item" in the app
    And I should find "0" within "Total attempts" "ion-item" in the app

  Scenario: Teacher can see the lesson overview with all lessons with retakes disabled
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 2 | C2        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C2     | student        |
      | teacher1 | C2     | editingteacher |
    And the following "activities" exist:
      | activity  | name      | course | idnumber | retake  |
      | lesson    | Lesson 1  | C2     | lesson1  | 0       |
      | lesson    | Lesson 2  | C2     | lesson2  | 0       |
    And I entered the course "Course 2" as "teacher1" in the app

    When I press "Activities" in the app
    And I press "Lessons" in the app
    And I press "Lesson 1" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "0 of 1" within "Students who attempted" "ion-item" in the app
    But I should not find "Total attempts" in the app

    When I press "Lesson 2" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "0 of 1" within "Students who attempted" "ion-item" in the app

  Scenario: Students can see the lesson relevant information in the lesson overview
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Lessons" in the app
    And I press "Lesson 1" "ion-item" in the app
    Then I should find "Tomorrow" within "Due date" "ion-item" in the app
    But I should not find "Actions" in the app
    And I should not find "Students who attempted" in the app
    And I should not find "Total attempts" in the app

    When I press "Lesson 2" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app

  Scenario: Lesson overview provide grade information to the student
    Given  I am on the "Course 1" "grades > Grader report > View" page logged in as "teacher1"
    And I turn editing mode on
    And I give the grade "42" to the user "Username 1" for the grade item "Lesson 1"
    And I press "Save changes"

    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Lessons" in the app
    And I press "Lesson 1" "ion-item" in the app
    Then I should find "42.00" within "Grade" "ion-item" in the app

    When I press "Lesson 2" "ion-item" in the app
    Then I should find "-" within "Grade" "ion-item" in the app
