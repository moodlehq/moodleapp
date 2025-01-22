@addon_mod_quiz @app @mod @mod_quiz @javascript
Feature: Users can only review attempts that are allowed to be reviewed

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
      | activity | name                    | course | idnumber | timeclose                    | attemptimmediately | attemptopen | attemptclosed |
      | quiz     | Quiz never review       | C1     | quiz1    | ## 31 December 2035 23:59 ## | 0                  | 0           | 0             |
      | quiz     | Quiz review when closed | C1     | quiz2    | ## 31 December 2035 23:59 ## | 0                  | 0           | 1             |
      | quiz     | Quiz review after immed | C1     | quiz3    | 0                            | 0                  | 1           | 1             |
      | quiz     | Quiz review only immed  | C1     | quiz4    | 0                            | 1                  | 0           | 0             |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype       | name  | questiontext                |
      | Test questions   | truefalse   | TF1   | Text of the first question  |
    And quiz "Quiz never review" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And quiz "Quiz review when closed" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And quiz "Quiz review after immed" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And quiz "Quiz review only immed" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And user "student1" has attempted "Quiz never review" with responses:
      | slot | response |
      | 1    | True     |
    And user "student1" has attempted "Quiz review when closed" with responses:
      | slot | response |
      | 1    | True     |
    And user "student1" has attempted "Quiz review after immed" with responses:
      | slot | response |
      | 1    | True     |
    And user "student1" has attempted "Quiz review only immed" with responses:
      | slot | response |
      | 1    | True     |

  Scenario: Can review only when the attempt is allowed to be reviewed
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Quiz review after immed" in the app
    When I press "Attempt 1" in the app
    Then I should not be able to press "Review" in the app

    When I go back in the app
    And I press "Quiz review only immed" in the app
    And I press "Attempt 1" in the app
    And I press "Review" in the app
    Then I should find "Question 1" in the app

    # Wait the "immediate after" time and check that now the behaviour is the opposite.
    When I go back 2 times in the app
    And I wait "120" seconds
    And I press "Quiz review only immed" in the app
    And I press "Attempt 1" in the app
    Then I should find "You are not allowed to review this attempt" in the app
    And I should not be able to press "Review" in the app

    When I go back in the app
    And I press "Quiz review after immed" in the app
    And I press "Attempt 1" in the app
    And I press "Review" in the app
    Then I should find "Question 1" in the app

    When I go back 2 times in the app
    And I press "Quiz never review" in the app
    And I press "Attempt 1" in the app
    Then I should find "You are not allowed to review this attempt" in the app
    And I should not be able to press "Review" in the app

    When I go back in the app
    And I press "Quiz review when closed" in the app
    And I press "Attempt 1" in the app
    Then I should find "Available 31/12/35, 23:59" in the app
    And I should not be able to press "Review" in the app
