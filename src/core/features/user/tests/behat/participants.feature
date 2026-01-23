@core_user @app @core @javascript @participants
Feature: Test course participants tab

  Background:
    Given the following "users" exist:
      | username    | firstname | lastname | email                   |
      | teacher001  | Teacher   | 001      | teacher001@example.com  |
      | student001  | Student   | 001      | student001@example.com  |
      | student002  | Student   | 002      | student002@example.com  |
      | student003  | Student   | 003      | student003@example.com  |
      | student004  | Student   | 004      | student004@example.com  |
      | student005  | Student   | 005      | student005@example.com  |
      | student006  | Student   | 006      | student006@example.com  |
      | student007  | Student   | 007      | student007@example.com  |
      | student008  | Student   | 008      | student008@example.com  |
      | student009  | Student   | 009      | student009@example.com  |
      | student010  | Student   | 010      | student010@example.com  |
      | student011  | Student   | 011      | student011@example.com  |
      | student012  | Student   | 012      | student012@example.com  |
      | student013  | Student   | 013      | student013@example.com  |
      | student014  | Student   | 014      | student014@example.com  |
      | student015  | Student   | 015      | student015@example.com  |
      | student016  | Student   | 016      | student016@example.com  |
      | student017  | Student   | 017      | student017@example.com  |
      | student018  | Student   | 018      | student018@example.com  |
      | student019  | Student   | 019      | student019@example.com  |
      | student020  | Student   | 020      | student020@example.com  |
      | student021  | Student   | 021      | student021@example.com  |
      | student022  | Student   | 022      | student022@example.com  |
      | student023  | Student   | 023      | student023@example.com  |
      | student024  | Student   | 024      | student024@example.com  |
      | student025  | Student   | 025      | student025@example.com  |
      | student026  | Student   | 026      | student026@example.com  |
      | student027  | Student   | 027      | student027@example.com  |
      | student028  | Student   | 028      | student028@example.com  |
      | student029  | Student   | 029      | student029@example.com  |
      | student030  | Student   | 030      | student030@example.com  |
      | student031  | Student   | 031      | student031@example.com  |
      | student032  | Student   | 032      | student032@example.com  |
      | student033  | Student   | 033      | student033@example.com  |
      | student034  | Student   | 034      | student034@example.com  |
      | student035  | Student   | 035      | student035@example.com  |
      | student036  | Student   | 036      | student036@example.com  |
      | student037  | Student   | 037      | student037@example.com  |
      | student038  | Student   | 038      | student038@example.com  |
      | student039  | Student   | 039      | student039@example.com  |
      | student040  | Student   | 040      | student040@example.com  |
      | student041  | Student   | 041      | student041@example.com  |
      | student042  | Student   | 042      | student042@example.com  |
      | student043  | Student   | 043      | student043@example.com  |
      | student044  | Student   | 044      | student044@example.com  |
      | student045  | Student   | 045      | student045@example.com  |
      | student046  | Student   | 046      | student046@example.com  |
      | student047  | Student   | 047      | student047@example.com  |
      | student048  | Student   | 048      | student048@example.com  |
      | student049  | Student   | 049      | student049@example.com  |
      | student050  | Student   | 050      | student050@example.com  |
      | student051  | Student   | 051      | student051@example.com  |
      | student052  | Student   | 052      | student052@example.com  |
      | student053  | Student   | 053      | student053@example.com  |
      | student054  | Student   | 054      | student054@example.com  |
      | student055  | Student   | 055      | student055@example.com  |
      | student056  | Student   | 056      | student056@example.com  |
      | student057  | Student   | 057      | student057@example.com  |
      | student058  | Student   | 058      | student058@example.com  |
      | student059  | Student   | 059      | student059@example.com  |
      | student060  | Student   | 060      | student060@example.com  |
      | student061  | Student   | 061      | student061@example.com  |
      | student062  | Student   | 062      | student062@example.com  |
      | student063  | Student   | 063      | student063@example.com  |
      | student064  | Student   | 064      | student064@example.com  |
      | student065  | Student   | 065      | student065@example.com  |
      | student066  | Student   | 066      | student066@example.com  |
      | student067  | Student   | 067      | student067@example.com  |
      | student068  | Student   | 068      | student068@example.com  |
      | student069  | Student   | 069      | student069@example.com  |
      | student070  | Student   | 070      | student070@example.com  |
      | student071  | Student   | 071      | student071@example.com  |
      | student072  | Student   | 072      | student072@example.com  |
      | student073  | Student   | 073      | student073@example.com  |
      | student074  | Student   | 074      | student074@example.com  |
      | student075  | Student   | 075      | student075@example.com  |
      | student076  | Student   | 076      | student076@example.com  |
      | student077  | Student   | 077      | student077@example.com  |
      | student078  | Student   | 078      | student078@example.com  |
      | student079  | Student   | 079      | student079@example.com  |
      | student080  | Student   | 080      | student080@example.com  |
      | student081  | Student   | 081      | student081@example.com  |
      | student082  | Student   | 082      | student082@example.com  |
      | student083  | Student   | 083      | student083@example.com  |
      | student084  | Student   | 084      | student084@example.com  |
      | student085  | Student   | 085      | student085@example.com  |
      | student086  | Student   | 086      | student086@example.com  |
      | student087  | Student   | 087      | student087@example.com  |
      | student088  | Student   | 088      | student088@example.com  |
      | student089  | Student   | 089      | student089@example.com  |
      | student090  | Student   | 090      | student090@example.com  |
      | student091  | Student   | 091      | student091@example.com  |
      | student092  | Student   | 092      | student092@example.com  |
      | student093  | Student   | 093      | student093@example.com  |
      | student094  | Student   | 094      | student094@example.com  |
      | student095  | Student   | 095      | student095@example.com  |
      | student096  | Student   | 096      | student096@example.com  |
      | student097  | Student   | 097      | student097@example.com  |
      | student098  | Student   | 098      | student098@example.com  |
      | student099  | Student   | 099      | student099@example.com  |
    And the following "courses" exist:
      | fullname | shortname | category | initsections |
      | Course 1 | C1        | 0        | 1            |
    And the following "course enrolments" exist:
      | user       | course | role           |
      | teacher001 | C1     | editingteacher |
      | student001 | C1     | student        |
      | student002 | C1     | student        |
      | student003 | C1     | student        |
      | student004 | C1     | student        |
      | student005 | C1     | student        |
      | student006 | C1     | student        |
      | student007 | C1     | student        |
      | student008 | C1     | student        |
      | student009 | C1     | student        |
      | student010 | C1     | student        |
      | student011 | C1     | student        |
      | student012 | C1     | student        |
      | student013 | C1     | student        |
      | student014 | C1     | student        |
      | student015 | C1     | student        |
      | student016 | C1     | student        |
      | student017 | C1     | student        |
      | student018 | C1     | student        |
      | student019 | C1     | student        |
      | student020 | C1     | student        |
      | student021 | C1     | student        |
      | student022 | C1     | student        |
      | student023 | C1     | student        |
      | student024 | C1     | student        |
      | student025 | C1     | student        |
      | student026 | C1     | student        |
      | student027 | C1     | student        |
      | student028 | C1     | student        |
      | student029 | C1     | student        |
      | student030 | C1     | student        |
      | student031 | C1     | student        |
      | student032 | C1     | student        |
      | student033 | C1     | student        |
      | student034 | C1     | student        |
      | student035 | C1     | student        |
      | student036 | C1     | student        |
      | student037 | C1     | student        |
      | student038 | C1     | student        |
      | student039 | C1     | student        |
      | student040 | C1     | student        |
      | student041 | C1     | student        |
      | student042 | C1     | student        |
      | student043 | C1     | student        |
      | student044 | C1     | student        |
      | student045 | C1     | student        |
      | student046 | C1     | student        |
      | student047 | C1     | student        |
      | student048 | C1     | student        |
      | student049 | C1     | student        |
      | student050 | C1     | student        |
      | student051 | C1     | student        |
      | student052 | C1     | student        |
      | student053 | C1     | student        |
      | student054 | C1     | student        |
      | student055 | C1     | student        |
      | student056 | C1     | student        |
      | student057 | C1     | student        |
      | student058 | C1     | student        |
      | student059 | C1     | student        |
      | student060 | C1     | student        |
      | student061 | C1     | student        |
      | student062 | C1     | student        |
      | student063 | C1     | student        |
      | student064 | C1     | student        |
      | student065 | C1     | student        |
      | student066 | C1     | student        |
      | student067 | C1     | student        |
      | student068 | C1     | student        |
      | student069 | C1     | student        |
      | student070 | C1     | student        |
      | student071 | C1     | student        |
      | student072 | C1     | student        |
      | student073 | C1     | student        |
      | student074 | C1     | student        |
      | student075 | C1     | student        |
      | student076 | C1     | student        |
      | student077 | C1     | student        |
      | student078 | C1     | student        |
      | student079 | C1     | student        |
      | student080 | C1     | student        |
      | student081 | C1     | student        |
      | student082 | C1     | student        |
      | student083 | C1     | student        |
      | student084 | C1     | student        |
      | student085 | C1     | student        |
      | student086 | C1     | student        |
      | student087 | C1     | student        |
      | student088 | C1     | student        |
      | student089 | C1     | student        |
      | student090 | C1     | student        |
      | student091 | C1     | student        |
      | student092 | C1     | student        |
      | student093 | C1     | student        |
      | student094 | C1     | student        |
      | student095 | C1     | student        |
      | student096 | C1     | student        |
      | student097 | C1     | student        |
      | student098 | C1     | student        |
      | student099 | C1     | student        |

  Scenario: Mobile navigation (student)
    Given I entered the course "Course 1" as "student001" in the app

    When I press "Participants" in the app
    Then I should find "Teacher 001" in the app
    And I should find "Student 001" in the app
    And I should find "Student 015" in the app
    # Test load more
    When I scroll to "Student 049" in the app
    Then I should find "Student 050" in the app
    Then I should find "Student 099" in the app
    # Search
    When I set the field "Search" to "teacher" in the app
    And I press "Search" "button" in the app
    Then I should find "Teacher 001" in the app
    And I should not find "Student" in the app
    When I set the field "Search" to "student 01" in the app
    And I press "Search" "button" in the app
    Then I should find "Student 010" in the app
    Then I should find "Student 019" in the app
    And I should not find "Student 002" in the app

  Scenario: Tablet navigation (teacher)
    Given I entered the course "Course 1" as "teacher001" in the app
    And I change viewport size to "1200x640" in the app

    When I press "Participants" in the app
    Then I should find "Roles: Student" in the app
    And I should find "Teacher 001" in the app
    And I should find "Student 001" in the app
    And I should find "Student 015" in the app
    # Test load more
    When I scroll to "Student 049" in the app
    Then I should find "Student 050" in the app
    Then I should find "Student 099" in the app
    # Search
    When I set the field "Search" to "teacher" in the app
    And I press "Search" "button" in the app
    Then I should find "Roles: Teacher" in the app
    And I should find "Teacher 001" in the app
    And I should not find "Student" in the app
    When I set the field "Search" to "student 01" in the app
    And I press "Search" "button" in the app
    Then I should find "Roles: Student" in the app
    And I should find "Student 010" in the app
    And I should find "Student 019" in the app
    And I should not find "Student 002" in the app
