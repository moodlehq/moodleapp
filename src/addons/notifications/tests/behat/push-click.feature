@app_parallel_run_notifications @addon_notifications @app @core @core_message @javascript
Feature: Notifications

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | First     | Student  |
      | student2 | Second    | Student  |
    And the following "notifications" exist:
      | subject  | userfrom | userto   | timecreated | timeread   |
      | Test 01  | student2 | student1 | 1649766600  | null       |
      | Test 02  | student2 | student1 | 1649766601  | null       |

  Scenario: Handle contexturl in push notifications
    Given I entered the app as "student1"
    When I click a push notification in the app for:
      | username | message   | title   | contexturl                      |
      | student1 | Test push | Push 01 | #wwwroot#/message/index.php     |
    Then the header should be "Messages" in the app
    And I should find "Contacts" in the app

    # Test unsupported URL.
    When I click a push notification in the app for:
      | username | message   | title   | contexturl                 |
      | student1 | Test push | Push 01 | #wwwroot#/admin/search.php |
    Then the header should be "Notifications" in the app
    And I should find "Push 01" in the app
    And I should find "Test push" in the app

  Scenario: Handle appurl and appurlopenin values in push notifications
    Given I entered the app as "student1"
    When I click a push notification in the app for:
      | username | message   | title   | appurl                      | appurlopenin |
      | student1 | Test push | Push 01 | #wwwroot#/message/index.php | browser      |
    Then I should find "You are about to leave the app" in the app
    And I should find "$WWWROOT/message/index.php" in the app

    # In Behat there's no difference between system browser and embedded browser, just check that the browser confirmation isn't shown.
    When I press "Cancel" in the app
    And I click a push notification in the app for:
      | username | message   | title   | appurl                      | appurlopenin |
      | student1 | Test push | Push 01 | #wwwroot#/message/index.php | inappbrowser |
    Then the app should have opened a browser tab with url "$WWWROOTPATTERN"

    # Test legacy value.
    When I close the browser tab opened by the app
    And I click a push notification in the app for:
      | username | message   | title   | appurl                      | appurlopenin |
      | student1 | Test push | Push 01 | #wwwroot#/message/index.php | inapp        |
    Then the app should have opened a browser tab with url "$WWWROOTPATTERN"

    When I close the browser tab opened by the app
    And I click a push notification in the app for:
      | username | message   | title   | appurl                      | appurlopenin |
      | student1 | Test push | Push 01 | #wwwroot#/message/index.php | embedded     |
    Then the header should be "Push 01" in the app
    And "iframe[src*='/message/index.php']" "css_element" should exist

    # Default appurlopenin value is capture the link and open it in the app if supported.
    When I go back in the app
    And I click a push notification in the app for:
      | username | message   | title   | appurl                      |
      | student1 | Test push | Push 01 | #wwwroot#/message/index.php |
    Then the header should be "Messages" in the app
    And I should find "Contacts" in the app

    # If appurl is not supported by the app, ignore the appurl and fallback to other notification fields.
    When I click a push notification in the app for:
      | username | message   | title   | appurl                     | appurlopenin |
      | student1 | Test push | Push 01 | #wwwroot#/admin/search.php | app          |
    Then the header should be "Notifications" in the app
    And I should find "Push 01" in the app
    And I should find "Test push" in the app

  Scenario: Display extendedtext of push notifications
    Given I entered the app as "student1"
    When I click a push notification in the app for:
      | username | message   | title   | extendedtext              |
      | student1 | Test push | Push 01 | This is my extended text. |
    Then I should find "Push 01" in the app
    And I should find "This is my extended text." in the app
    And I should find "Copy to clipboard" in the app
    And I should not find "Test push" in the app
