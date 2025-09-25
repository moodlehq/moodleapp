@addon_mod_quiz @app @mod @mod_quiz @javascript @lms_from5.1
Feature: Activities overview for quiz activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | Username  | 1        |
      | student2 | Username  | 2        |
      | student3 | Username  | 3        |
      | teacher1 | Teacher   | T        |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | student3 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name    | course | idnumber | timeclose    |
      | quiz     | Quiz 1  | C1     | quiz1    | ##tomorrow## |
      | quiz     | Quiz 2  | C1     | quiz2    | 0            |
      | qbank    | Qbank 1 | C1     | qbank1   |              |
    And the following "question categories" exist:
      | contextlevel    | reference | name           |
      | Activity module | qbank1    | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype     | name | questiontext   |
      | Test questions   | truefalse | TF1  | First question |

    And quiz "Quiz 1" contains the following questions:
      | question | page | maxmark |
      | TF1      | 1    | 2.00    |
    And quiz "Quiz 2" contains the following questions:
      | question | page | maxmark |
      | TF1      | 1    | 2.00    |
    And user "student1" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | True     |
    And user "student2" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | True     |
    And user "student2" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | False     |
    And user "student2" has attempted "Quiz 2" with responses:
      | slot | response |
      | 1    | True     |

  Scenario: The quiz overview report should generate log events
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Quizzes" in the app
    Then the following events should have been logged for "student1" in the app:
      | name                                               | course   |
      | \core\event\course_overview_viewed                 | Course 1 |
      | \mod_quiz\event\course_module_instance_list_viewed | Course 1 |

  Scenario: Teacher can see the quiz relevant information in the quiz overview
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Activities" in the app
    And I press "Quizzes" in the app
    And I press "Quiz 1" "ion-item" in the app
    Then I should find "2 of 3" within "Students who attempted" "ion-item" in the app
    And I should find "3" within "Total attempts" "ion-item" in the app
    And I should find "Tomorrow" within "Due date" "ion-item" in the app

    When I press "3" within "Total attempts" "ion-item" in the app
    Then I should find "Allowed attempts per student: Unlimited attempts" in the app
    And I should find "Average attempts per student: 1.5" in the app

    When I close the popup in the app
    And I press "View" within "Actions" "ion-item" in the app
    And I press "OK" in the app
    Then the app should have opened a browser tab

    When I close the browser tab opened by the app
    And I press "Quiz 2" "ion-item" in the app
    Then I should find "1 of 3" within "Students who attempted" "ion-item" in the app
    And I should find "1" within "Total attempts" "ion-item" in the app
    And I should find "-" within "Due date" "ion-item" in the app

    When I press "1" within "Total attempts" "ion-item" in the app
    Then I should find "Allowed attempts per student: Unlimited attempts" in the app
    And I should find "Average attempts per student: 1" in the app

  Scenario: Students can see the quiz relevant information in the quiz overview
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Quizzes" in the app
    And I press "Quiz 1" "ion-item" in the app
    Then I should find "Tomorrow" within "Due date" "ion-item" in the app
    And I should find "100" within "Grade" "ion-item" in the app
    But I should not find "Actions" in the app
    And I should not find "Students who attempted" in the app
    And I should not find "Total attempts" in the app

    When I press "Quiz 2" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "-" within "Grade" "ion-item" in the app
