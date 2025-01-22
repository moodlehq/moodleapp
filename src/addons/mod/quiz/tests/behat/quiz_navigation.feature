@addon_mod_quiz @app @mod @mod_quiz @javascript
Feature: Navigate through a quiz in the app

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
      | activity   | name   | intro              | course | idnumber | navmethod  |
      | quiz       | Quiz 1 | Quiz 1 description | C1     | quiz1    | free       |
      | quiz       | Quiz 2 | Quiz 2 description | C1     | quiz2    | sequential |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype       | name  | questiontext                |
      | Test questions   | truefalse   | TF1   | Text of the first question  |
      | Test questions   | truefalse   | TF2   | Text of the second question |
      | Test questions   | truefalse   | TF3   | Text of the third question |
    And quiz "Quiz 1" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 2    |
    And quiz "Quiz 2" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 2    |
      | TF3      | 3    |

  Scenario: Next and previous navigation
    Given I entered the quiz activity "Quiz 1" on course "Course 1" as "student1" in the app
    And I press "Attempt quiz now" in the app
    Then I should find "Text of the first question" in the app
    But I should not find "Text of the second question" in the app

    When I press "Open navigation popover" in the app
    Then I should find "Question 1" in the app
    And I should find "Question 2" in the app

    When I press "Close" in the app
    And I press "Next" in the app
    Then I should find "Text of the second question" in the app
    But I should not find "Text of the first question" in the app

    When I press "Previous" in the app
    Then I should find "Text of the first question" in the app
    But I should not find "Text of the second question" in the app

    When I press "Next" in the app
    Then I should find "Text of the second question" in the app
    But I should not find "Text of the first question" in the app

    When I press "Previous" in the app
    Then I should find "Text of the first question" in the app
    But I should not find "Text of the second question" in the app

    When I press "Next" in the app
    And I press "Submit" in the app
    Then I should find "Summary of attempt" in the app
    And I should find "Not yet answered" within "1" "ion-item" in the app
    And I should find "Not yet answered" within "2" "ion-item" in the app

    When I press "Not yet answered" within "2" "ion-item" in the app
    Then I should find "Text of the second question" in the app
    But I should not find "Text of the first question" in the app

    When I press "Submit" in the app
    And I press "Submit all and finish" in the app
    Then I should find "Once you submit" in the app

    When I press "Cancel" near "Once you submit" in the app
    Then I should find "Summary of attempt" in the app

    When I press "Submit all and finish" in the app
    And I press "Submit" near "Once you submit" in the app
    Then I should find "Review" in the app
    And I should find "Text of the first question" in the app
    And I should find "Text of the second question" in the app

  @lms_from4.4
  Scenario: Sequential navigation
    Given I entered the quiz activity "Quiz 2" on course "Course 1" as "student1" in the app
    And I press "Attempt quiz now" in the app
    Then I should find "Text of the first question" in the app
    But I should not find "Text of the second question" in the app
    And I should not find "Text of the third question" in the app

    When I press "Open navigation popover" in the app
    Then I should find "Question 1" in the app
    And I should find "Question 2" in the app
    And I should find "Question 3" in the app
    But I should not be able to press "Question 2" in the app
    And I should not be able to press "Question 3" in the app

    When I press "Close" in the app
    And I press "Next" in the app
    Then I should find "Text of the second question" in the app
    But I should not find "Text of the first question" in the app
    And I should not find "Text of the third question" in the app
    And I should not find "Previous" in the app

    When I press "Open navigation popover" in the app
    Then I should find "Question 1" in the app
    And I should find "Question 2" in the app
    And I should find "Question 3" in the app
    But I should not be able to press "Question 1" in the app
    And I should not be able to press "Question 3" in the app

    When I press "Close" in the app
    And I press "Next" in the app
    Then I should find "Text of the third question" in the app
    But I should not find "Text of the first question" in the app
    And I should not find "Text of the second question" in the app
    And I should not find "Previous" in the app

    When I press "Open navigation popover" in the app
    Then I should find "Question 1" in the app
    And I should find "Question 2" in the app
    And I should find "Question 3" in the app
    But I should not be able to press "Question 1" in the app
    And I should not be able to press "Question 2" in the app

    When I press "Close" in the app
    And I press "Submit" in the app
    Then I should find "Summary of attempt" in the app
    And I should find "Not yet answered" within "1" "ion-item" in the app
    And I should find "Not yet answered" within "2" "ion-item" in the app
    And I should find "Not yet answered" within "3" "ion-item" in the app

    When I press "Not yet answered" within "3" "ion-item" in the app
    Then I should not find "Text of the third question" in the app

    When I press "Submit all and finish" in the app
    Then I should find "Once you submit" in the app
    But I should not find "Questions without a response" in the app

    When I press "Submit" near "Once you submit" in the app
    Then I should find "Review" in the app
    And I should find "Text of the first question" in the app
    And I should find "Text of the second question" in the app
    And I should find "Text of the third question" in the app
