@mod @mod_quiz @app @javascript @lms_upto3.9
Feature: Attempt a quiz in app
  As a student
  In order to demonstrate what I know
  I need to be able to attempt quizzes

  Background:
    Given the Moodle site is compatible with this feature
    And the following "courses" exist:
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
      | contextlevel | reference | name             |
      | Course       | C1        | Test questions 2 |
    And the following "questions" exist:
      | questioncategory | qtype            | name  | questiontext                                     |
      | Test questions   | multichoice      | TF3   | Text of the first question                       |
      | Test questions   | shortanswer      | TF4   | Text of the second question                      |
      | Test questions   | numerical        | TF5   | Text of the third question                       |
      | Test questions   | essay            | TF6   | Text of the fourth question                      |
      | Test questions   | ddwtos           | TF7   | The [[1]] brown [[2]] jumped over the [[3]] dog. |
      | Test questions   | truefalse        | TF8   | Text of the sixth question                       |
      | Test questions   | match            | TF9   | Text of the seventh question                     |
      | Test questions   | description      | TF10  | Text of the eighth question                      |
    And the following "questions" exist:
      | questioncategory | qtype         | name | template        |
      | Test questions   | gapselect     | TF11 | missingchoiceno |
      | Test questions   | ddimageortext | TF12 | xsection        |
      | Test questions   | ddmarker      | TF13 | mkmap           |
    And quiz "Quiz 2" contains the following questions:
      | question | page |
      | TF3      | 1    |
      | TF4      | 2    |
      | TF5      | 3    |
      | TF6      | 4    |
      | TF7      | 5    |
      | TF8      | 6    |
      | TF9      | 7    |
      | TF10     | 8    |
      | TF11     | 9    |
      | TF12     | 10   |
      | TF13     | 11   |

  # This scenario is duplicated from main because the description type question (the eighth)
  # cannot be filled in 3.9, since the selects are missing accessible labels.
  Scenario: Attempt a quiz (all question types)
    Given I entered the quiz activity "Quiz 2" on course "Course 1" as "student1" in the app
    When I press "Attempt quiz now" in the app
    And I press "Four" in the app
    And I press "Three" in the app
    And I press "Next" in the app
    And I set the field "Answer" to "testing" in the app
    And I press "Next" in the app
    And I set the field "Answer" to "5" in the app
    And I press "Next" in the app
    And I set the field "Answer" to "Testing an essay" in the app
    And I press "Next" "ion-button" in the app
    And I press "quick" ".drag" in the app
    And I click on ".place1.drop" "css"
    And I press "fox" ".drag" in the app
    And I click on ".place2.drop" "css"
    And I press "lazy" ".drag" in the app
    And I click on ".place3.drop" "css"
    And I press "Next" in the app
    And I press "True" in the app
    And I press "Next" in the app
    And I press "Choose... , frog" in the app
    And I press "amphibian" in the app
    And I press "Choose... , newt" in the app
    And I press "insect" in the app
    And I press "Choose... , cat" in the app
    And I press "mammal" in the app
    And I press "Next" in the app
    Then I should find "Text of the eighth question" in the app

    When I press "Next" in the app
    And I press "Next" in the app
    And I press "abyssal" ".drag" in the app
    And I click on ".place6.dropzone" "css"
    And I press "trench" ".drag" in the app
    And I click on ".place3.dropzone" "css"
    And I press "Next" in the app
    And I press "Railway station" ".marker" in the app
    And I click on "img.dropbackground" "css"
    And I press "Submit" in the app
    Then I should find "Answer saved" in the app
    And I should find "Not yet answered" within "8" "ion-item" in the app
    And I should find "Incomplete answer" within "9" "ion-item" in the app

    When I press "Submit all and finish" in the app
    And I press "OK" in the app
    Then I should find "Review" in the app
    And I should find "Finished" in the app
    And I should find "Not yet graded" in the app
