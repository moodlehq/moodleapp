@app_parallel_run_core @core_lang @app @javascript
Feature: Custom lang strings

  Background:
    Given the following "users" exist:
      | username |
      | student1 |

  Scenario: Customlangstrings without whitespaces
    Given the following config values are set as admin:
      | customlangstrings | core.courses.mycourses\|Foo\|en | tool_mobile |
    When I entered the app as "student1"
    Then I should be able to press "Foo" in the app

  Scenario: Customlangstrings with whitespaces
    Given the following config values are set as admin:
      | customlangstrings | core.courses.mycourses\| Foo with whitespaces \|en | tool_mobile |
    When I entered the app as "student1"
    Then I should be able to press "Foo with whitespaces" in the app
