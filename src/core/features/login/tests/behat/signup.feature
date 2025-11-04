@core_login @app @auth @auth_email @javascript
Feature: Test signup in app
  I need basic signup functionality to work

  Background:
    Given the Moodle site is compatible with this feature
    And the following config values are set as admin:
      | registerauth | email |
      | auth_instructions | These are the authentication instructions. |
      | passwordpolicy | 0 |

  Scenario: View auth instructions even if signup is disabled
    Given the following config values are set as admin:
      | registerauth |  |
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Is this your first time here?" in the app
    And I should find "These are the authentication instructions." in the app
    But I should not find "Create new account" in the app

  Scenario: Basic signup
    When I launch the app

    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Is this your first time here?" in the app
    And I should find "These are the authentication instructions." in the app

    When I press "Create new account" in the app
    Then I should find "New account" in the app
    And I should find "Acceptance test site" in the app
    But I should not find "These are the authentication instructions." in the app

    When I press "Instructions" in the app
    Then I should find "These are the authentication instructions." in the app

    When I press "Close" in the app
    And I press "Create my new account" in the app
    Then I should find "Username required" in the app
    And I should find "Password required" in the app
    And I should find "Missing email address" in the app
    And I should find "Missing given name" in the app
    And I should find "Missing last name" in the app

    When I set the following fields to these values in the app:
      | Username | u1 |
      | Password | pu1 |
      | Email address | u1@u1.com |
      | Email (again) | u2@u1.com |
      | First name | User |
      | Last name | Test |
      | City/town | Barcelona |
      | Country | Spain |
    Then I should find "Emails do not match" in the app

    When I set the field "Email (again)" to "u1@u1.com" in the app
    And I press "Create my new account" in the app
    Then I should find "An email should have been sent to your address" in the app

    # Login with the user to confirm the information is correct.
    When I press "OK" in the app
    And I set the following fields to these values in the app:
      | Username | u1 |
      | Password | pu1 |
    And I press "Log in" near "Lost password?" in the app
    Then I should find "You need to confirm your account" in the app

    When I open a browser tab with url "$WWWROOT"
    And I confirm email for "u1"
    And I close the browser tab opened by the app
    And I press "Close" in the app
    And I press "Log in" near "Lost password?" in the app
    Then I should find "Acceptance test site" in the app
    But I should not find "You need to confirm your account" in the app

    When I press the user menu button in the app
    And I press "User Test" in the app
    Then I should find "Barcelona" in the app
    Then I should find "Spain" in the app
    And I should find "u1@u1.com" in the app

  Scenario: Check password policy in signup
    Given the following config values are set as admin:
      | passwordpolicy | 1 |
      | minpasswordlength | 8 |
      | minpassworddigits | 1 |
      | minpasswordlower | 1 |
      | minpasswordupper | 1 |
      | minpasswordnonalphanum | 1 |
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I press "Create new account" in the app
    Then I should find "The password must have at least 8 characters" in the app
    And I set the following fields to these values in the app:
      | Username | u1 |
      | Password | pu1 |
      | Email address | u1@u1.com |
      | Email (again) | u1@u1.com |
      | First name | User |
      | Last name | Test |
      | City/town | Barcelona |
      | Country | Spain |
    And I press "Create my new account" in the app
    Then I should find "Error" in the app
    And I should find "Passwords must be at least 8 characters long" in the app
    And I should find "Passwords must have at least 1 upper case letter(s)" in the app
    And I should find "The password must have at least 1 special character(s)" in the app
    But I should not find "An email should have been sent to your address" in the app

    When I press "OK" in the app
    And I set the field "Password" to "Password1$" in the app
    And I press "Create my new account" in the app
    Then I should find "An email should have been sent to your address" in the app

  @lms_from4.5
  Scenario: Signup with custom profile fields
    # Use default options Yes/No for menu field because it's not possible to add new lines. See MDL-75788.
    Given the following "custom profile fields" exist:
      | datatype | shortname   | name                 | required | signup | defaultdata |
      | menu     | team        | Are you a developer? | 1        | 1      | Yes         |
    And the following "custom profile fields" exist:
      | datatype | shortname   | name                | required | signup | param1              | param2 | param3 | defaultdata |
      | text     | food        | Favourite food      | 1        | 1      |                     | 2040   |        | Pasta       |
      | checkbox | vegetarian  | Are you vegetarian? | 0        | 1      |                     |        |        |             |
      | datetime | birthday    | Birthday            | 1        | 1      | 1900                | 2040   | 0      |             |
      | datetime | time        | Date and time       | 0        | 1      | 1900                | 2040   | 1      |             |
      | textarea | description | Describe yourself   | 0        | 1      |                     |        |        | Sample text |
      | social   | website     | url                 | 0        | 1      | url                 |        |        |             |
      | text     | beverage    | Favourite beverage  | 0        | 0      |                     | 2040   |        |             |

    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I press "Create new account" in the app
    Then I should find "Are you a developer?" in the app
    And the field "Are you a developer?" matches value "Yes" in the app
    And I should find "Favourite food" in the app
    And the field "Favourite food" matches value "Pasta" in the app
    And I should find "Birthday" in the app
    And I should find "Date and time" in the app
    And I should find "Describe yourself" in the app
    And the field "Describe yourself" matches value "Sample text" in the app
    And I should find "Website" in the app
    But I should not find "Favourite beverage" in the app

    When I set the following fields to these values in the app:
      | Username | u1 |
      | Password | pu1 |
      | Email address | u1@u1.com |
      | Email (again) | u1@u1.com |
      | First name | User |
      | Last name | Test |
      | City/town | Barcelona |
      | Country | Spain |
      | Website | https://moodle.com |
    And I press "Create my new account" in the app
    Then I should find "Required" in the app

    When I set the field "Are you a developer?" to "No" in the app
    And I set the field "Favourite food" to "Sushi" in the app
    And I press "Are you vegetarian?" in the app
    And I set the field "Birthday" to "1990-01-01" in the app
    And I set the field "Date and time" to "2010-01-01T11:45" in the app
    And I set the field "Describe yourself" to "This is my description." in the app
    And I press "Create my new account" in the app
    Then I should find "An email should have been sent to your address" in the app

    # Login with the user to confirm the information is correct.
    When I open a browser tab with url "$WWWROOT"
    And I confirm email for "u1"
    And I close the browser tab opened by the app
    And I press "OK" in the app
    And I set the following fields to these values in the app:
      | Username | u1 |
      | Password | pu1 |
    And I press "Log in" near "Lost password?" in the app
    And I press the user menu button in the app
    And I press "User Test" in the app
    Then I should find "No" near "Are you a developer?" in the app
    And I should find "Sushi" in the app
    And I should find "Yes" near "Are you vegetarian?" in the app
    And I should find "1 January 1990" in the app
    And I should find "1 January 2010, 11:45 AM" in the app
    And I should find "This is my description" in the app
    And I should find "https://moodle.com" in the app

  @lms_from4.4
  Scenario: Check extended characters in usernames show error if setting is disabled
    Given the following config values are set as admin:
      | extendedusernamechars | 0 |
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I press "Create new account" in the app
    And I set the following fields to these values in the app:
      | Username | u1$ |
    Then I should find "The username can only contain alphanumeric" in the app

    When I set the following fields to these values in the app:
      | Username | u1 |
    Then I should not find "The username can only contain alphanumeric" in the app

  @lms_from4.4
  Scenario: Check can include extended characters in usernames if setting is enabled
    Given the following config values are set as admin:
      | extendedusernamechars | 1 |
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I press "Create new account" in the app
    And I set the following fields to these values in the app:
      | Username | u1U |
    Then I should find "Only lowercase letters allowed" in the app

    When I set the following fields to these values in the app:
      | Username | u1$ |
    Then I should not find "The username can only contain alphanumeric" in the app

    When I set the following fields to these values in the app:
      | Password | pu1 |
      | Email address | u1@u1.com |
      | Email (again) | u1@u1.com |
      | First name | User |
      | Last name | Test |
    And I press "Create my new account" in the app
    Then I should find "An email should have been sent to your address" in the app
