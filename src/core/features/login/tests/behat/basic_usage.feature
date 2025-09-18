@core_login @app @core @javascript
Feature: Test basic usage of login in app
  I need basic login functionality to work

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | david     | student  |
      | student2 | pau       | student2 |
      | teacher1 | juan      | teacher  |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | teacher1 | C1     | editingteacher |

  Scenario: Skip on boarding
    Given the app has the following config:
     | enableonboarding | true |
    When I launch the app
    Then I should find "Welcome to the Moodle App!" in the app

    When I press "Skip" in the app
    Then I should not find "Skip" in the app
    And I should find "Connect to Moodle" in the app

  Scenario: Complete on boarding
    Given the app has the following config:
     | enableonboarding | true |
    When I launch the app
    Then I should find "Welcome to the Moodle App!" in the app

    When I press "I'm an educator" in the app
    And I press "I need a Moodle site" in the app
    And I press "Get started with Moodle" in the app
    And I switch to the browser tab opened by the app
    And I close the browser tab opened by the app
    Then I should find "Connect to Moodle" in the app
    When I restart the app
    Then I should find "Connect to Moodle" in the app

  Scenario: Add a new account in the app & Site name in displayed when adding a new account
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Acceptance test site" in the app
    And I replace "/.*/" within ".core-siteurl" with "https://campus.example.edu"
    And the UI should match the snapshot

    When I set the following fields to these values in the app:
      | Username | student1 |
      | Password | student1 |
    And I press "Log in" near "Lost password?" in the app
    Then the header should be "Acceptance test site" in the app
    And the UI should match the snapshot
    When I restart the app
    Then the header should be "Acceptance test site" in the app

  Scenario: Add a non existing account
    When I launch the app
    And I set the field "Your site" to "wrongsiteaddress" in the app
    And I press "Connect to your site" in the app
    Then I should find "Can't connect to site" in the app

  Scenario: Attempt invalid login
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I set the following fields to these values in the app:
      | Username | student1      |
      | Password | wrongpassword |
    And I press "Log in" near "Lost password?" in the app
    Then I should find "Invalid login" in the app

  Scenario: Add a non existing account from accounts switcher
    Given I entered the app as "student1"
    And I press the user menu button in the app
    And I press "Switch account" in the app
    And I press "Add" in the app
    And I wait the app to restart
    And I set the field "Your site" to "wrongsiteaddress" in the app
    And I press "Connect to your site" in the app
    Then I should find "Can't connect to site" in the app

  Scenario: Delete an account
    Given I entered the app as "student1"
    When I log out in the app
    Then I should find "Acceptance test site" in the app
    And I press "Edit accounts list" in the app
    And I press "Remove account" near "Acceptance test site" in the app
    And I press "Delete" near "Are you sure you want to remove the account on Acceptance test site?" in the app
    Then I should find "Connect to Moodle" in the app
    But I should not find "Acceptance test site" in the app

  Scenario: Require minium (previous) version of the app for a site
    # Log in with a previous required version
    Given the following config values are set as admin:
      | minimumversion | 3.8.1 | tool_mobile |
    When I enter the app
    Then I should not find "App update required" in the app

  Scenario: Require minium (future) version of the app for a site
    # Log in with a future required version
    Given the following config values are set as admin:
      | minimumversion | 11.0.0 | tool_mobile |
    When I enter the app
    Then I should find "App update required" in the app

  @lms_from4.3
  Scenario: Force password change
    Given I force a password change for user "student1"
    When I enter the app
    And I log in as "student1"
    Then I should find "Change password" in the app
    And I should find "You must change your password to proceed." in the app

    When I press "Change password" "ion-button" in the app
    Then the app should have opened a browser tab with url "$WWWROOTPATTERN"

    When I close the browser tab opened by the app
    Then I should find "If you didn't change your password correctly, you'll be asked to do it again." in the app
    But I should not find "Change password" in the app

    When I press "Reconnect" in the app
    Then I should find "Change password" in the app
    But I should not find "Reconnect" in the app

    When I press "Switch account" in the app
    Then I should find "Accounts" in the app
    And I should find "david student" in the app

    When I press "david student" in the app
    Then I should find "Change password" in the app
    But I should not find "Reconnect" in the app

    When I press "Change password" "ion-button" in the app
    Then the app should have opened a browser tab with url "$WWWROOTPATTERN"

    When I switch to the browser tab opened by the app
    And I set the field "username" to "student1"
    And I set the field "password" to "student1"
    And I click on "Log in" "button"
    Then I should see "You must change your password to proceed"

    When I set the field "Current password" to "student1"
    And I set the field "New password" to "NewPassword1*"
    And I set the field "New password (again)" to "NewPassword1*"
    And I click on "Log out of all web apps" "checkbox"
    And I click on "Save changes" "button"
    Then I should see "Password has been changed"

    When I close the browser tab opened by the app
    Then I should find "If you didn't change your password correctly, you'll be asked to do it again." in the app
    But I should not find "Change password" in the app

    When I press "Reconnect" in the app
    Then I should find "Acceptance test site" in the app

  Scenario: Forgot password
    Given the following config values are set as admin:
      | supportavailability | 2 |
    When I enter the app
    And I press "Lost password?" in the app
    And I set the field "Enter either username or email address" to "student1"
    And I press "Search" in the app
    Then I should find "Success" in the app

    When I press "OK" in the app
    And I press "Lost password?" in the app
    Then I should find "Contact support" in the app

  Scenario: Shows sites list
    Given the app has the following config:
      | sites | [{"name":"Xavier's School for Gifted Youngsters","alias":"XSGY","imageurl":"https://x-school.campus.edu/logo.png","city":"North Salem","countrycode":"US","url":"https://x-school.campus.edu"},{"name":"Hogwarts", "url":"https://hogwarts.campus.edu"},{"name":"Acceptance test site","url":"$WWWROOT"}] |
    When I launch the app
    Then I should find "Xavier's School for Gifted Youngsters (XSGY)" in the app

    When I replace "/.*/" within "ion-list ion-item:last-of-type ion-label p:last-of-type" with "campus.example.edu"
    Then the UI should match the snapshot

    When I press "Acceptance test site" in the app
    Then I should find "Log in" in the app

    When I set the following fields to these values in the app:
      | Username | student1 |
      | Password | student1 |
    And I press "Log in" near "Lost password?" in the app
    Then the header should be "Acceptance test site" in the app

  Scenario: Exceeded login attempts
    Given the following config values are set as admin:
      | supportavailability | 2 |
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I set the following fields to these values in the app:
      | Username | wrong       |
      | Password | credentials |
    And I press "Log in" near "Lost password?" in the app
    Then I should find "Invalid login" in the app

    When I press "OK" in the app
    Then I should not find "Need help logging in?" in the app

    When I press "Log in" near "Lost password?" in the app
    And I press "OK" in the app
    Then I should not find "Need help logging in?" in the app

    When I press "Log in" near "Lost password?" in the app
    And I press "OK" in the app
    Then I should find "Need help logging in?" in the app

    When I press "recovering your password" in the app
    Then I should find "Forgotten password" in the app
    And I should find "To reset your password" in the app

    When I go back in the app
    And I press "Contact support" in the app
    Then the app should have opened a browser tab with url ".*\/user\/contactsitesupport\.php"

  Scenario: Reset password invalid parameters
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I press "Lost password?" in the app
    Then I set the following fields to these values in the app:
      | Enter either username or email address | test#test |
    And I press "Search" in the app
    And I should find "The given username contains invalid characters" in the app
