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
      | teacher1 |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | teacher1 | C1     | editingteacher |
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
    And the following "activities" exist:
      | activity   | name   | intro              | course | idnumber |
      | quiz       | Quiz 2 | Quiz 2 description | C1     | quiz2    |
    And the following "question categories" exist:
      | contextlevel | reference | name            |
      | Course       | C1        | Test questions 2|
    And the following "questions" exist:
      | questioncategory | qtype            | name  | questiontext                |
      | Test questions   | multichoice      | TF3   | Text of the first question  |
      | Test questions   | shortanswer      | TF4   | Text of the second question |
      | Test questions   | numerical        | TF5   | Text of the third question  |
      | Test questions   | essay            | TF6   | Text of the fourth question |
      | Test questions   | ddwtos           | TF7   | The [[1]] brown [[2]] jumped over the [[3]] dog. |
      | Test questions   | truefalse        | TF8   | Text of the sixth question  |
      | Test questions   | match            | TF9   | Text of the seventh question  |
    And quiz "Quiz 2" contains the following questions:
      | question | page |
      | TF3      | 1    |
      | TF4      | 2    |
      | TF5      | 3    |
      | TF6      | 4    |
      | TF7      | 5    |
      | TF8      | 6    |
      | TF9      | 7    |

  Scenario: View a quiz entry page (attempts, status, etc.)
    Given I entered the quiz activity "Quiz 1" on course "Course 1" as "student1" in the app
    When I press "Attempt quiz now" in the app
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
    And I press "Submit" near "Quiz 1" in the app
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
    And I should find "Started on" in the app
    And I should find "State" in the app
    And I should find "Completed on" in the app
    And I should find "Time taken" in the app
    And I should find "Marks" in the app
    And I should find "Grade" in the app
    And I should find "Question 1" in the app
    And I should find "Question 2" in the app

  Scenario: Attempt a quiz (all question types)
    Given I entered the quiz activity "Quiz 2" on course "Course 1" as "student1" in the app
    When I press "Attempt quiz now" in the app
    And I press "Four" in the app
    And I press "Three" in the app
    And I press "Next" near "Quiz 2" in the app
    And I set the field "Answer" to "testing" in the app
    And I press "Next" near "Question 2" in the app
    And I set the field "Answer" to "5" in the app
    And I press "Next" near "Question 3" in the app
    And I set the field "Answer" to "Testing an essay" in the app
    And I press "Next" "ion-button" near "Question 4" in the app
    And I press "quick" ".drag" in the app
    And I press "" ".place1.drop" in the app
    And I press "fox" ".drag" in the app
    And I press "" ".place2.drop" in the app
    And I press "lazy" ".drag" in the app
    And I press "" ".place3.drop" in the app
    And I press "Next" near "Question 5" in the app
    And I press "True" in the app
    And I press "Next" near "Question 6" in the app
    And I press "Choose... , frog" in the app
    And I press "amphibian" in the app
    And I press "Choose... , newt" in the app
    And I press "insect" in the app
    And I press "Choose... , cat" in the app
    And I press "mammal" in the app
    And I press "Submit" near "Question 7" in the app
    Then I should not find "Not yet answered" in the app

    When I press "Submit all and finish" in the app
    And I press "OK" in the app
    Then I should find "Review" in the app
    And I should find "Finished" in the app
    And I should find "Not yet graded" in the app

  Scenario: Submit a quiz & Review a quiz attempt
    Given I entered the quiz activity "Quiz 1" on course "Course 1" as "student1" in the app
    When I press "Attempt quiz now" in the app
    And I press "True" in the app
    And I press "Next" near "Question 1" in the app
    And I press "False" in the app
    And I press "Submit" near "Question 2" in the app
    And I press "Submit all and finish" in the app
    And I press "OK" in the app
    Then I should find "Review" in the app

    Given I entered the quiz activity "Quiz 1" on course "Course 1" as "teacher1" in the app
    When I press "Information" in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I follow "Attempts: 1"
    And I follow "Review attempt"
    Then I should see "Finished"
    And I should see "1.00/2.00"
