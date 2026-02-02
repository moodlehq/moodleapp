@app_parallel_run_course @core_course @app @core @javascript @forced_language

Feature: Forced course language is applied in the app
  In order to ensure users see the course in the correct language
  As a user
  I want the app to apply the forced course language when set

  Background:
    Given the following "courses" exist:
      | fullname         | shortname | lang |
      | English Course   | ENGC      | en   |
      | Spanish Course   | ESPC      | es   |
    And the following "activities" exist:
      | activity        | name                   | intro | course   | lang |
      | page            | Test page name ca      | -     | ESPC     | ca   |
      | page            | Test page name es      | -     | ENGC     | es   |
    And the following "users" exist:
      | username | firstname | lastname |
      | student  | Student   | 1        |
    And the following "course enrolments" exist:
      | user    | course   | role           |
      | student | ENGC     | student        |
      | student | ESPC     | student        |
    And I log in as "admin"
    And I navigate to "General > Mobile app > Mobile features" in site administration
    And I set the field "Custom language strings" to multiline:
    """
    core.user.participants|Alumnos|es
    core.user.participants|Alumni|en
    """
    And I press "Save changes"
    And the following "language pack" exists:
      | language | es | ca |

  Scenario: Forced course and module language is applied when entering a course or activity
    Given I entered the app as "student"
    When I press "My courses" in the app
    And I press "Spanish Course" in the app
    Then I should find "Curso" in the app
    And I should find "Alumnos" in the app

    When I press "Test page name ca" in the app
    Then I should find "Darrera modificació" in the app

    When I go back in the app
    Then I should find "Curso" in the app

    When I go back in the app
    Then I should find "My courses" in the app

    When I press "English Course" in the app
    Then I should find "Course" in the app
    Then I should find "Alumni" in the app

    When I press "Test page name es" in the app
    Then I should find "Última modificación" in the app

    When I go back to the root page in the app
    Then I should find "My courses" in the app

    When I press the user menu button in the app
    And I press "Grades" in the app
    And I press "Spanish Course" in the app
    Then I should find "Calificación" in the app

    When I go back to the root page in the app
    And I press "Home" in the app
    And I press "Open block drawer" in the app
    And I press "Test page name ca" in the app
    Then I should find "Darrera modificació" in the app
