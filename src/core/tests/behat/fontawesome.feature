@app_parallel_run_core @core_fontawesome @app @javascript
Feature: Fontawesome icons are correctly shown in the app

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username |
      | student1 |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity   | idnumber | course | name  | intro | printlastmodified | content |
      | page       | page     | C1     | Page  | -     | false             | <i class="fa fa-user"></i><span class="fas fa-hippo"></span><i class="fa-solid fa-poo"></i><i class="fa-regular fa-snowflake fa-10x"></i><i class="fa-brands fa-creative-commons"></i><i class="fa fa-bomb fa-flip-both"></i> |

  Scenario: View fontawesome icons in the app
    Given I entered the page activity "Page" on course "Course 1" as "student1" in the app
    Then the UI should match the snapshot
