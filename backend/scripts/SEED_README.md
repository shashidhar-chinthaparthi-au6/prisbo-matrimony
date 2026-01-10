# Database Seeding Script

This script clears the database and creates sample data including users, profiles, and downloads images from the web.

## Usage

```bash
npm run seed-db
```

## What It Does

1. **Clears Database**: Removes all existing users and profiles
2. **Creates Accounts**:
   - 1 Super Admin
   - 1 Admin
   - 2 Vendors
   - 8 Regular Users
3. **Creates Profiles**: 8 profiles with downloaded images
4. **Downloads Images**: Fetches sample images from Unsplash for profile photos
5. **Saves Credentials**: All login credentials are saved to `credentials.json`

## Generated Credentials

After running the script, check `backend/credentials.json` for all login credentials.

### Quick Access Credentials:

**Super Admin:**
- Email: `superadmin@prisbo.com`
- Password: `superadmin123`

**Admin:**
- Email: `admin@prisbo.com`
- Password: `admin123`

**Vendors:**
- Email: `vendor1@prisbo.com` | Password: `vendor123` | Company: Matrimony Services Pvt Ltd
- Email: `vendor2@prisbo.com` | Password: `vendor123` | Company: Wedding Solutions

**Users:**
- All users have password: `user123`
- Check `credentials.json` for full list with emails and names

## Profile Details

The script creates:
- 3 Bride profiles (Priya, Ananya, Kavya)
- 3 Groom profiles (Rahul, Arjun, Vikram)
- 2 Vendor-created profiles (Sneha, Aditya)

Each profile includes:
- Complete personal information
- Family details
- Education and career information
- Location and religion details
- 2-3 downloaded profile photos

## Notes

- Images are downloaded from Unsplash (free placeholder images)
- First 3 profiles are auto-approved
- Remaining profiles are in pending status
- First 2 profiles are created by vendors (for testing vendor functionality)
- Credentials file is gitignored for security

## Re-running the Script

You can safely re-run the script anytime. It will:
1. Clear all existing data
2. Create fresh sample data
3. Update credentials.json with new credentials

