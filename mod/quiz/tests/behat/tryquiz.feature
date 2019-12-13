@mod @mod_quiz @app @javascript
Feature: Trying quizzes in app
  As a student
  In order to demonstrate what I know
  I need to be able to attempt quizzes
  As a teacher
  I need to see the results

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username |
      | student1 |
      | teacher1 |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | teacher1 | C1     | teacher |
    And the following "activities" exist:
      | activity   | name   | intro              | course | idnumber |
      | quiz       | Quiz 1 | Quiz 1 description | C1     | quiz1    |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype       | name  | questiontext                |
      | Test questions   | truefalse   | TF1   | Text of the first question  |
      | Test questions   | truefalse   | TF2   | Text of the second question |
    And quiz "Quiz 1" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 2    |

  @app_from3.7.1
  Scenario: Student attempt a quiz in app and teacher see the results.
    Given I enter the app
    And I log in as "student1"
    When I press "Course 1" near "Course overview" in the app
    And I press "Quiz 1" in the app
    And I press "Attempt quiz now" in the app
    Then I should see "Text of the first question"
    And I should not see "Text of the second question"
    And I press "True" in the app
    And I press "Next" near "Question 1" in the app
    And I should see "Text of the second question"
    And I should not see "Text of the first question"
    And I press "False" in the app
    And I press "Clear my choice" in the app
    And I press "True" in the app
    And I press "Next" in the app
    And I press "Submit all and finish" in the app
    And I should see "OK"
    And I press "OK" in the app
    And I should see "Review"
    Given I enter the app
    And I log in as "teacher1"
    When I press "Course 1" near "Course overview" in the app
    And I press "Quiz 1" in the app
    And I press "Information" in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I press "Actions menu"
    And I follow "Results"
    And I press "Download"
    And I pause
    And I close the browser tab opened by the app
    