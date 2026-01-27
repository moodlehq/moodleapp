@app_parallel_run_core @core_lang @app @javascript
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

    # core.courses.mycourses text
    Then I should find "Els meus cursos" in the app

    # Test parent language
    When I change language to "de-du" in the app
    # Find an specific text for German (du) translation.
    And I press the more menu button in the app
    # addon.blog.siteblogheading text from original German translation.
    And I press "Website-Blog" in the app
    # addon.blog.showonlyyourentries text from original German (du) translation.
    Then I should find "Nur deine Beiträge anzeigen" in the app
    But I should not find "Nur Ihre Beiträge anzeigen" in the app

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
