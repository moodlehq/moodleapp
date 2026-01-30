
@app_parallel_run_quiz @addon_mod_quiz @app @mod @mod_quiz @javascript @singleactivity @forced_language
Feature: Test single activity of quiz type in app
  In order to view a quiz while using the mobile app
  As a student
  I need single activity of quiz type functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | First     | Student  |
    And the following "courses" exist:
      | fullname                    | shortname | category | format         | activitytype | lang |
      | Single activity quiz course | C1        | 0        | singleactivity | quiz         | es   |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity | name                  | intro                  | course | idnumber | lang |
      | quiz     | Single activity quiz  | Test quiz description  | C1     | quiz1    | ca   |
    And the following "language pack" exists:
      | language | es | ca |

  Scenario: Single activity quiz
    Given I entered the course "Single activity quiz course" as "student1" in the app
    Then I should find "Single activity quiz course" in the app

    When I set "page-core-course-index core-course-image" styles to "background" "lightblue"
    And I set "page-core-course-index core-course-image" styles to "--core-image-visibility" "hidden"
    Then the UI should match the snapshot
    And I should find "Encara no s'han afegit preguntes" in the app

    When I press "Participants" in the app
    Then I should find "Último acceso" in the app
    And I should find "Participantes" in the app
