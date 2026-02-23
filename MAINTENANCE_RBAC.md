# MaintainProof RBAC Documentation

**Last Updated:** February 23, 2026
**Version:** 0.9.0

---

## Overview

MaintainProof implements a fine-grained Role-Based Access Control (RBAC) system with three console user roles: **Owner**, **Manager**, and **Staff**. Additionally, **Technicians** are field workers who perform maintenance tasks.

---

## User Roles

### 1. Owner (Владелец)

**Access Level:** Full administrative control

**Permissions:**
- ✅ **Team Members Management**
  - Invite new Team Members (Managers, Staff)
  - Activate/Deactivate Team Members
  - Reset passwords for Team Members
  - View all Team Members

- ✅ **Technicians Management**
  - Add new Technicians
  - Edit Technician details
  - Activate/Deactivate Technicians
  - Reset Technician access credentials
  - View all Technicians

- ✅ **Operations**
  - Full CRUD on Service Visits, Assets, Locations, Contracts, Parts, Checklists
  - Assign Technicians to visits
  - Approve/reject visits
  - View all analytics and reports

- ✅ **Billing & Settings**
  - Access to billing information
  - Company settings management
  - Subscription management

**How to Become Owner:**
- The first user who registers a company via `/signup` automatically becomes the Owner
- There can be multiple Owners (future feature)

---

### 2. Manager (Менеджер)

**Access Level:** Operational management without billing access

**Permissions:**
- 👁️ **Team Members** (View Only)
  - View Team Members list
  - Cannot invite, edit, or deactivate Team Members
  - Informational banner explains limited access

- ✅ **Technicians Management** (Full Control)
  - Add new Technicians
  - Edit Technician details
  - Activate/Deactivate Technicians
  - Reset Technician access credentials
  - View all Technicians

- ✅ **Operations**
  - Full CRUD on Service Visits, Assets, Locations, Contracts, Parts, Checklists
  - Assign Technicians to visits
  - Approve/reject visits
  - View all analytics and reports

- ❌ **Billing & Settings**
  - No access to billing information
  - Cannot modify company settings

**How to Become Manager:**
- Owner invites via Company page → "Invite member" → Select "Manager" role
- Manager receives temporary password via email/modal

---

### 3. Staff (Персонал)

**Access Level:** Limited read access

**Permissions:**
- 👁️ **Team Members** (View Only)
  - View Team Members list
  - No edit capabilities

- 👁️ **Technicians** (View Only)
  - View Technicians list
  - No edit capabilities

- 👁️ **Operations** (Limited Read)
  - View Service Visits (cannot create/edit)
  - View Assets (cannot create/edit)
  - View Locations (cannot create/edit)
  - Limited analytics access

- ❌ **Billing & Settings**
  - No access

**How to Become Staff:**
- Owner invites via Company page → "Invite member" → Select "Staff" role

---

### 4. Technicians (Field Workers)

**Role Type:** Not a console user role (separate entity)

**Description:**
- Field workers who perform maintenance tasks
- Access mobile apps or simplified interfaces
- Do NOT have access to the web dashboard
- Managed by Owner and Manager

**Permissions:**
- View assigned Service Visits
- Check-in/Check-out from visits
- Upload photos (before/after)
- Complete checklists
- Report issues
- Update visit status

**How to Become Technician:**
- Owner or Manager adds via Company page → Technicians tab → "Add Technician"
- Technician receives access credentials (PIN or password)

---

## Team Members vs Technicians

| Aspect | Team Members | Technicians |
|--------|--------------|-------------|
| **Definition** | Console users (Owner, Manager, Staff) | Field workers |
| **Access** | Web dashboard | Mobile app or simplified interface |
| **Management** | Only Owner can manage | Owner + Manager can manage |
| **Roles** | Owner, Manager, Staff | Single role (Technician) |
| **Authentication** | Email + Password | Phone + PIN or Email + Password |
| **Purpose** | Administrative and operational tasks | Field service execution |

---

## Company Page Architecture

### Location
`/maintenance/company`

### Tabs

