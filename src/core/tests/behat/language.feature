@core_lang @app @javascript
Feature: Test language changes

  Background:
    Given the following "users" exist:
      | username |
      | student1 |

  Scenario: User can change language
    Given I entered the app as "student1"
    When I press the more menu button in the app
    And I press "App settings" in the app
    And I press "General" in the app
    And I press "Language" in the app
    And I press "Català" in the app
    And I press "Canvia a Català" in the app
    And I wait the app to restart

    Then I should find "Els meus cursos" in the app

    When I change language to "es" in the app
    Then I should find "Mis cursos" in the app
