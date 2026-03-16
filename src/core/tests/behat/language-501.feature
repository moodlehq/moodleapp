@app_parallel_run_core @core_lang @app @javascript @lms_upto5.1
Feature: Test language changes

  Background:
    Given the Moodle site is compatible with this feature
    And the following config values are set as admin:
      | enablemycourses | 1 |
    And the following "users" exist:
      | username |
      | student1 |

  Scenario: Custom lang strings
    Given I log in as "admin"
    And I navigate to "General > Mobile app > Mobile features" in site administration
    And I set the field "Custom language strings" to multiline:
    """
    core.courses.mycourses|FooBar|en
    core.courses.mycourses| Foo amb espais |ca
    addon.block_timeline.pluginname| No content here |en_us
    """
    And I press "Save changes"

    When I entered the app as "student1"
    Then I should be able to press "FooBar" in the app
    Then I should not find "No content here" in the app

    When I change language to "ca" in the app
    Then I should be able to press "Foo amb espais" in the app

    When I change language to "en_us" in the app
    Then I should be able to press "FooBar" in the app
    Then I should find "No content here" in the app
