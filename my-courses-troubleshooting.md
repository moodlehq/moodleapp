# My Courses Troubleshooting Guide

## Key Areas to Check When Courses Aren't Showing

### 1. **Page Component Flow** (`/src/core/features/courses/pages/my/my.ts`)
- The My Courses page loads the `myoverview` block component
- Check if `loadedBlock` is being set properly (line 128)
- Verify if `CoreCoursesDashboard.getDashboardBlocks()` is returning the myoverview block
- For older sites (< 4.0), a fallback block is loaded (line 138)

### 2. **Block Component** (`/src/addons/block/myoverview/components/myoverview/myoverview.ts`)
- Main component responsible for displaying courses
- Key properties:
  - `allCourses`: All courses fetched from the API
  - `filteredCourses`: Courses after applying filters (this is what's displayed)
  - `hasCourses`: Boolean indicating if any courses exist

### 3. **Course Filters** (lines 525-629 in myoverview.ts)
The following filters can hide courses:
- **Time filters**: `inprogress` (default), `all`, `future`, `past`, `hidden`, `favourite`
- **Text filter**: Search by course name
- **Hidden courses**: Courses marked as hidden won't show unless `allincludinghidden` filter is selected

Common issues:
- Default filter is `inprogress` - past/future courses won't show
- Hidden courses are filtered out by default
- Text search filter might be active

### 4. **Course Data Loading** (`loadAllCourses` method)
- Calls `CoreCoursesHelper.getUserCoursesWithOptionsObservable()`
- Which calls `CoreCourses.getUserCoursesObservable()`
- Which calls the Moodle API: `core_enrol_get_users_courses`

### 5. **API Response Check**
Verify the API is returning courses:
- Check Network tab for `core_enrol_get_users_courses` call
- Verify response contains course data
- Check for any API errors

### 6. **Template Conditions** (`addon-block-myoverview.html`)
- Empty state shows when `filteredCourses.length === 0` (line 98)
- Different messages for no courses vs no filtered results

## Debugging Steps

1. **Check Console for Errors**
   - Look for JavaScript errors
   - Check for failed API calls

2. **Verify Filter State**
   - Check which filter is selected (default is `inprogress`)
   - Try switching to `allincludinghidden` to see all courses
   - Clear any text search filters

3. **Check Course Dates**
   - Past courses won't show in `inprogress` filter
   - Future courses won't show in `inprogress` filter
   - Grace periods affect course visibility (see `loadGracePeriod`)

4. **Verify API Response**
   ```javascript
   // In browser console, check:
   // 1. Network tab for core_enrol_get_users_courses
   // 2. Response should contain array of courses
   ```

5. **Check Local Storage**
   - Filter preferences are saved locally
   - Try clearing app data/cache

6. **Site Version**
   - Moodle 4.0+ uses different parameters
   - Older sites use fallback logic

## Common Solutions

1. **Change Filter**: Switch from `inprogress` to `all` or `allincludinghidden`
2. **Clear Search**: Ensure text search field is empty
3. **Check Enrollment**: Verify user is actually enrolled in courses
4. **Clear Cache**: Clear app cache and reload
5. **Check Dates**: Verify course start/end dates aren't filtering out courses