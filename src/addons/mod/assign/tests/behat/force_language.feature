@app_parallel_run_assign @addon_mod_assign @app @mod @mod_assign @javascript @forced_language

Feature: Forced activity language is applied in the app
  In order to ensure users see the activity in the correct language
  As a user
  I want the app to apply the forced activity language when set

  Background:
    Given the following "courses" exist:
      | fullname   | shortname | lang |
      | Course 1   | C1        | es   |
    And the following "activities" exist:
      | activity        | name                   | intro | course   | lang |
      | assign          | Test assignment name   | -     | C1       | ca   |
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

    # Assignment does not have any force language support in the app.
    # Until MDL-87241 is solved, the fallback will be the course language.
    When I press "Test assignment name" in the app
    Then I should find "Estado de la entrega" in the app
