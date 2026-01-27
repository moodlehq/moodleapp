@app_parallel_run_course @core_course @app @core @javascript @mod_bigbluebuttonbn

Feature: Forced course language is applied in the app
  In order to ensure users see the course in the correct language
  As a user
  I want the app to apply the forced course language when set

  Background:
    Given the following "courses" exist:
      | fullname         | shortname | lang |
      | English Course   | ENGC      | en   |
      | Spanish Course   | ESPC      | es   |
    And I enable "bigbluebuttonbn" "mod" plugin
    And the following "activities" exist:
      | activity        | name                   | intro | course   | lang |
      | assign          | Test assignment name   | -     | ESPC     | ca   |
      | bigbluebuttonbn | Test BBB name          | -     | ESPC     | ca   |
      | book            | Test book name         | -     | ESPC     | ca   |
      | choice          | Test choice name       | -     | ESPC     | ca   |
      | data            | Test database name     | -     | ESPC     | ca   |
      | feedback        | Test feedback name     | -     | ESPC     | ca   |
      | folder          | Test folder name       | -     | ESPC     | ca   |
      | forum           | Test forum name        | -     | ESPC     | ca   |
      | glossary        | Test glossary name     | -     | ESPC     | ca   |
      | h5pactivity     | Test h5pactivity name  | -     | ESPC     | ca   |
      | imscp           | Test imscp name        | -     | ESPC     | ca   |
      | lesson          | Test lesson name       | -     | ESPC     | ca   |
      | lti             | Test lti name          | -     | ESPC     | ca   |
      | page            | Test page name ca      | -     | ESPC     | ca   |
      | page            | Test page name es      | -     | ESPC     |      |
      | page            | Test page name en      | -     | ESPC     | en   |
      | quiz            | Test quiz name         | -     | ESPC     | ca   |
      | resource        | Test resource name     | -     | ESPC     | ca   |
      | scorm           | Test scorm name        | -     | ESPC     | ca   |
      | url             | Test url name          | -     | ESPC     | ca   |
      | wiki            | Test wiki name         | -     | ESPC     | ca   |
      | workshop        | Test workshop name     | -     | ESPC     | ca   |
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

    # Assignment does not have any force language support in the app.
    # Until MDL-87241 is solved, the fallback will be the course language.
    And I press "Test assignment name" in the app
    Then I should find "Estado de la entrega" in the app

    When I go back in the app
    And I press "Test BBB name" in the app
    Then I should find "No hi ha cap enregistrament disponible" in the app

    When I go back in the app
    And I press "Test book name" in the app
    Then I should find "Taula de continguts" in the app

    When I go back in the app
    And I press "Test choice name" in the app
    Then I should find "A hores d'ara" in the app

    When I go back in the app
    And I press "Test database name" in the app
    Then I should find "Encara no hi ha entrades" in the app

    When I go back in the app
    And I press "Test feedback name" in the app
    Then I should find "Encara no s'han definit preguntes" in the app
    When I press "OK" in the app

    When I go back in the app
    And I press "Test folder name" in the app
    Then I should find "No hi ha fitxers per mostrar" in the app

    When I go back in the app
    And I press "Test forum name" in the app
    Then I should find "Encara no hi ha temes de debat" in the app

    When I go back in the app
    And I press "Test glossary name" in the app
    Then I should find "No s'han trobat entrades" in the app

    # H5P does not have any force language support in the app.
    # Until MDL-87241 is solved, the fallback will be the course language.
    When I go back in the app
    And I press "Test h5pactivity name" in the app
    Then I press "Deshabilitar pantalla completa" in the app

    When I go back in the app
    And I press "Test imscp name" in the app
    Then I should find "Taula de continguts" in the app

    When I go back in the app
    And I press "Test lesson name" in the app
    Then I should find "Aquesta lliçó encara" in the app

    When I go back in the app
    And I press "Test lti name" in the app
    Then I should find "Executa l'activitat" in the app

    When I go back in the app
    And I press "Test page name ca" in the app
    Then I should find "Darrera modificació" in the app

    When I go back in the app
    And I press "Test page name es" in the app
    Then I should find "Última modificación" in the app

    When I go back in the app
    And I press "Test page name en" in the app
    Then I should find "Last modified" in the app

    When I go back in the app
    And I press "Test quiz name" in the app
    Then I should find "Encara no s'han afegit preguntes" in the app

    When I go back in the app
    And I press "Test resource name" in the app
    Then I should find "Darrera modificació" in the app

    When I go back in the app
    And I press "Test scorm name" in the app
    Then I should find "Intents" in the app

    When I go back in the app
    And I press "Test url name" in the app
    Then I should find "La URL on apunta aquest recurs" in the app

    When I go back in the app
    And I press "Test wiki name" in the app
    Then I should find "No hi ha contingut per a aquesta pàgina" in the app

    When I go back in the app
    And I press "Test workshop name" in the app
    Then I should find "Fase de configuració" in the app

    When I go back to the root page in the app
    Then I should find "My courses" in the app

    When I press "English Course" in the app
    Then I should find "Course" in the app
    Then I should find "Alumni" in the app

    When I go back in the app
    Then I should find "My courses" in the app
