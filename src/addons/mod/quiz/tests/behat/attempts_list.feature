@app_parallel_run_quiz @addon_mod_quiz @app @mod @mod_quiz @javascript
Feature: View list of attempts in the app

  Background:
    Given the Moodle site is compatible with this feature
    And the following "courses" exist:
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
    And quiz "Quiz 1" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And user "student1" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | True     |
    And user "student1" has started an attempt at quiz "Quiz 1"

  Scenario: View finished and in progress attempts
    Given I entered the quiz activity "Quiz 1" on course "Course 1" as "student1" in the app
    Then I should find "In progress" within "Attempt 2" "ion-item" in the app
    And I should find "Finished" within "Attempt 1" "ion-item" in the app
    And I should find "100.00 / 100.00" within "Attempt 1" "ion-item" in the app
    But I should not find "100.00" within "Attempt 2" "ion-item" in the app
    And I should not find "Started" within "Your attempts" "ion-card" in the app
    And I should not find "Completed" within "Your attempts" "ion-card" in the app
    And I should not find "Marks" within "Your attempts" "ion-card" in the app
    And I should not be able to press "Review" in the app

    When I press "Attempt 1" in the app
    Then I should find "Started" within "Your attempts" "ion-card" in the app
    And I should find "Completed" in the app
    And I should find "1.00/1.00" within "Marks" "ion-item" in the app
    And I should be able to press "Review" in the app

  @lms_from4.2
  Scenario: View abandoned attempts
    Given the attempt at "Quiz 1" by "student1" was never submitted
    And I entered the quiz activity "Quiz 1" on course "Course 1" as "student1" in the app
    Then I should find "Never submitted" within "Attempt 2" "ion-item" in the app
    But I should not find "100.00" within "Attempt 2" "ion-item" in the app

    When I press "Attempt 2" in the app
    Then I should find "Started" within "Your attempts" "ion-card" in the app
    And I should be able to press "Review" in the app
    But I should not find "Completed" in the app
    And I should not find "Marks" in the app
    And I should not find "Grade" in the app

  @lms_from5.2
  Scenario: View overall feedback for attempt when cannot view grades
    Given the following "users" exist:
      | username |
      | teacher1 |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
    Given the following "activity" exists:
      | activity                    | quiz   |
      | name                        | Quiz 2 |
      | course                      | C1     |
      | marksimmediately            | 0      |
      | marksopen                   | 0      |
      | marksclosed                 | 0      |
      | maxmarksimmediately         | 0      |
      | maxmarksopen                | 0      |
      | maxmarksclosed              | 0      |
      | specificfeedbackimmediately | 0      |
      | specificfeedbackopen        | 0      |
      | specificfeedbackclosed      | 0      |
      | generalfeedbackimmediately  | 0      |
      | generalfeedbackopen         | 0      |
      | generalfeedbackclosed       | 0      |
      | rightanswerimmediately      | 0      |
      | rightansweropen             | 0      |
      | rightanswerclosed           | 0      |
      | attemptimmediately          | 1      |
      | attemptopen                 | 1      |
      | attemptclosed               | 1      |
      | overallfeedbackimmediately  | 1      |
      | overallfeedbackopen         | 1      |
      | overallfeedbackclosed       | 1      |
      | idnumber                    | quiz2  |
    And the following "questions" exist:
      | questioncategory | qtype       | name  | questiontext                |
      | Test questions   | truefalse   | TF2   | Text of the second question |
      | Test questions   | truefalse   | TF3   | Text of the third question  |
    And quiz "Quiz 2" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 1    |
      | TF3      | 1    |
    And user "student1" has attempted "Quiz 2" with responses:
      | slot | response |
      | 1    | True     |
      | 2    | True     |
      | 3    | False    |
    And user "student1" has attempted "Quiz 2" with responses:
      | slot | response |
      | 1    | False    |
      | 2    | False    |
      | 3    | False    |
    # TODO rewrite using generators.
    And I am on the "quiz2" "Activity" page logged in as teacher1
    And I click on "Settings" "link"
    And I expand all fieldsets
    And I click on "Add 3 more feedback fields" "button"
    And I expand all fieldsets
    And I set the following fields to these values:
      | id_feedbacktext_0       | Good! |
      | id_feedbacktext_1       | Bad!  |
      | id_feedbackboundaries_0 | 50%   |
    And I click on "Save and display" "button"
    And I log out
    And I entered the quiz activity "Quiz 2" on course "Course 1" as "student1" in the app
    When I press "Attempt 1" in the app
    Then I should find "Good!" within "Feedback" "ion-item" in the app
    And I should not find "Marks" in the app
    And I should not find "Grade" in the app

    When I press "Attempt 2" in the app
    Then I should find "Bad!" within "Feedback" "ion-item" in the app
    And I should not find "Marks" in the app
    And I should not find "Grade" in the app