#### 1. Team Members Tab
**Purpose:** Manage console users who access the dashboard

**Features (Owner Only):**
- "Invite member" button
- Add new Team Members modal with role selection (Manager/Staff)
- Activate/Deactivate toggle
- Reset password dropdown action
- Temporary password modal with copy functionality

**Features (Manager View):**
- Read-only table view
- Informational banner: "Manager Access - you can manage Technicians on the next tab"

**Table Columns:**
- Name (with avatar)
- Role (Owner/Manager/Staff badge)
- Contact (Email)
- Status (Active/Inactive toggle for Owner)
- Actions (Dropdown for Owner only)

#### 2. Technicians Tab
**Purpose:** Manage field workers

**Features (Owner + Manager):**
- "Add Technician" button
- Add/Edit Technician modal
- Activate/Deactivate toggle
- Reset access credentials
- Export to Excel

**Table Columns:**
- Technician Name
- Contact (Email, Phone)
- Status (Active/Inactive)
- Total Visits
- SLA Violation Rate
- Actions (Edit, Reset, View Activity)

---

## Registration & Onboarding Flow

### 1. Company Registration (`/signup`)

```
User fills form:
- Company Name
- Full Name
- Email
- Password

Backend creates:
- Company record
- User record with role="owner"

Frontend redirects to:
- /dashboard or /maintenance/visits
```

**Result:** First user automatically becomes **Owner**

---

### 2. Inviting Team Members (Owner Only)

```
Owner → Company page → Team Members tab → "Invite member" button

Modal form:
- Full Name
- Email
- Role selection (Manager / Staff)

Backend creates:
- User record with selected role
- Generates temporary password
- (Optional) Sends email notification

Frontend shows:
- Temporary password modal
- Copy to clipboard button
- Important notice about password change on first login
```

**Result:** New Manager or Staff user created

---

### 3. Adding Technicians (Owner + Manager)

```
Owner/Manager → Company page → Technicians tab → "Add Technician" button

Modal form:
- Full Name
- Phone (required)
- Email (optional)
- 4-digit PIN
- Active status toggle

Backend creates:
- Technician record (cleaner model)
- Associates with company

Frontend shows:
- Success toast
- New technician in list
```

**Result:** New Technician available for assignment

---

## UI/UX Guidelines

### Design System

**Primary Color:**
- All action buttons use `bg-primary` (HSL 221, 83%, 53% - blue)
- Consistent with sidebar active state

**Button Hierarchy:**
1. **Primary Action:** Solid blue button (`bg-primary`)
   - Example: "Invite member", "Add Technician", "Export Excel"
2. **Secondary Action:** Outline button (`variant="outline"`)
   - Example: "Template", "Import Excel/CSV"
3. **Tertiary Action:** Ghost button (`variant="ghost"`)
   - Example: Dropdown triggers, back button

### RBAC UI Elements

**Owner-only elements:**
```tsx
{userIsOwner && (
  <Button onClick={() => setShowInviteMemberModal(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Invite member
  </Button>
)}
```

**Manager info banner:**
```tsx
{!userIsOwner && (
  <div className="border border-blue-200 bg-blue-50 p-3">
    <Shield className="h-4 w-4" />
    <p>Manager Access: You can manage Technicians but not Team Members</p>
  </div>
)}
```

### Modal Design

**Consistent modal structure:**
1. Header with icon (Key, Users)
2. Subtitle explaining action
3. Form fields with validation
4. Footer with Cancel + Primary action button

**Example - Invite Member Modal:**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div className="w-full max-w-md rounded-xl border bg-card p-6">
    <h3>Invite Team Member</h3>
    <p className="text-sm text-muted-foreground">
      Add a manager or staff member to your team
    </p>
    <form>
      {/* Form fields */}
    </form>
  </div>
