@mod @mod_quiz @app @javascript
Feature: Use quizzes with different behaviours in the app

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
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype       | name |
      | Test questions   | multichoice | TF1  |

  Scenario: Adaptive behaviour
    Given the following "activities" exist:
      | activity | name | course | idnumber | preferredbehaviour |
      | quiz     | Quiz | C1     | quiz     | adaptive           |
    And quiz "Quiz" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And I entered the quiz activity "Quiz" on course "Course 1" as "student1" in the app
    And I press "Attempt quiz now" in the app

    When I press "Two" in the app
    And I press "Check" in the app
    And I press "OK" near "Are you sure?" in the app
    Then I should find "That is not right at all" in the app

    When I press "Two" in the app
    And I press "One" in the app
    And I press "Check" in the app
    And I press "OK" near "Are you sure?" in the app
    Then I should find "Parts, but only parts, of your response are correct" in the app

    When I press "Three" in the app
    And I press "Check" in the app
    And I press "OK" near "Are you sure?" in the app
    Then I should find "Well done" in the app

    When I press "Submit" in the app
    And I press "Submit all and finish" in the app
    And I press "OK" near "Once you submit" in the app
    Then I should find "Mark 0.33 out of 1.00" in the app

  Scenario: Immediate feedback behaviour
    Given the following "activities" exist:
      | activity | name | course | idnumber | preferredbehaviour | canredoquestions |
      | quiz     | Quiz | C1     | quiz     | immediatefeedback  | 1                |
    And quiz "Quiz" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And I entered the quiz activity "Quiz" on course "Course 1" as "student1" in the app
    And I press "Attempt quiz now" in the app

    When I press "Two" in the app
    And I press "Check" in the app
    And I press "OK" near "Are you sure?" in the app
    Then I should find "That is not right at all" in the app
    And I should find "Mark 0.00 out of 1.00" in the app

    When I press "Try another question like this one" in the app
    And I press "OK" near "Are you sure?" in the app
    And I press "One" in the app
    And I press "Check" in the app
    And I press "OK" near "Are you sure?" in the app
    Then I should find "Parts, but only parts, of your response are correct" in the app
    And I should find "Mark 0.50 out of 1.00" in the app

    When I press "Try another question like this one" in the app
    And I press "OK" near "Are you sure?" in the app
    And I press "One" in the app
    And I press "Three" in the app
    And I press "Check" in the app
    And I press "OK" near "Are you sure?" in the app
    Then I should find "Well done!" in the app
    And I should find "The odd numbers are One and Three" in the app
    And I should find "Mark 1.00 out of 1.00" in the app

    When I press "Submit" in the app
    And I press "Submit all and finish" in the app
    And I press "OK" near "Once you submit" in the app
    Then I should find "Mark 1.00 out of 1.00" in the app

  Scenario: Deferred feedback with CBM behaviour
    Given the following "activities" exist:
      | activity | name | course | idnumber | preferredbehaviour |
      | quiz     | Quiz | C1     | quiz     | deferredcbm        |
    And quiz "Quiz" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And I entered the quiz activity "Quiz" on course "Course 1" as "student1" in the app

    When I press "Attempt quiz now" in the app
    And I press "One" in the app
    And I press "Four" in the app
    And I press "Quite sure" in the app
    And I press "Submit" in the app
    And I press "Submit all and finish" in the app
    And I press "OK" near "Once you submit" in the app
    Then I should find "CBM mark 1.50" in the app
    And I should find "Parts, but only parts, of your response are correct" in the app

  Scenario: Interactive behaviour
    Given the following "activities" exist:
      | activity | name | course | idnumber | preferredbehaviour |
      | quiz     | Quiz | C1     | quiz     | interactive        |
    And quiz "Quiz" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And I entered the quiz activity "Quiz" on course "Course 1" as "student1" in the app

    When I press "Attempt quiz now" in the app
    Then I should find "Tries remaining: 3" in the app

    When I press "Two" in the app
    And I press "Check" in the app
    And I press "OK" near "Are you sure?" in the app
    Then I should find "That is not right at all" in the app
    And I should find "Hint 1" in the app
    And I should find "Tries remaining: 2" in the app

    When I press "Try again" in the app
    And I press "OK" near "Are you sure?" in the app
    And I press "Two" in the app
    And I press "One" in the app
    And I press "Check" in the app
    And I press "OK" near "Are you sure?" in the app
    Then I should find "Parts, but only parts, of your response are correct" in the app
    And I should find "Hint 2" in the app
    And I should find "Tries remaining: 1" in the app

    When I press "Try again" in the app
    And I press "OK" near "Are you sure?" in the app
    And I press "Three" in the app
    And I press "Check" in the app
    And I press "OK" near "Are you sure?" in the app
    Then I should find "Well done!" in the app
    And I should find "The odd numbers are One and Three" in the app
    And I should find "Correct" within "Question 1" "ion-item-divider" in the app

    When I press "Submit" in the app
    And I press "Submit all and finish" in the app
    And I press "OK" near "Once you submit" in the app
    Then I should find "Mark 0.33 out of 1.00" in the app
