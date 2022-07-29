@core @core_user @app @javascript
Feature: Test basic usage of user features

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | Student   | Student  |

  Scenario: Complete missing fields
    Given the following "custom profile fields" exist:
      | datatype | shortname  | name           | required |
      | text     | food       | Favourite food | 1        |
    When I enter the app
    And I log in as "student1"
    Then I should find "Complete your profile" in the app
    And I should find "Before you continue, please fill in the required fields in your user profile." in the app

    When I press "Complete profile" in the app
    Then the app should have opened a browser tab with url "webserver"

    When I close the browser tab opened by the app
    Then I should find "If you didn't complete your profile correctly, you'll be asked to do it again." in the app
    But I should not find "Complete your profile" in the app

    When I press "Reconnect" in the app
    Then I should find "Complete your profile" in the app
    But I should not find "Reconnect" in the app

    When I press "Switch account" in the app
    Then I should find "Accounts" in the app
    And I should find "Student Student" in the app

    When I press "Student Student" in the app
    Then I should find "Complete your profile" in the app
    But I should not find "Reconnect" in the app

    When I press "Complete profile" in the app
    Then the app should have opened a browser tab with url "webserver"

    When I switch to the browser tab opened by the app
    And I set the field "username" to "student1"
    And I set the field "password" to "student1"
    And I click on "Log in" "button"
    And I set the field "Favourite food" to "Pasta"
    And I click on "Update profile" "button"
    Then I should see "Changes saved"

    When I close the browser tab opened by the app
    Then I should find "If you didn't complete your profile correctly, you'll be asked to do it again." in the app
    But I should not find "Complete your profile" in the app

    When I press "Reconnect" in the app
    Then I should find "Acceptance test site" in the app
