@app_parallel_run_page @addon_mod_page @app @mod @mod_page @javascript @forced_language

Feature: Forced activity language is applied in the app
  In order to ensure users see the activity in the correct language
  As a user
  I want the app to apply the forced activity language when set

  Background:
    Given the following "courses" exist:
      | fullname   | shortname | lang |
      | Course 1   | C1        | es   |
    And the following "activities" exist:
      | activity | name             | intro | course | lang |
      | page     | Test page name ca| -     | C1     | ca   |
      | page     | Test page name es| -     | C1     |      |
      | page     | Test page name en| -     | C1     | en   |
    And the following "users" exist:
      | username | firstname | lastname |
      | student  | Student   | 1        |
    And the following "course enrolments" exist:
      | user    | course     | role           |
      | student | C1         | student        |
    And the following "language pack" exists:
      | language | es | ca |

  Scenario: Forced course and module language is applied when entering a course or activity
    Given I entered the course "Course 1" as "student" in the app
    Then I should find "Curso" in the app
    When I press "Test page name ca" in the app
    Then I should find "Darrera modificació" in the app

    When I go back in the app
    And I press "Test page name es" in the app
    Then I should find "Última modificación" in the app

    When I go back in the app
    And I press "Test page name en" in the app
    Then I should find "Last modified" in the app
