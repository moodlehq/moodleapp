@app_parallel_run_quiz @addon_mod_quiz @app @mod @mod_quiz @javascript @lms_from5.3
Feature: Due date is correctly displayed

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
      | activity | name                 | course | idnumber | duedate                         |
      | quiz     | Quiz past due date   | C1     | quiz1    | ## -3 days -2 hours ##          |
      | quiz     | Quiz future due date | C1     | quiz2    | ## +2 days 5 hours 30 minutes## |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype       | name  | questiontext                |
      | Test questions   | truefalse   | TF1   | Text of the first question  |
    And quiz "Quiz past due date" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And quiz "Quiz future due date" contains the following questions:
      | question | page |
      | TF1      | 1    |

  Scenario: Due date is in the past when the quiz is not attempted
    When I entered the course "Course 1" as "student1" in the app
    And I press "Quiz past due date" in the app
    Then I should find "## -3 days -2 hours ##%d %B %Y, %I:%M %p##" near "Due:" in the app
    And I should find "Quiz is overdue" in the app

  Scenario: Due date is in the future when the quiz is not attempted
    When I entered the course "Course 1" as "student1" in the app
    And I press "Quiz future due date" in the app
    Then I should find "##+2 days 5 hours 30 minutes##%d %B %Y, %I:%M %p##" near "Due:" in the app
    And I should find "Quiz is due in 2 days 5 hours" in the app

  Scenario: Due date is in the past when the quiz is attempted
    Given user "student1" has attempted "Quiz past due date" with responses:
      | slot | response |
      |   1  | True     |
    When I entered the course "Course 1" as "student1" in the app
    And I press "Quiz past due date" in the app
    Then I should find "## -3 days -2 hours ##%d %B %Y, %I:%M %p##" near "Due:" in the app
    And I should find "Quiz was finished 3 days 2 hours late" in the app

  Scenario: Due date is in the future when the quiz is attempted
    Given user "student1" has attempted "Quiz future due date" with responses:
      | slot | response |
      |   1  | True     |
    When I entered the course "Course 1" as "student1" in the app
    And I press "Quiz future due date" in the app
    Then I should find "##+2 days 5 hours 30 minutes##%d %B %Y, %I:%M %p##" near "Due:" in the app
    And I should find "Quiz was finished 2 days 5 hours early" in the app
