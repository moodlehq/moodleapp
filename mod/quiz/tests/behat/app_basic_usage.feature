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
      | Test questions   | ddwtos           | TF7   | Text of the fifth question  |
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

  @app @3.8.0
  Scenario: View a quiz entry page (attempts, status, etc.)
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Quiz 1" in the app
    And I press "Attempt quiz now" in the app
    Then I should see "Text of the first question"
    But I should not see "Text of the second question"

    When I press "Next" near "Question 1" in the app
    Then I should see "Text of the second question"
    But I should not see "Text of the first question"

    When I press "Previous" near "Question 2" in the app
    Then I should see "Text of the first question"
    But I should not see "Text of the second question"

    When I press "Next" near "Quiz 1" in the app
    Then I should see "Text of the second question"
    But I should not see "Text of the first question"

    When I press "Previous" near "Quiz 1" in the app
    Then I should see "Text of the first question"
    But I should not see "Text of the second question"

    When I press "Next" near "Question 1" in the app
    And I press "Next" near "Quiz 1" in the app
    Then I should see "Summary of attempt"

    When I press "Return to attempt" in the app
    Then I should see "Text of the second question"
    But I should not see "Text of the first question"

    When I press "Next" in the app
    And I press "Submit all and finish" in the app
    Then I should see "Once you submit"

    When I press "Cancel" near "Once you submit" in the app
    Then I should see "Summary of attempt"

    When I press "Submit all and finish" in the app
    And I press "OK" near "Once you submit" in the app
    Then I should see "Review of attempt 1"
    And I should see "Started on"
    And I should see "State"
    And I should see "Completed on"
    And I should see "Time taken"
    And I should see "Marks"
    And I should see "Grade"
    And I should see "Question 1"
    And I should see "Question 2"

  @app @3.8.0
  Scenario: Attempt a quiz (all question types)
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Quiz 2" in the app
    And I press "Attempt quiz now" in the app
    And I press "Four" in the app
    And I press "Three" in the app
    And I press "Next" near "Question 1" in the app
    And I set the field "Answer" to "testing" in the app
    And I press "Next" near "Question 2" in the app
    And I set the field "Answer" to "5" in the app
    And I press "Next" near "Question 3" in the app
    And I set the field "Answer" to "Testing an essay" in the app
    And I press "Next" near "Question 4" in the app
    And I press "lazy" in the app
    And I press "Next" near "Question 5" in the app
    And I press "True" in the app
    And I press "Next" near "Question 6" in the app
    And I press "Choose..." near "frog" in the app
    And I press "amphibian" in the app
    And I press "Choose..." near "newt" in the app
    And I press "insect" in the app
    And I press "Choose..." near "cat" in the app
    And I press "mammal" in the app
    And I press "Next" near "Question 7" in the app
    And I press "Submit all and finish" in the app
    And I press "OK" in the app
    Then I should see "Review of attempt 1"
    And I should see "Finished"
    And I should see "Not yet graded"

  @app @3.8.0
  Scenario: Submit a quiz & Review a quiz attempt
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Quiz 1" in the app
    And I press "Attempt quiz now" in the app
    And I press "True" in the app
    And I press "Next" near "Question 1" in the app
    And I press "False" in the app
    And I press "Next" near "Question 2" in the app
    And I press "Submit all and finish" in the app
    And I press "OK" in the app
    Then I should see "Review of attempt 1"

    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Quiz 1" in the app
    And I press "Display options" in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I follow "Attempts: 1"
    And I follow "Review attempt"
    Then I should see "Finished"
    And I should see "1.00/2.00"
