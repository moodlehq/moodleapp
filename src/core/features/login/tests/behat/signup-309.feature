@auth @core_auth @app @javascript @lms_upto3.9
Feature: Test signup in app
  I need basic signup functionality to work

  # These scenarios are duplicated from main because the error message about
  # non alpha-numeric characters has changed.
  Background:
    Given the following config values are set as admin:
      | registerauth | email |
      | auth_instructions | These are the authentication instructions. |
      | passwordpolicy | 0 |

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
    And I should find "Passwords must have at least 1 non-alphanumeric character(s)" in the app
    But I should not find "An email should have been sent to your address" in the app

    When I press "OK" in the app
    And I set the field "Password" to "Password1$" in the app
    And I press "Create my new account" in the app
    Then I should find "An email should have been sent to your address" in the app
