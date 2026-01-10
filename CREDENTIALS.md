# Quick Credentials Reference

## 🔐 Login Credentials

### Super Admin
```
Email: superadmin@prisbo.com
Password: superadmin123
```

### Vendors
```
Vendor 1:
  Email: vendor1@prisbo.com
  Password: vendor123
  Company: Matrimony Services Pvt Ltd

Vendor 2:
  Email: vendor2@prisbo.com
  Password: vendor123
  Company: Wedding Solutions

Vendor 3:
  Email: vendor3@prisbo.com
  Password: vendor123
  Company: Perfect Match Matrimony
```

### Regular Users (All passwords: `user123`)

#### Self-Created Profiles
```
priya1@prisbo.com / user123 (Priya Sharma)
ananya2@prisbo.com / user123 (Ananya Patel)
kavya3@prisbo.com / user123 (Kavya Reddy)
rahul4@prisbo.com / user123 (Rahul Kumar)
arjun5@prisbo.com / user123 (Arjun Singh)
vikram6@prisbo.com / user123 (Vikram Menon)
```

#### Vendor-Created Profiles
```
snehavendor1@prisbo.com / user123 (Sneha Joshi) - Vendor 1
rohanvendor2@prisbo.com / user123 (Rohan Desai) - Vendor 1
meeravendor3@prisbo.com / user123 (Meera Patel) - Vendor 1
karanvendor4@prisbo.com / user123 (Karan Shah) - Vendor 1
anjalivendor5@prisbo.com / user123 (Anjali Singh) - Vendor 2
adityavendor6@prisbo.com / user123 (Aditya Verma) - Vendor 2
poojavendor7@prisbo.com / user123 (Pooja Gupta) - Vendor 2
vishalvendor8@prisbo.com / user123 (Vishal Jain) - Vendor 2
divyavendor9@prisbo.com / user123 (Divya Rao) - Vendor 3
sureshvendor10@prisbo.com / user123 (Suresh Kumar) - Vendor 3
lakshmivendor11@prisbo.com / user123 (Lakshmi Iyer) - Vendor 3
```

---

## 📊 Test Data Summary

- **1 Super Admin**
- **3 Vendors**
- **6 Self-Created User Profiles**
- **11 Vendor-Created User Profiles**
- **Total: 17 Users + 1 Super Admin = 18 Accounts**

---

## 🎯 Quick Test Scenarios

### Test Super Admin
1. Login: `superadmin@prisbo.com` / `superadmin123`
2. Test all tabs: Stats, Profiles, Vendors, Verification, Subscriptions, Support Chats, Deleted Profiles
3. Test filters and pagination (10 per page)
4. Test CRUD operations on profiles and vendors

### Test Vendor
1. Login: `vendor1@prisbo.com` / `vendor123`
2. View created profiles (should see 4 profiles)
3. Test support chat with super_admin
4. Test support chat with vendor-created users

### Test User
1. Login: `priya1@prisbo.com` / `user123`
2. View own profile
3. Search other profiles
4. Send interests
5. Add to favorites
6. Subscribe to a plan
7. Chat with matches

---

For detailed testing flows, see `TESTING_GUIDE.md`

