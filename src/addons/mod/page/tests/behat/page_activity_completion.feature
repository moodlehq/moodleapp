@app_parallel_run_page @addon_mod_page @app @mod @mod_page @javascript @core_completion
Feature: View activity completion information in the Page resource
  In order to have visibility of page completion requirements
  As a student
  I need to be able to view my page completion progress

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Vinnie    | Student1 | student1@example.com |
      | teacher1 | Darrell   | Teacher1 | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | enablecompletion | showcompletionconditions |
      | Course 1 | C1        | 0        | 1                | 1                        |
      | Course 2 | C2        | 0        | 1                | 0                        |
    And the following "course enrolments" exist:
      | user | course | role           |
      | student1 | C1 | student        |
      | student1 | C2 | student        |
      | teacher1 | C1 | editingteacher |
      | teacher1 | C2 | editingteacher |

  Scenario: A teacher can view a page resource automatic completion items
    Given the following "activity" exists:
      | activity       | page                     |
      | course         | C1                       |
      | idnumber       | page1                    |
      | name           | Music history            |
      | intro          | A lesson learned in life |
      | completion     | 2                        |
      | completionview | 1                        |
    When I entered the course "Course 1" as "teacher1" in the app
    And I press "Completion" within "Music history" "ion-card" in the app
    Then I should not find "To do:" in the app
    And I should find "View" in the app
    When I close the popup in the app
    And I press "Music history" in the app
    Then the header should be "Music history" in the app
    When I press "Completion" in the app
    Then I should not find "To do:" in the app
    And I should find "View" in the app

  Scenario: A student can complete a page resource by viewing it
    Given the following "activity" exists:
      | activity       | page                     |
      | course         | C1                       |
      | idnumber       | page1                    |
      | name           | Music history            |
      | intro          | A lesson learned in life |
      | completion     | 2                        |
      | completionview | 1                        |
    When I entered the course "Course 1" as "student1" in the app
    And I press "To do" within "Music history" "ion-card" in the app
    Then I should find "To do:" in the app
    And I should find "View" in the app
    When I close the popup in the app
    And I press "Music history" in the app
    Then the header should be "Music history" in the app
    When I press "Done" in the app
    Then I should find "Done:" in the app
    And I should find "View" in the app
    When I close the popup in the app
    And I go back in the app
    And I press "Done" within "Music history" "ion-card" in the app
    Then I should find "Done:" in the app
    And I should find "View" in the app

  Scenario: A teacher cannot manually mark the page activity as done
    Given the following "activity" exists:
      | activity   | page                     |
      | course     | C1                       |
      | idnumber   | page1                    |
      | name       | Music history            |
      | intro      | A lesson learned in life |
      | completion | 1                        |
    When I entered the course "Course 1" as "teacher1" in the app
    And I press "Completion" within "Music history" "ion-card" in the app
    Then I should find "Mark as done" in the app
    When I close the popup in the app
    And I press "Music history" in the app
    Then the header should be "Music history" in the app
    And I should find "Mark as done" in the app
    But I should not be able to press "Mark as done" in the app

  Scenario: A student can manually mark the page activity as done
    Given the following "activity" exists:
      | activity   | page                     |
      | course     | C1                       |
      | idnumber   | page1                    |
      | name       | Music history            |
      | intro      | A lesson learned in life |
      | completion | 1                        |
    When I entered the course "Course 1" as "student1" in the app
    And I press "Mark as done" within "Music history" "ion-card" in the app
    Then I should find "Done" in the app
    When I press "Done" within "Music history" "ion-card" in the app
    Then I should find "Mark as done" in the app
    When I press "Music history" in the app
    Then the header should be "Music history" in the app
    When I press "Mark as done" in the app
    Then I should find "Done" in the app
    When I press "Done" in the app
    Then I should find "Mark as done" in the app

  Scenario: The manual completion button will not be shown on the course page if the Show activity completion conditions is set to No as teacher
    Given the following "activity" exists:
      | activity   | page                     |
      | course     | C2                       |
      | idnumber   | page1                    |
      | name       | Music history            |
      | intro      | A lesson learned in life |
      | completion | 1                        |
    When I entered the course "Course 2" as "teacher1" in the app
    Then I should not find "Mark as done" in the app
    Then I should not find "Completion" in the app
    When I press "Music history" in the app
    Then the header should be "Music history" in the app
    And I should find "Mark as done" in the app

  Scenario: The manual completion button will not be shown on the course page if the Show activity completion conditions is set to No as student
    Given the following "activity" exists:
      | activity   | page                     |
      | course     | C2                       |
      | idnumber   | page1                    |
      | name       | Music history            |
      | intro      | A lesson learned in life |
      | completion | 1                        |
    When I entered the course "Course 2" as "student1" in the app
    Then I should not find "Mark as done" in the app
    When I press "Music history" in the app
    Then the header should be "Music history" in the app
    And I should find "Mark as done" in the app
