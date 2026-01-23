@addon_mod_quiz @app @mod @mod_quiz @javascript @lms_from4.4
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
    Given the following "mod_quiz > grade items" exist:
      | quiz   | name      |
      | Quiz 1 | Logic     |
      | Quiz 1 | Cognition |
    And quiz "Quiz 1" contains the following questions:
      | question | page | grade item |
      | TF1      | 1    | Logic      |
      | TF2      | 2    | Cognition  |
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
      # TODO test calculated question type.
      # The calculatedsimple type is implemented using the calculated type.
      # The calculatedmulti type is implemented using the multichoice type.
      # The randomsamatch type is implemented using the match type.
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

    # TODO rewrite using generators.
    And I am on the "Quiz 2" "mod_quiz > question bank" page logged in as teacher1
    And I add a "Embedded answers (Cloze)" question filling the form with:
      | Question name        | multianswer                                     |
      | Question text        | {1:SHORTANSWER:=Berlin} is the capital of Germany.  |
      | General feedback     | The capital of Germany is Berlin.                   |
    And I am on the "quiz2" "Activity" page
    And I click on "Questions" "link"
    And I click on "Add" "link"
    And I click on "from question bank" "link"
    And I set the field with xpath "//tr[contains(normalize-space(.), 'multianswer')]//input[@type='checkbox']" to "1"
    And I click on "Add selected questions to the quiz" "button"
    And I log out

  Scenario: View a quiz entry page (attempts, status, etc.)
    Given I entered the quiz activity "Quiz 1" on course "Course 1" as "student1" in the app
    When I press "Attempt quiz now" in the app
    Then I should find "Text of the first question" in the app
    But I should not find "Text of the second question" in the app

    When I press "Next" in the app
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

    When I press "Not yet answered" within "2" "ion-item" in the app
    Then I should find "Text of the second question" in the app
    But I should not find "Text of the first question" in the app

    When I press "Submit" in the app
    And I press "Submit all and finish" in the app
    Then I should find "Once you submit" in the app
    And I should find "Questions without a response: 2" in the app

    When I press "Cancel" near "Once you submit" in the app
    Then I should find "Summary of attempt" in the app

    When I press "Submit all and finish" in the app
    And I press "Submit" near "Once you submit" in the app
    Then I should find "Review" in the app
    And I should find "Started" in the app
    And I should find "Completed" in the app
    And I should find "Duration" in the app
    And I should find "Finished" within "Status" "ion-item" in the app
    And I should find "0 out of 1" within "Logic" "ion-item" in the app
    And I should find "0 out of 1" within "Cognition" "ion-item" in the app
    And I should find "0/2" within "Marks" "ion-item" in the app
    And I should find "0 out of 100" within "Grade" "ion-item" in the app

    When I press "Show all questions on one page" in the app
    Then I should find "Question 1" in the app
    And I should find "Question 2" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                   | activity | activityname | course   | other        |
      | \mod_quiz\event\course_module_viewed   | quiz     | Quiz 1       | Course 1 |              |
      | \mod_quiz\event\attempt_started        | quiz     | Quiz 1       | Course 1 |              |
      | \mod_quiz\event\attempt_viewed         | quiz     | Quiz 1       | Course 1 | {"page":"0"} |
      | \mod_quiz\event\attempt_viewed         | quiz     | Quiz 1       | Course 1 | {"page":"1"} |
      | \mod_quiz\event\attempt_updated        | quiz     | Quiz 1       | Course 1 | {"page":"0"} |
      | \mod_quiz\event\attempt_updated        | quiz     | Quiz 1       | Course 1 | {"page":"1"} |
      | \mod_quiz\event\attempt_reviewed       | quiz     | Quiz 1       | Course 1 |              |
      | \mod_quiz\event\attempt_summary_viewed | quiz     | Quiz 1       | Course 1 |              |

    When I go back in the app
    And I press "Attempt 1" in the app
    Then I should find "1" within "Attempt" "ion-item" in the app
    And I should find "Finished" within "Status" "ion-item" in the app
    And I should find "0 out of 1" within "Logic" "ion-item" in the app
    And I should find "0 out of 1" within "Cognition" "ion-item" in the app
    And I should find "0/2" within "Marks" "ion-item" in the app
    And I should find "0 out of 100" within "Grade" "ion-item" in the app
    And I should be able to press "Review" in the app

  Scenario: Attempt a quiz (all question types)
    Given I entered the quiz activity "Quiz 2" on course "Course 1" as "student1" in the app
    When I press "Attempt quiz now" in the app
    And I press "Four" in the app
    And I press "Three" in the app
    And I set the field "Answer" to "Berlin" in the app
    And I press "Next" in the app
    And I wait loading to finish in the app
    And I set the field "Answer" to "testing" in the app
    And I press "Next" in the app
    And I wait loading to finish in the app
    And I set the field "Answer" to "5" in the app
    And I press "Next" in the app
    And I wait loading to finish in the app
    And I set the field "Answer" to "Testing an essay" in the app
    And I press "Next" "ion-button" in the app
    And I wait loading to finish in the app
    And I press "quick" ".drag" in the app
    And I click on ".place1.drop" "css"
    And I press "fox" ".drag" in the app
    And I click on ".place2.drop" "css"
    And I press "lazy" ".drag" in the app
    And I click on ".place3.drop" "css"
    And I press "Next" in the app
    And I wait loading to finish in the app
    And I press "True" in the app
    And I press "Next" in the app
    And I wait loading to finish in the app
    And I set the field "frog" to "amphibian" in the app
    And I set the field "newt" to "insect" in the app
    And I set the field "cat" to "mammal" in the app
    And I press "Next" in the app
    And I wait loading to finish in the app
    Then I should find "Text of the eighth question" in the app

    When I press "Next" in the app
    And I wait loading to finish in the app
    And I set the field "Blank 1" to "cat" in the app
    And I set the field "Blank 2" to "mat" in the app
    And I press "Next" in the app
    And I wait loading to finish in the app
    And I press "abyssal" ".drag" in the app
    And I click on ".place6.dropzone" "css"
    And I press "trench" ".drag" in the app
    And I click on ".place3.dropzone" "css"
    And I press "Next" in the app
    And I wait loading to finish in the app
    And I press "Railway station" ".marker" in the app
    And I click on "img.dropbackground" "css"
    And I press "Submit" in the app
    And I wait loading to finish in the app
    Then I should find "Answer saved" in the app
    And I should find "Incomplete answer" within "10" "ion-item" in the app
    But I should not find "Not yet answered" in the app

    When I press "Submit all and finish" in the app
    Then I should find "Questions without a response: 1" in the app

    When I press "Submit" in the app
    Then I should find "Review" in the app
    And I should find "Finished" in the app
    And I should find "Not yet graded" in the app

    When I press "Correct" within "Question 2" "ion-card" in the app
    Then I should find "The correct answer is: Berlin" in the app
    And I should find "Mark 1.00 out of 1.00" in the app

  Scenario: Submit a quiz & Review a quiz attempt
    Given I entered the quiz activity "Quiz 1" on course "Course 1" as "student1" in the app
    When I press "Attempt quiz now" in the app
    Then I should find "Text of the first question" in the app
    And the UI should match the snapshot

    When I press "True" in the app
    And I press "Next" in the app
    And I wait loading to finish in the app
    And I press "False" in the app
    And I press "Submit" in the app
    And I wait loading to finish in the app
    And I press "Submit all and finish" in the app
    Then I should find "Once you submit" in the app
    But I should not find "Questions without a response" in the app

    When I press "Submit" in the app
    Then I should find "Review" in the app

    When I replace "/.*/" within "page-addon-mod-quiz-review core-loading > ion-card ion-item:nth-child(2) p:nth-child(2)" with "[Started date]"
    And I replace "/.*/" within "page-addon-mod-quiz-review core-loading > ion-card ion-item:nth-child(3) p:nth-child(2)" with "[Completed date]"
    And I replace "/.*/" within "page-addon-mod-quiz-review core-loading > ion-card ion-item:nth-child(4) p:nth-child(2)" with "[Duration]"
    Then the UI should match the snapshot

    Given I open a browser tab with url "$WWWROOT"
    And I am on the "quiz1" Activity page logged in as teacher1
    When I follow "Attempts: 1"
    And I follow "Review attempt"
    Then I should see "Finished"
    And I should see "1.00/2.00"
