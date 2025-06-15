# Aspire Parent Services Plugin

This Moodle local plugin provides web services for parent/mentor functionality in the Moodle mobile app.

## Features

- Web service to fetch mentees (children) for parent users
- Web service to check if a user has parent/mentor role
- Support for custom profile fields
- Secure access control

## Installation

1. Download the plugin as a ZIP file
2. In Moodle, go to Site administration > Plugins > Install plugins
3. Upload the ZIP file and follow the installation process
4. Or manually extract to `/local/aspireparent/` in your Moodle directory

## Configuration

After installation:

1. **Enable Web Services:**
   - Go to Site administration > Plugins > Web services > External services
   - Find "Aspire Parent Service" and enable it
   - Add it to your mobile app service

2. **Configure Mobile App:**
   - Go to Site administration > Plugins > Web services > External services
   - Edit your mobile app service (usually "Moodle mobile web service")
   - Add the following functions:
     - `local_aspireparent_get_mentees`
     - `local_aspireparent_get_parent_info`

3. **Set Up Parent Roles:**
   - Create or configure roles with shortnames: `parent`, `mentor`, or `guardian`
   - Assign parents to children in the user context

## Web Services

### local_aspireparent_get_mentees

Fetches all mentees (children) for a parent user.

**Parameters:**
- `userid` (optional): Parent user ID (0 for current user)

**Returns:**
- Array of mentee user objects with custom fields

### local_aspireparent_get_parent_info

Checks if the current user has a parent/mentor role.

**Parameters:**
- None

**Returns:**
- `isparent`: Boolean indicating parent status
- `roles`: Array of parent roles
- `menteecount`: Number of mentees

## Requirements

- Moodle 4.0 or later
- Mobile app with parent functionality implemented

## License

GPL v3 or later