</div>
```

---

## API Endpoints

### Team Members

```
GET    /api/company/users/           # List team members
POST   /api/company/users/           # Create team member (Owner only)
PATCH  /api/company/users/:id/       # Update team member (Owner only)
POST   /api/company/users/:id/reset-password/  # Reset password (Owner only)
```

### Technicians

```
GET    /api/maintenance/technicians/      # List technicians
POST   /api/company/cleaners/             # Create technician (Owner/Manager)
PATCH  /api/company/cleaners/:id/         # Update technician (Owner/Manager)
POST   /api/company/cleaners/:id/reset-access/  # Reset access (Owner/Manager)
```

---

## Security Considerations

### Authentication
- All endpoints require JWT authentication
- Token must contain `user_id`, `role`, and `company_id`

### Authorization
- RBAC checks performed in backend views
- Frontend UI hides unauthorized actions (UX only, not security)
- Backend validates permissions before executing operations

### Password Management
- Temporary passwords generated securely (random 12-character string)
- Users must change password on first login
- Password reset requires current password verification

### Multi-Tenancy
- All queries filtered by `company_id`
- Users can only access data from their own company
- Technicians are scoped to company

---

## Testing RBAC

### Manual Testing Checklist

**As Owner:**
- [ ] Can see "Invite member" button on Team Members tab
- [ ] Can invite new Manager
- [ ] Can invite new Staff
- [ ] Can activate/deactivate Team Members
- [ ] Can reset Team Member passwords
- [ ] Can see "Add Technician" button on Technicians tab
- [ ] Can add, edit, activate/deactivate Technicians

**As Manager:**
- [ ] Can view Team Members (read-only)
- [ ] Sees informational banner on Team Members tab
- [ ] Cannot see "Invite member" button
- [ ] Can see "Add Technician" button on Technicians tab
- [ ] Can add, edit, activate/deactivate Technicians

**As Staff:**
- [ ] Can view Team Members (read-only)
- [ ] Cannot see "Invite member" button
- [ ] Can view Technicians (read-only)
- [ ] Cannot see "Add Technician" button

---

## Code Examples

### Checking User Role (Frontend)

```tsx
import { useUserRole, isOwner, canAccessBilling } from "@/hooks/useUserRole";

function Component() {
  const user = useUserRole();
  const userIsOwner = isOwner(user.role);
  const canAccess = canAccessBilling(user.role); // Owner or Manager

  return (
    <>
      {userIsOwner && <OwnerOnlyButton />}
      {canAccess && <ManagerAndOwnerFeature />}
    </>
  );
}
```

### Checking User Role (Backend)

```python
# backend/apps/api/views_maintenance.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from apps.jobs.decorators import require_role

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_role(['owner'])
def invite_team_member(request):
    # Only owners can execute this
    pass

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_role(['owner', 'manager'])
def add_technician(request):
    # Owners and Managers can execute this
    pass
```

---

## Future Enhancements

### Planned Features

1. **Email Notifications**
   - Send invitation emails to new Team Members
   - Include temporary password and login instructions

2. **Audit Logging**
   - Track who invited whom
   - Log password resets
   - Log role changes

3. **Advanced Permissions**
   - Custom role permissions
   - Department-based access control
   - Location-based restrictions

4. **Bulk Operations**
   - Bulk invite Team Members via CSV
   - Bulk add Technicians
   - Bulk activate/deactivate

---

## Troubleshooting

### Common Issues

**Issue:** Owner can't see "Invite member" button
- **Solution:** Check `useUserRole()` returns correct role
- **Verify:** `isOwner(user.role) === true`

**Issue:** Manager sees "Invite member" button (shouldn't)
- **Solution:** Check conditional rendering `{userIsOwner && ...}`
- **Verify:** Backend RBAC decorator `@require_role(['owner'])`

**Issue:** Temporary password not showing in modal
- **Solution:** Check API response includes `temp_password` field
- **Verify:** Frontend state `setMemberPasswordData()` called correctly

---

## Related Documentation

- [README.md](README.md) - Project overview and setup
- [SECURITY.md](backend/docs/SECURITY.md) - Comprehensive security guide
- [CLAUDE.md](CLAUDE.md) - Development guidelines for Claude Code

---

**Maintained by:** Proof Platform Team
**Contact:** support@proofplatform.com
