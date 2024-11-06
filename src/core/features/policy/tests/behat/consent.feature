@core_policy @app @javascript @lms_from4.4
Feature: Test accepting pending policies on signup

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email           |
      | student  | User      | One      | one@example.com |

  Scenario: Accept policy using default handler
    Given the following config values are set as admin:
      | sitepolicyhandler |  |
      | sitepolicy        | https://moodle.org/invalidfile.pdf |
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I set the following fields to these values in the app:
      | Username | student |
      | Password | student |
    And I press "Log in" near "Lost password?" in the app
    Then I should find "You must agree to this policy to continue using this site" in the app
    But I should not be able to press "Continue" in the app
    And I should not be able to press "User account" in the app

    When I press "Site policy agreement" "a" in the app
    And I press "OK" in the app
    Then the app should have opened a browser tab with url "moodle.org"

    When I close the browser tab opened by the app
    And I press "I have read and agree to the Site policy agreement" in the app
    And I press "Continue" in the app
    Then I should be able to press "User account" in the app

    When I press "User account" in the app
    Then I should not find "Policies and agreements" in the app

  Scenario: Accept policy using tool_policy
    Given the following config values are set as admin:
      | sitepolicyhandler | tool_policy |
    And the following policies exist:
      | name                          | agreementstyle | optional | revision | content                   | summary                |
      | Mandatory policy own page     | 1              | 0        | mo v1    | Content mand own page     | Summ mand own page     |
      | Optional policy own page      | 1              | 1        | oo v1    | Content opt own page      | Summ opt own page      |
      | Mandatory policy consent page | 0              | 0        | mc v1    | Content mand consent page | Summ mand consent page |
      | Optional policy consent page  | 0              | 1        | oc v1    | Content opt consent page  | Summ opt consent page  |
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I set the following fields to these values in the app:
      | Username | student |
      | Password | student |
    And I press "Log in" near "Lost password?" in the app
    Then I should find "Mandatory policy own page" in the app
    And I should find "Summ mand own page" in the app
    And I should find "Content mand own page" in the app
    But I should not be able to press "Continue" in the app
    And I should not be able to press "User account" in the app

    When I press "I have read and agree to the Mandatory policy own page" in the app
    And I press "I have read and agree to the Mandatory policy own page" in the app
    Then I should find "Before continuing you need to acknowledge all these policies" in the app
    But I should not be able to press "Continue" in the app

    When I press "I have read and agree to the Mandatory policy own page" in the app
    And I press "Continue" in the app
    Then I should find "Optional policy own page" in the app
    And I should find "Summ opt own page" in the app
    And I should find "Content opt own page" in the app
    But I should not be able to press "Continue" in the app

    When I press "No thanks, I decline Optional policy own page" in the app
    And I press "Continue" in the app
    Then I should find "Policy 1 out of 2" in the app
    And I should find "Mandatory policy consent page" in the app
    And I should find "Summ mand consent page" in the app
    And I should find "Content mand consent page" in the app
    But I should not find "I have read and agree" in the app

    When I press "Next" in the app
    Then I should find "Policy 2 out of 2" in the app
    And I should find "Optional policy consent page" in the app
    And I should find "Summ opt consent page" in the app
    And I should find "Content opt consent page" in the app
    But I should not find "No thanks, I decline" in the app

    When I press "Next" in the app
    Then I should find "Please agree to the following policies" in the app
    And I should find "Mandatory policy consent page" in the app
    And I should find "Summ mand consent page" in the app
    And I should find "Optional policy consent page" in the app
    And I should find "Summ opt consent page" in the app
    But I should not find "Content mand consent page" in the app
    And I should not find "Content opt consent page" in the app

    When I press "Please refer to the full Mandatory policy consent page" in the app
    Then I should find "Content mand consent page" in the app
    But I should not find "Content opt consent page" in the app

    When I press "Close" in the app
    And I press "Please refer to the full Optional policy consent page" in the app
    Then I should find "Content opt consent page" in the app
    But I should not find "Content mand consent page" in the app

    When I press "Close" in the app
    And I press "Continue" in the app
    Then I should find "Before continuing you need to acknowledge all these policies" in the app

    When I press "I have read and agree to the Mandatory policy consent page" in the app
    And I press "Continue" in the app
    Then I should find "Before continuing you need to acknowledge all these policies" in the app

    When I press "I have read and agree to the Optional policy consent page" in the app
    And I press "Continue" in the app
    Then I should be able to press "User account" in the app

    # TODO: Add a new version for a policy and check that the user is prompted to accept it.
    # This is currently not possible with the current step to create policies.

    # View policies and agreements. Do it in this Scenario because there is no generator to set acceptances.
    When I press "User account" in the app
    And I press "Policies and agreements" in the app
    Then I should find "Mandatory policy own page" in the app
    And I should find "Optional policy own page" in the app
    And I should find "Mandatory policy consent page" in the app
    And I should find "Optional policy consent page" in the app
    But I should not find "Revision" in the app
    And I should not find "Summ mand own page" in the app
    And I should not find "Content mand own page" in the app

    When I press "View policy Mandatory policy own page" in the app
    Then I should find "Summ mand own page" in the app
    And I should find "Content mand own page" in the app
    But I should not find "Summ opt own page" in the app

    When I press "Close" in the app
    And I press "Expand" within "Mandatory policy own page" "ion-item" in the app
    Then I should find "mo v1" in the app
    And I should find "Active" in the app
    And I should find "Accepted" in the app
    But I should not be able to press "Withdraw" in the app

    When I press "Collapse" within "Mandatory policy own page" "ion-item" in the app
    And I press "Expand" within "Optional policy own page" "ion-item" in the app
    Then I should find "oo v1" in the app
    And I should find "Active" in the app
    And I should find "Declined" in the app

    When I press "Accept" in the app
    Then I should find "Accepted" in the app
    But I should not find "Declined" in the app

    When I press "Withdraw" in the app
    Then I should find "Declined" in the app
    But I should not find "Accepted" in the app

    # Test tablet view now.
    When I go back in the app
    And I change viewport size to "1200x640" in the app
    And I press "User account" in the app
    And I press "Policies and agreements" in the app
    Then I should find "Mandatory policy own page" in the app
    And I should find "Optional policy own page" in the app
    And I should find "Mandatory policy consent page" in the app
    And I should find "Optional policy consent page" in the app
    And I should find "mo v1" within "Mandatory policy own page" "tr" in the app
    And I should find "Active" within "Mandatory policy own page" "tr" in the app
    And I should find "Accepted" within "Mandatory policy own page" "tr" in the app
    And I should find "Declined" within "Optional policy own page" "tr" in the app
    But I should not be able to press "Withdraw" within "Mandatory policy own page" "tr" in the app
    And I should not find "Summ mand own page" in the app
    And I should not find "Content mand own page" in the app

    When I press "Mandatory policy own page" in the app
    Then I should find "Summ mand own page" in the app
    And I should find "Content mand own page" in the app
    But I should not find "Summ opt own page" in the app

    When I press "Close" in the app
    And I press "Accept" within "Optional policy own page" "tr" in the app
    Then I should find "Accepted" within "Optional policy own page" "tr" in the app
