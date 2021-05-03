@mod @mod_quiz @app @app_upto3.9.4 @javascript
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

  @app_upto3.7.0
  Scenario: Next and previous navigation in the 3.6 app
    Given I enter the app
    And I log in as "student1"
    When I press "Course 1" near "Course overview" in the app
    And I press "Quiz 1" in the app
    And I press "Attempt quiz now" in the app
    Then I should see "Text of the first question"
    And I should not see "Text of the second question"
    And I press "Next" near "Question 1" in the app
    And I should see "Text of the second question"
    And I should not see "Text of the first question"
    And I press "Previous" near "Question 2" in the app
    And I should not see "Text of the second question"
    And I should see "Text of the first question"
    And I press "Next" near "Quiz 1" in the app
    And I should see "Text of the second question"
    And I should not see "Text of the first question"
    And I press "Previous" near "Quiz 1" in the app
    And I should not see "Text of the second question"
    And I should see "Text of the first question"
    And I press "Next" near "Question 1" in the app
    And I press "Next" near "Quiz 1" in the app
    And I should see "Summary of attempt"
    And I press "Return to attempt" in the app
    And I should see "Text of the second question"
    And I should not see "Text of the first question"
    And I press "Next" in the app
    And I press "Submit all and finish" in the app
    And I should see "Once you submit"
    And I press "Cancel" near "Once you submit" in the app
    And I should see "Summary of attempt"
    And I press "Submit all and finish" in the app
    And I press "OK" near "Once you submit" in the app
    And I should see "Review"
    And I press "home" in the app
    And I should see "Acceptance test site"

  @app_from3.7.1
  Scenario: Next and previous navigation in the 3.7 app
    Given I enter the app
    And I log in as "student1"
    When I press "Course 1" near "Course overview" in the app
    And I press "Quiz 1" in the app
    And I press "Attempt quiz now" in the app
    Then I should see "Text of the first question"
    And I should not see "Text of the second question"
    And I press "Next" near "Question 1" in the app
    And I should see "Text of the second question"
    And I should not see "Text of the first question"
    And I press "Previous" near "Question 2" in the app
    And I should not see "Text of the second question"
    And I should see "Text of the first question"
    And I press "Next" near "Quiz 1" in the app
    And I should see "Text of the second question"
    And I should not see "Text of the first question"
    And I press "Previous" near "Quiz 1" in the app
    And I should not see "Text of the second question"
    And I should see "Text of the first question"
    And I press "Next" near "Question 1" in the app
    And I press "Next" near "Quiz 1" in the app
    And I should see "Summary of attempt"
    And I press "Return to attempt" in the app
    And I should see "Text of the second question"
    And I should not see "Text of the first question"
    And I press "Next" in the app
    And I press "Submit all and finish" in the app
    And I should see "Once you submit"
    And I press "Cancel" near "Once you submit" in the app
    And I should see "Summary of attempt"
    And I press "Submit all and finish" in the app
    And I press "OK" near "Once you submit" in the app
    And I should see "Review"
    And I press "home" in the app
    And I should see "Are you sure"
    And I should see "OK"
    And I press "OK" in the app
    And I should see "Acceptance test site"
