@mod @mod_quiz @app @javascript
Feature: Attempt a quiz in app
  As a student
  In order to demonstrate what I know
  I need to be able to attempt quizzes

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username |
      | student1 |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
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

  Scenario: Next and previous navigation
    Given I entered the quiz activity "Quiz 1" on course "Course 1" as "student1" in the app
    And I press "Attempt quiz now" in the app
    Then I should find "Text of the first question" in the app
    But I should not find "Text of the second question" in the app

    When I press "Next" near "Question 1" in the app
    Then I should find "Text of the second question" in the app
    But I should not find "Text of the first question" in the app

    When I press "Previous" near "Question 2" in the app
    Then I should find "Text of the first question" in the app
    But I should not find "Text of the second question" in the app

    When I press "Next" near "Quiz 1" in the app
    Then I should find "Text of the second question" in the app
    But I should not find "Text of the first question" in the app

    When I press "Previous" near "Quiz 1" in the app
    Then I should find "Text of the first question" in the app
    But I should not find "Text of the second question" in the app

    When I press "Next" near "Question 1" in the app
    And I press "Submit" in the app
    Then I should find "Summary of attempt" in the app

    When I press "Not yet answered" within "2" "ion-item" in the app
    Then I should find "Text of the second question" in the app
    But I should not find "Text of the first question" in the app

    When I press "Submit" in the app
    And I press "Submit all and finish" in the app
    Then I should find "Once you submit" in the app

    When I press "Cancel" near "Once you submit" in the app
    Then I should find "Summary of attempt" in the app

    When I press "Submit all and finish" in the app
    And I press "OK" near "Once you submit" in the app
    Then I should find "Review" in the app
