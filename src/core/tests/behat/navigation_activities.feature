@app_parallel_run_core @core_navigation @app @javascript
Feature: It navigates properly within activities.

  Background:
    Given the following "users" exist:
      | username |
      | student  |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user    | course | role    |
      | student | C1     | student |
    And the following "activities" exist:
      | activity   | idnumber | course | name  | intro             | content |
      | label      | label    | C1     | Label | Label description | -       |
      | page       | page     | C1     | Page  | -                 | <a href="/mod/label/view.php?id=${label:cmid}">Go to label</a> |
    And I replace the arguments in "page" "content"

  Scenario: Navigates using deep links
    Given I entered the course "Course 1" as "student" in the app
    When I press "Page" in the app
    And I press "Go to label" in the app
    Then I should find "Label description" in the app

    When I go back in the app
    Then I should find "Go to label" in the app

    When I go back in the app
    Then I should find "Label description" in the app
