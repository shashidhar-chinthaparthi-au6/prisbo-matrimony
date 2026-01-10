# Complete Testing Guide - Matrimony Application

## 📋 Table of Contents
1. [Credentials](#credentials)
2. [Super Admin Testing Flows](#super-admin-testing-flows)
3. [Vendor Testing Flows](#vendor-testing-flows)
4. [User Testing Flows](#user-testing-flows)
5. [Cross-Role Testing](#cross-role-testing)

---

## 🔐 Credentials

### Super Admin
```
Email: superadmin@prisbo.com
Phone: 9999999999
Password: superadmin123
Role: super_admin
```

### Vendors
```
Vendor 1:
  Email: vendor1@prisbo.com
  Phone: 7777777777
  Password: vendor123
  Company: Matrimony Services Pvt Ltd
  Contact Person: Rajesh Kumar

Vendor 2:
  Email: vendor2@prisbo.com
  Phone: 6666666666
  Password: vendor123
  Company: Wedding Solutions
  Contact Person: Priya Sharma

Vendor 3:
  Email: vendor3@prisbo.com
  Phone: 5555555555
  Password: vendor123
  Company: Perfect Match Matrimony
  Contact Person: Amit Patel
```

### Regular Users
All regular users have password: `user123`

**Self-Created Profiles (6 users):**
```
1. Email: priya1@prisbo.com
   Phone: 9000000001
   Name: Priya Sharma
   Password: user123

2. Email: ananya2@prisbo.com
   Phone: 9000000002
   Name: Ananya Patel
   Password: user123

3. Email: kavya3@prisbo.com
   Phone: 9000000003
   Name: Kavya Reddy
   Password: user123

4. Email: rahul4@prisbo.com
   Phone: 9000000004
   Name: Rahul Kumar
   Password: user123

5. Email: arjun5@prisbo.com
   Phone: 9000000005
   Name: Arjun Singh
   Password: user123

6. Email: vikram6@prisbo.com
   Phone: 9000000006
   Name: Vikram Menon
   Password: user123
```

**Vendor-Created Profiles (11 users):**

**Created by Vendor 1 (Matrimony Services Pvt Ltd):**
```
1. Email: snehavendor1@prisbo.com
   Phone: 8000000001
   Name: Sneha Joshi
   Password: user123

2. Email: rohanvendor2@prisbo.com
   Phone: 8000000002
   Name: Rohan Desai
   Password: user123

3. Email: meeravendor3@prisbo.com
   Phone: 8000000003
   Name: Meera Patel
   Password: user123

4. Email: karanvendor4@prisbo.com
   Phone: 8000000004
   Name: Karan Shah
   Password: user123
```

**Created by Vendor 2 (Wedding Solutions):**
```
5. Email: anjalivendor5@prisbo.com
   Phone: 8000000005
   Name: Anjali Singh
   Password: user123

6. Email: adityavendor6@prisbo.com
   Phone: 8000000006
   Name: Aditya Verma
   Password: user123

7. Email: poojavendor7@prisbo.com
   Phone: 8000000007
   Name: Pooja Gupta
   Password: user123

8. Email: vishalvendor8@prisbo.com
   Phone: 8000000008
   Name: Vishal Jain
   Password: user123
```

**Created by Vendor 3 (Perfect Match Matrimony):**
```
9. Email: divyavendor9@prisbo.com
   Phone: 8000000009
   Name: Divya Rao
   Password: user123

10. Email: sureshvendor10@prisbo.com
    Phone: 8000000010
    Name: Suresh Kumar
    Password: user123

11. Email: lakshmivendor11@prisbo.com
    Phone: 8000000011
    Name: Lakshmi Iyer
    Password: user123
```

---

## 👨‍💼 Super Admin Testing Flows

### Flow 1: Dashboard Overview
**Steps:**
1. Login as `superadmin@prisbo.com` / `superadmin123`
2. Navigate to Admin Dashboard
3. Check Statistics tab

**Expected Results:**
- ✅ View total users, vendors, profiles counts
- ✅ View bride/groom profile distribution
- ✅ View vendor-created profiles count
- ✅ View total interests and accepted interests
- ✅ View premium profiles count

---

### Flow 2: Profile Management
**Steps:**
1. Go to "Profiles" tab
2. Test search functionality
3. Test filters (Type, Status, Verification Status, Created By)
4. Click on a profile name to view details
5. Click "View Full Profile" button
6. Test pagination (should show 10 per page)

**Expected Results:**
- ✅ Search works for first name and last name
- ✅ Filters work correctly
- ✅ Profile modal opens with details
- ✅ Can navigate to full profile page
- ✅ Pagination shows correct page numbers

**Actions to Test:**
1. **Edit Profile (Inline)**
   - Click "Edit Profile" button on profile detail page
   - Modify fields (name, location, education, etc.)
   - Click "Save All" or "Save" for individual fields
   - ✅ Changes should be saved and reflected

2. **Approve Profile**
   - Click "Approve" button
   - ✅ Profile status changes to "approved"
   - ✅ Notification sent to user

3. **Reject Profile**
   - Click "Reject" button
   - Enter rejection reason
   - ✅ Profile status changes to "rejected"
   - ✅ Notification sent to user

4. **Activate/Deactivate Profile**
   - Click "Activate" or "Deactivate" button
   - ✅ Profile active status toggles

5. **Block User**
   - Click "Block User" button
   - ✅ User account is blocked
   - ✅ User cannot login

6. **Delete Profile (Soft Delete)**
   - Click "Delete Profile" button
   - Confirm deletion
   - ✅ Profile moved to "Deleted Profiles" tab
   - ✅ Profile not visible in main list

7. **Create Profile**
   - Click "➕ Create Profile" button
   - ✅ Redirects to profile creation form
   - Fill form and submit
   - ✅ New profile created

---

### Flow 3: Vendor Management
**Steps:**
1. Go to "Vendors" tab
2. Test search functionality
3. Test status filter (Active/Blocked)
4. Click on vendor name to view details
5. Click "View Full Vendor" button

**Expected Results:**
- ✅ Search works for email, phone, company name, name
- ✅ Filter works correctly
- ✅ Vendor modal opens
- ✅ Can navigate to full vendor detail page

**Actions to Test:**
1. **Edit Vendor (Inline)**
   - Click "Edit" button on vendor detail page
   - Modify fields (name, company, address, proofs, etc.)
   - Click "Save All"
   - ✅ Changes saved and reflected in header

2. **View Profiles Created by Vendor**
   - Click "View Profiles" button
   - ✅ Shows all profiles created by this vendor
   - ✅ Can click on profile to view details

3. **Block/Unblock Vendor**
   - Click "Block Vendor" or "Unblock Vendor"
   - ✅ Vendor status changes
   - ✅ Blocked vendor cannot login

4. **Delete Vendor**
   - Click "Delete Vendor" button
   - Confirm deletion
   - ✅ Vendor deleted (handle with caution)

5. **Create Vendor**
   - Click "Create Vendor" button
   - Fill vendor form (name, email, phone, company, address, proofs)
   - Submit
   - ✅ New vendor created

---

### Flow 4: Profile Verification
**Steps:**
1. Go to "Profile Verification" tab
2. Test filter (All, Pending, Approved, Rejected)
3. Select a pending profile
4. Review profile details in right panel

**Expected Results:**
- ✅ Only user-created profiles shown (not vendor-created)
- ✅ Filter works correctly
- ✅ Profile details displayed correctly

**Actions to Test:**
1. **Bulk Approve**
   - Enable bulk mode
   - Select multiple profiles
   - Click "Bulk Approve"
   - ✅ All selected profiles approved

2. **Bulk Reject**
   - Enable bulk mode
   - Select multiple profiles
   - Click "Bulk Reject"
   - Enter rejection reason
   - ✅ All selected profiles rejected

3. **Individual Approve/Reject**
   - Click "Approve" or "Reject" on individual profile
   - ✅ Status changes accordingly

---

### Flow 5: Subscription Management
**Steps:**
1. Go to "Subscriptions" tab
2. View statistics cards (Active, Pending, Revenue, Expiring)
3. Test search and filters (Status, Plan ID)
4. Review pending subscriptions section
5. Review main subscriptions table

**Expected Results:**
- ✅ Statistics display correctly
- ✅ Search works for user email/phone
- ✅ Filters work correctly
- ✅ Pending subscriptions shown at top
- ✅ Table shows all subscription details

**Actions to Test:**
1. **Approve Subscription**
   - Find pending subscription
   - Click "Approve" button
   - ✅ Subscription approved
   - ✅ Start date and end date set
   - ✅ Invoice generated (if applicable)

2. **Reject Subscription**
   - Find pending subscription
   - Click "Reject" button
   - Enter rejection reason
   - ✅ Subscription rejected
   - ✅ User notified

3. **Cancel Subscription**
   - Find approved subscription
   - Click "Cancel" button
   - Confirm cancellation
   - ✅ Subscription cancelled
   - ✅ User notified

4. **Reactivate Subscription**
   - Find cancelled/expired subscription
   - Click "Reactivate" button
   - Confirm reactivation
   - ✅ Subscription reactivated

5. **View Payment Proof**
   - For UPI payments, click "View Proof"
   - ✅ Payment screenshot opens

6. **Bulk Actions**
   - Enable bulk mode
   - Select multiple subscriptions
   - Test bulk approve/reject/cancel
   - ✅ All selected subscriptions updated

---

### Flow 6: Deleted Profiles Management
**Steps:**
1. Go to "Deleted Profiles" tab
2. Test search and filters
3. View deleted profiles list

**Expected Results:**
- ✅ All deleted profiles shown (for super_admin)
- ✅ Search and filters work
- ✅ Vendor name displayed for vendor-created profiles

**Actions to Test:**
1. **Restore Profile**
   - Click "Restore" button on a deleted profile
   - Confirm restoration
   - ✅ Profile restored
   - ✅ Profile appears in main Profiles tab

2. **Bulk Restore**
   - Enable bulk mode
   - Select multiple deleted profiles
   - Click "Bulk Restore"
   - ✅ All selected profiles restored

---

### Flow 7: Support Chats
**Steps:**
1. Go to "Support Chats" tab
2. Click "New Chat" button
3. Search for vendor or user
4. Select a chat from list
5. Send messages

**Expected Results:**
- ✅ Can search for vendors and users
- ✅ Can create new support chats
- ✅ Messages sent and received
- ✅ Real-time updates (polling)

**Actions to Test:**
1. **Chat with Vendor**
   - Create new chat with a vendor
   - Send messages
   - ✅ Messages delivered
   - ✅ Vendor can respond

2. **Chat with User**
   - Create new chat with a regular user
   - Send messages
   - ✅ Messages delivered
   - ✅ User can respond

---

## 🏢 Vendor Testing Flows

### Flow 1: Vendor Dashboard
**Steps:**
1. Login as `vendor1@prisbo.com` / `vendor123`
2. View dashboard

**Expected Results:**
- ✅ Dashboard shows vendor-specific statistics
- ✅ Shows profiles created by this vendor
- ✅ Shows pending/approved profile counts

---

### Flow 2: Profile Management (Vendor-Created)
**Steps:**
1. Navigate to profiles section
2. View profiles created by this vendor
3. Click on a profile to view details

**Expected Results:**
- ✅ Only shows profiles created by this vendor
- ✅ Can view full profile details
- ✅ Can edit profile information

**Actions to Test:**
1. **Edit Profile**
   - Click "Edit" on a profile
   - Modify fields
   - Save changes
   - ✅ Changes saved

2. **View Profile Details**
   - Click on profile name
   - ✅ Full profile details displayed

---

### Flow 3: Support Chat
**Steps:**
1. Navigate to Support/Chat section
2. View chats with super_admin
3. View chats with users (whose profiles vendor created)
4. Send messages

**Expected Results:**
- ✅ Can chat with super_admin
- ✅ Can chat with users whose profiles vendor created
- ✅ Cannot chat with other users
- ✅ Messages sent and received

---

### Flow 4: Create Profile for User
**Steps:**
1. Navigate to create profile section
2. Fill profile form with user details
3. Upload photos
4. Submit profile

**Expected Results:**
- ✅ Profile created
- ✅ Profile marked as vendor-created
- ✅ User account created (if new)
- ✅ Profile appears in vendor's profile list

---

## 👤 User Testing Flows

### Flow 1: Registration & Profile Creation
**Steps:**
1. Register new account
2. Accept terms and conditions
3. Create profile
4. Upload photos
5. Submit for verification

**Expected Results:**
- ✅ Account created
- ✅ Terms accepted
- ✅ Profile created
- ✅ Profile status: pending
- ✅ Photos uploaded

---

### Flow 2: Profile Management
**Steps:**
1. Login as user
2. Go to "My Profile"
3. View profile details
4. Edit profile

**Expected Results:**
- ✅ Profile details displayed
- ✅ Can edit own profile
- ✅ Changes saved

**Actions to Test:**
1. **Edit Profile**
   - Click "Edit Profile"
   - Modify any field
   - Save changes
   - ✅ Changes saved

2. **Upload Photos**
   - Add new photos
   - Set primary photo
   - Reorder photos
   - Delete photos
   - ✅ All photo operations work

3. **Delete/Deactivate Profile**
   - Click delete/deactivate option
   - Confirm action
   - ✅ Profile deleted/deactivated

---

### Flow 3: Search & Browse Profiles
**Steps:**
1. Go to "Search" page
2. Apply filters (age, location, education, etc.)
3. View profile cards
4. Click on profile to view details

**Expected Results:**
- ✅ Search results displayed
- ✅ Filters work correctly
- ✅ Profile cards clickable
- ✅ Profile detail page opens
- ✅ Can view photos in gallery

**Actions to Test:**
1. **Advanced Filters**
   - Apply multiple filters
   - Test sorting options
   - ✅ Results filtered correctly

2. **Profile Detail View**
   - Click on profile card
   - ✅ Full profile details shown
   - ✅ Photo gallery works
   - ✅ Can send interest
   - ✅ Can add to favorites

---

### Flow 4: Interests & Matches
**Steps:**
1. Go to "Interests" page
2. View sent interests
3. View received interests
4. Accept/reject interests

**Expected Results:**
- ✅ Sent interests listed
- ✅ Received interests listed
- ✅ Can accept/reject
- ✅ Mutual interests shown as matches

**Actions to Test:**
1. **Send Interest**
   - Go to profile detail page
   - Click "Send Interest"
   - ✅ Interest sent
   - ✅ Notification sent to recipient

2. **Accept Interest**
   - Go to received interests
   - Click "Accept"
   - ✅ Interest accepted
   - ✅ Match created
   - ✅ Both users notified

3. **Reject Interest**
   - Go to received interests
   - Click "Reject"
   - ✅ Interest rejected
   - ✅ Sender notified

4. **Withdraw Interest**
   - Go to sent interests
   - Click "Withdraw"
   - ✅ Interest withdrawn

5. **View Profile from Interest**
   - Click "View Profile" button
   - ✅ Profile detail page opens

---

### Flow 5: Favorites
**Steps:**
1. Go to "Favorites" page
2. View favorited profiles
3. Add notes to favorites
4. Remove from favorites

**Expected Results:**
- ✅ Favorited profiles listed
- ✅ Can add notes
- ✅ Can remove favorites
- ✅ Can view profile details

**Actions to Test:**
1. **Add to Favorites**
   - Go to profile detail page
   - Click "Add to Favorites"
   - ✅ Profile added to favorites

2. **Add Note**
   - Click on favorite
   - Add note
   - Save
   - ✅ Note saved

3. **Remove from Favorites**
   - Click "Remove" on favorite
   - ✅ Profile removed from favorites

---

### Flow 6: Chat & Messaging
**Steps:**
1. Go to "Chats" page
2. View chat list
3. Open a chat
4. Send messages
5. Send attachments (if available)

**Expected Results:**
- ✅ Chat list displayed
- ✅ Can open chats
- ✅ Messages sent/received
- ✅ Real-time updates

**Actions to Test:**
1. **Start New Chat**
   - Click "New Chat"
   - Select user (from matches/interests)
   - ✅ Chat created

2. **Send Message**
   - Type message
   - Send
   - ✅ Message delivered

3. **Send Attachment**
   - Click attachment button
   - Upload image/file
   - Send
   - ✅ Attachment sent

4. **Block User**
   - Click block option in chat
   - ✅ User blocked
   - ✅ Cannot send/receive messages

---

### Flow 7: Subscriptions
**Steps:**
1. Go to "Subscriptions" page
2. View available plans
3. Select a plan
4. Choose payment method
5. Upload payment proof (if UPI)
6. Submit subscription request

**Expected Results:**
- ✅ Plans displayed
- ✅ Can select plan
- ✅ Payment form works
- ✅ Subscription request submitted
- ✅ Status: pending

**Actions to Test:**
1. **Subscribe to Plan**
   - Select plan
   - Choose payment method
   - Fill payment details
   - Submit
   - ✅ Subscription created (pending)

2. **View Subscription Status**
   - Check subscription status
   - ✅ Status displayed correctly

3. **View Subscription History**
   - View past subscriptions
   - ✅ History displayed

---

### Flow 8: Notifications
**Steps:**
1. Go to "Notifications" page
2. View all notifications
3. Mark as read
4. Delete notifications

**Expected Results:**
- ✅ Notifications listed
- ✅ Can mark as read
- ✅ Can delete
- ✅ Unread count displayed

**Actions to Test:**
1. **View Notification**
   - Click on notification
   - ✅ Related page opens

2. **Mark All as Read**
   - Click "Mark All as Read"
   - ✅ All notifications marked as read

---

## 🔄 Cross-Role Testing

### Flow 1: Profile Verification Workflow
**Steps:**
1. User creates profile → Status: Pending
2. Super Admin views in "Profile Verification" tab
3. Super Admin approves/rejects
4. User receives notification

**Expected Results:**
- ✅ User profile created
- ✅ Super Admin sees in verification queue
- ✅ Approval/rejection works
- ✅ User notified

---

### Flow 2: Subscription Workflow
**Steps:**
1. User subscribes to plan → Status: Pending
2. Super Admin views in "Subscriptions" tab
3. Super Admin approves/rejects
4. User receives notification
5. User gains access to premium features

**Expected Results:**
- ✅ Subscription request created
- ✅ Super Admin can approve/reject
- ✅ User notified
- ✅ Premium features unlocked on approval

---

### Flow 3: Support Chat Workflow
**Steps:**
1. User/Vendor sends message to Super Admin
2. Super Admin receives in "Support Chats"
3. Super Admin responds
4. User/Vendor receives response

**Expected Results:**
- ✅ Messages delivered
- ✅ Real-time updates
- ✅ Both parties can communicate

---

### Flow 4: Vendor-User Interaction
**Steps:**
1. Vendor creates profile for user
2. User receives notification
3. User can view/edit profile
4. Vendor can manage profile

**Expected Results:**
- ✅ Profile created by vendor
- ✅ User notified
- ✅ Both can manage profile
- ✅ Profile marked as vendor-created

---

## 📝 Testing Checklist

### Super Admin Features
- [ ] Dashboard statistics
- [ ] Profile management (CRUD)
- [ ] Vendor management (CRUD)
- [ ] Profile verification (approve/reject)
- [ ] Subscription management (approve/reject/cancel)
- [ ] Deleted profiles (restore)
- [ ] Support chats
- [ ] Search and filters
- [ ] Pagination (10 per page)
- [ ] Bulk operations

### Vendor Features
- [ ] Dashboard
- [ ] View created profiles
- [ ] Edit profiles
- [ ] Create new profiles
- [ ] Support chat with super_admin
- [ ] Support chat with users

### User Features
- [ ] Registration
- [ ] Profile creation
- [ ] Profile editing
- [ ] Photo management
- [ ] Search profiles
- [ ] Send interests
- [ ] Accept/reject interests
- [ ] Favorites
- [ ] Chat/messaging
- [ ] Subscriptions
- [ ] Notifications

---

## 🐛 Common Issues to Test

1. **Pagination**
   - Test with different page sizes
   - Test navigation (next/previous)
   - Test with filters applied

2. **Search & Filters**
   - Test empty results
   - Test special characters
   - Test multiple filters combined

3. **Permissions**
   - Test unauthorized access
   - Test role-based restrictions
   - Test vendor can only see their profiles

4. **Real-time Updates**
   - Test chat updates
   - Test notification updates
   - Test status changes

5. **File Uploads**
   - Test image uploads
   - Test file size limits
   - Test invalid file types

---

## 📞 Support

If you encounter any issues during testing:
1. Check browser console for errors
2. Check network tab for API errors
3. Verify database connection
4. Check environment variables

---

**Last Updated:** After implementing pagination (limit 10) and filters for all tabs

