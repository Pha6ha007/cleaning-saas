/**
 * Documentation Content
 * User-facing documentation for CleanProof operations managers
 */

export interface DocContent {
  id: string;
  title: string;
  content: string;
}

export const docContent: Record<string, DocContent> = {
  "first-steps": {
    id: "first-steps",
    title: "First Steps",
    content: `
# First Steps

Welcome to CleanProof. This guide will help you set up your account and create your first cleaning job in under 10 minutes.

## 1. Set Up Your Company Profile

Start by completing your company profile:

- Go to **Settings** → **Company**
- Upload your company logo
- Enter your company name and contact information
- Save your changes

Your logo will appear on all job reports and communications.

## 2. Add Locations

Before creating jobs, add the locations you service:

1. Navigate to **Locations** in the sidebar
2. Click **Add Location**
3. Enter the location name and address
4. Pin the exact location on the map
5. Set GPS validation radius (recommended: 100m)
6. Save the location

The GPS radius ensures cleaners can only check in when they're physically at the site.

## 3. Create Checklist Templates

Define what tasks cleaners should complete:

1. Go to **Locations** → select a location
2. Click **Manage Checklists**
3. Create a new template (e.g., "Daily Office Cleaning")
4. Add checklist items:
   - Empty all trash bins
   - Vacuum carpets
   - Clean restrooms
   - Wipe down surfaces
5. Save the template

You can create multiple templates for different types of jobs.

## 4. Add Your Team

Add cleaners to your team:

1. Navigate to **Company** → **Team Members**
2. Click **Add Cleaner**
3. Enter their name and phone number
4. Assign them a 4-digit PIN for mobile app access
5. Save

Cleaners will use this PIN to log into the mobile app.

## 5. Create Your First Job

Now you're ready to schedule work:

1. Go to **Job Planning**
2. Click **Create Job**
3. Select:
   - Location
   - Cleaner
   - Date and time
   - Checklist template
4. Click **Schedule Job**

The cleaner will see this job in their mobile app on the scheduled date.

## 6. Monitor Job Completion

Track your jobs in real-time:

- **Jobs** page shows active jobs
- **History** shows completed jobs
- Each job includes:
  - GPS check-in/check-out proof
  - Before/after photos
  - Completed checklist
  - Auto-generated PDF report

## What's Next?

- Learn about the [Proof System](#proof-system)
- Understand [SLA monitoring](#sla-engine)
- Explore [Analytics](#analytics) to track performance

If it's not proven, it didn't happen. CleanProof ensures every job has verifiable evidence.
    `,
  },

  "how-it-works": {
    id: "how-it-works",
    title: "How It Works",
    content: `
# How It Works

CleanProof is built around a simple principle: **if it's not proven, it didn't happen.**

## The CleanProof Flow

### 1. Manager Creates Job

You schedule a job through the web dashboard:

- Select the location
- Assign a cleaner
- Set date and time
- Choose checklist template

The job appears instantly in the cleaner's mobile app.

### 2. Cleaner Executes Job

On the day of service, the cleaner:

1. **Checks in** using GPS verification
   - Must be within the location's GPS radius
   - CleanProof captures exact coordinates and time
   - "Late start" violations are automatically detected

2. **Takes before photos**
   - Required to show starting condition
   - GPS and timestamp embedded in photos

3. **Completes checklist**
   - Each task marked as done in the app
   - Incomplete checklists trigger SLA violations

4. **Takes after photos**
   - Required to show completed work
   - GPS and timestamp embedded

5. **Checks out**
   - GPS verified
   - Duration automatically calculated

### 3. Proof is Generated

When the cleaner checks out, CleanProof automatically:

- Validates all proof requirements
- Calculates SLA compliance
- Generates a PDF report
- Makes the report available instantly

### 4. Manager Reviews & Shares

You can:

- View the job in **History**
- Download the PDF report
- Email the report to clients
- Track all report sends in email history

## Key Principles

### GPS Verification

Every check-in and check-out is GPS-verified. If a cleaner tries to check in from the wrong location, they're blocked.

This ensures services happen where they're supposed to.

### Photo Evidence

Before and after photos are mandatory. This provides visual proof of:
- Starting condition
- Work completed
- Quality delivered

### Checklist Accountability

The checklist ensures cleaners follow your standard procedures. Incomplete checklists are flagged as SLA violations.

### Automatic SLA Monitoring

CleanProof automatically detects:
- **Late start**: Check-in after scheduled time
- **Missing photos**: No before or after photos
- **Incomplete checklist**: Tasks not completed

These violations appear in your SLA dashboard and analytics.

### Audit-Ready Reports

Every job generates a timestamped, GPS-verified PDF report containing:
- Job details
- GPS coordinates and times
- Photos with embedded metadata
- Completed checklist
- SLA status

These reports are designed for client presentations and audits.

## Mobile App (Cleaner Side)

Cleaners interact with CleanProof through a simple mobile app:

1. Log in with their 4-digit PIN
2. See their jobs for today
3. Tap a job to start
4. Follow the guided workflow
5. Complete the job

The app is designed for speed and simplicity. Cleaners spend less time on admin and more time working.

## Web Dashboard (Manager Side)

You control everything from the web dashboard:

- **Dashboard**: Today's overview
- **Jobs**: Active jobs in progress
- **Job Planning**: Schedule new jobs
- **History**: Completed jobs with proof
- **Performance**: Cleaner performance metrics
- **Analytics**: Operational analytics
- **Reports**: Weekly and monthly reports
- **Locations**: Manage service sites

## Why It Works

Traditional cleaning management relies on trust. CleanProof replaces trust with proof.

You don't need to wonder if a job was done. You can see:
- Exactly when the cleaner arrived
- Exactly where they were
- Exactly what they did
- Exactly when they left

Your clients get the same level of transparency. No disputes, no assumptions, just facts.
    `,
  },

  "creating-jobs": {
    id: "creating-jobs",
    title: "Creating Jobs",
    content: `
# Creating Jobs

Learn how to schedule cleaning jobs through CleanProof's Job Planning interface.

## Quick Create

The fastest way to create a job:

1. Navigate to **Job Planning**
2. Click **Create Job** (blue button, top right)
3. Fill in the job details:

### Required Fields

**Location**
- Select from your saved locations
- If location not listed, add it first via Locations page

**Cleaner**
- Select the cleaner who will do the work
- Only active cleaners appear in the list

**Date**
- Select the service date
- Cannot create jobs in the past

**Scheduled Start Time**
- When the cleaner should check in
- Used for SLA late start detection

**Checklist Template**
- Select the appropriate template for this job type
- Templates are location-specific

### Optional Fields

**Notes**
- Internal notes about the job
- Visible to cleaners in the mobile app
- Use for special instructions

**Client Reference**
- External reference number
- Useful for tracking client-requested work

## Calendar View

Job Planning includes a calendar view for better scheduling:

- See jobs by day, week, or month
- Click a day to create a job for that date
- Drag and drop to reschedule (if enabled)

## Recurring Jobs

For regular cleaning schedules:

1. Create the first job normally
2. Select "Repeat" option
3. Choose frequency:
   - Daily
   - Weekly (select days)
   - Monthly (select date)
4. Set end date or number of occurrences

CleanProof will auto-create jobs based on your schedule.

## Bulk Create

To create multiple jobs at once:

1. Click **Bulk Create**
2. Select multiple locations
3. Select date range
4. Assign cleaners
5. Choose checklist template
6. Generate jobs

Useful for weekly schedules or large contracts.

## Job Validation

CleanProof validates your job before creation:

❌ **Cannot create if:**
- Cleaner already has a job at that time
- Location is missing GPS coordinates
- Checklist template not set up
- Date is in the past

✅ **Success:**
- Job appears in Job Planning calendar
- Job appears in cleaner's mobile app
- Job becomes active on the scheduled date

## After Creating

Once created, you can:

- **Edit the job** (before it starts)
- **Cancel the job** (sends notification)
- **Reassign to different cleaner**
- **Change the scheduled time**

## Job States

Jobs move through states:

1. **Scheduled**: Created, waiting for service date
2. **Active**: Service date has arrived
3. **In Progress**: Cleaner has checked in
4. **Completed**: Cleaner has checked out
5. **Cancelled**: Job was cancelled before completion

## Force Complete

If a cleaner forgot to check out or lost their phone, you can force complete:

1. Go to **Jobs** → find the job
2. Click **Force Complete**
3. Confirm the action
4. Job is marked complete (with SLA violation)

This should only be used in exceptional cases.

## Best Practices

### Planning Ahead

- Schedule jobs at least 1 day in advance
- Give cleaners visibility into their upcoming work
- Avoid last-minute scheduling

### Realistic Time Windows

- Allow adequate time for each job
- Consider travel time between locations
- Don't overbook cleaners

### Consistent Checklists

- Use standardized checklists
- Train cleaners on checklist items
- Update templates based on client needs

### Clear Instructions

- Use Notes field for special requirements
- Communicate changes directly with cleaners
- Document client preferences

## Common Issues

**"Cleaner not available"**
- They're already assigned to another job at that time
- Choose a different time or cleaner

**"Location not found"**
- Add the location via Locations page first
- Ensure GPS coordinates are set

**"Cannot edit job"**
- Job has already started
- Once checked in, jobs cannot be edited

**"Job not appearing in mobile app"**
- Check that the cleaner is assigned correctly
- Verify the service date is today or future
- Ensure cleaner's app is up to date
    `,
  },

  "managing-locations": {
    id: "managing-locations",
    title: "Managing Locations",
    content: `
# Managing Locations

Locations are the foundation of CleanProof. Each location represents a site where you provide cleaning services.

## Adding a Location

1. Navigate to **Locations**
2. Click **Add Location**
3. Fill in the details:

### Basic Information

**Location Name**
- Use a clear, recognizable name
- Example: "Downtown Office Tower A"
- Include floor or unit if needed

**Address**
- Full street address
- Used for navigation and reports

**Contact Person**
- Name of on-site contact (optional)
- Their phone number

### GPS Setup

This is critical for CleanProof to work:

1. **Find on Map**
   - Search for the address or
   - Drag the map to the location

2. **Pin the Exact Spot**
   - Click to place a pin
   - Pin should be at the service entrance or main door

3. **Set GPS Radius**
   - Recommended: 100 meters
   - Cleaners must be within this radius to check in
   - Larger radius = more flexible
   - Smaller radius = more strict

### Checklist Templates

Each location can have multiple checklist templates:

- **Daily Cleaning**
- **Deep Cleaning**
- **Special Event**

To add a template:

1. Click **Manage Checklists**
2. Click **Add Template**
3. Give it a name
4. Add checklist items
5. Save

## Editing Locations

Click any location to edit:

- Update address or GPS
- Modify checklist templates
- Change contact information
- Deactivate the location (if no longer serviced)

## GPS Validation

CleanProof uses GPS to ensure cleaners are physically at the location:

- Cleaner must be within the GPS radius to check in
- Check-in captures exact coordinates
- If cleaner is outside radius, check-in is blocked

This prevents:
- Remote check-ins
- Fraudulent attendance
- "I was there" disputes

## Checklist Templates

Templates ensure consistent service quality:

### Creating a Template

1. Select a location
2. Go to **Manage Checklists**
3. Create new template
4. Add items like:
   - Empty trash bins
   - Vacuum floors
   - Clean restrooms
   - Wipe surfaces
   - Check supplies

### Using Templates

When creating a job:
- Select the appropriate template
- Cleaner sees these exact tasks
- Each task must be checked off
- Incomplete checklist = SLA violation

### Best Practices

- Keep templates focused (5-10 items)
- Use clear, action-oriented language
- Match templates to job types
- Review and update quarterly

## Location Status

Locations can be:

**Active**
- Available for job scheduling
- Appears in location list

**Inactive**
- No longer serviced
- Hidden from job creation
- Historical data preserved

## Bulk Operations

For multiple locations:

- Export location list (Excel)
- Import locations (CSV upload)
- Apply checklist template to multiple locations

## Common Scenarios

### Client Has Multiple Sites

Create a separate location for each:
- Downtown Office (Floor 3)
- Downtown Office (Floor 7)
- Warehouse District

Even if same building, different GPS pins and checklists.

### Site Changed Contact Person

1. Go to Locations
2. Select the location
3. Update contact details
4. Save

Previous jobs retain old contact info.

### GPS Radius Too Small/Large

If cleaners can't check in:
- Location might have wrong GPS pin
- Radius might be too small
- Edit location and adjust radius

If cleaners checking in from too far:
- Radius might be too large
- Reduce to enforce stricter validation

### Template Changes Don't Apply to Active Jobs

Checklist templates are copied to jobs when created.
- Changes to template don't affect existing jobs
- Only new jobs use updated template
- This preserves historical accuracy
    `,
  },

  "working-with-cleaners": {
    id: "working-with-cleaners",
    title: "Working with Cleaners",
    content: `
# Working with Cleaners

Learn how to manage your cleaning team in CleanProof.

## Adding Cleaners

1. Go to **Company** → **Team Members**
2. Click **Add Cleaner**
3. Enter details:

**Name**
- Full name of the cleaner

**Phone Number**
- Used for notifications
- Required for account recovery

**PIN Code**
- 4-digit PIN for mobile app access
- Cleaner uses this to log in
- Make it memorable for the cleaner

**Status**
- Active or Inactive
- Inactive cleaners cannot access the app

## Mobile App Access

Cleaners use the mobile app (not the web dashboard):

### First Login

1. Download "CleanProof" app (iOS/Android)
2. Select "Cleaner Login"
3. Enter their 4-digit PIN
4. Start working

### What Cleaners See

- **Today's Jobs**: List of scheduled jobs
- **Job Details**: Location, time, checklist
- **Check In/Out**: GPS-verified attendance
- **Photos**: Camera for before/after photos
- **Checklist**: Tasks to complete

## Assigning Jobs

When creating a job, you assign it to a specific cleaner:

- One cleaner per job
- Cleaner sees the job in their app
- Receives notification when job is assigned

## Performance Tracking

Monitor cleaner performance:

### Individual Performance

Go to **Performance** page:

- **On-time rate**: % of jobs started on time
- **Completion rate**: % of checklists completed
- **Photo compliance**: % with all photos
- **Average duration**: Time per job

### Team Performance

**Dashboard** shows:
- Active jobs today
- Completed jobs
- SLA violations
- Overall metrics

## Common Issues

### Cleaner Forgot PIN

1. Go to Company → Team Members
2. Find the cleaner
3. Click **Reset PIN**
4. Assign new PIN
5. Share with cleaner

### Cleaner Can't Check In

**Possible causes:**

1. **Not at location**
   - Verify they're at the correct address
   - Check GPS is enabled on their phone

2. **GPS radius too small**
   - Adjust in Locations settings

3. **Wrong date**
   - Job might be scheduled for a different day

4. **App not updated**
   - Ask them to update the app

### Cleaner Checked In But Didn't Check Out

Use **Force Complete**:

1. Find the job in **Jobs** page
2. Click **Force Complete**
3. This marks the job complete

Note: This creates an SLA violation for incomplete proof.

### Cleaner Didn't Take Photos

Photos are mandatory. If missed:
- SLA violation is logged
- Job is flagged in Analytics
- Proof is incomplete

**Prevention:**
- Train cleaners on photo requirements
- Mobile app shows clear prompts
- Photos are required to check out

## Cleaner Training

When onboarding new cleaners:

1. **App Setup**
   - Help them install the app
   - Show them how to log in with PIN
   - Walk through the interface

2. **Job Flow**
   - Explain the check-in process
   - Show them how to take photos
   - Demonstrate checklist completion

3. **GPS Requirements**
   - Explain why GPS is needed
   - Show them how to enable location services
   - Clarify the GPS radius concept

4. **Photos**
   - Show examples of good before/after photos
   - Explain GPS and timestamp embedding
   - Emphasize why photos are mandatory

## Cleaner Roles & Permissions

Cleaners have limited permissions:

✅ **Can:**
- View their assigned jobs
- Check in/out with GPS
- Take photos
- Complete checklists
- View their own job history

❌ **Cannot:**
- Create jobs
- View other cleaners' jobs
- Edit locations
- Access analytics
- Manage company settings

This ensures data security and role separation.

## Best Practices

### Clear Communication

- Notify cleaners of schedule changes
- Use job Notes for special instructions
- Maintain phone contact for urgent issues

### Regular Check-ins

- Review performance weekly
- Address issues promptly
- Recognize good performance

### Fair Scheduling

- Distribute jobs evenly
- Consider travel time between locations
- Avoid overloading specific cleaners

### Accountability

- Set clear expectations
- Train on proper procedures
- Use SLA data to identify issues
- Address repeated violations

## Deactivating Cleaners

When a cleaner leaves:

1. Go to Company → Team Members
2. Find the cleaner
3. Change status to **Inactive**
4. Save

- They can no longer log into the app
- Historical data is preserved
- Jobs they completed remain in history
    `,
  },

  "checklist-templates": {
    id: "checklist-templates",
    title: "Checklist Templates",
    content: `
# Checklist Templates

Checklist templates ensure consistent service quality and provide clear instructions to cleaners.

## What Are Templates?

A template is a reusable list of tasks that cleaners must complete for a specific type of job.

Examples:
- Daily Office Cleaning
- Deep Cleaning
- Post-Construction Cleanup
- Event Setup

## Creating a Template

1. Go to **Locations**
2. Select a location
3. Click **Manage Checklists**
4. Click **Add Template**
5. Name the template
6. Add checklist items
7. Save

### Naming Templates

Use clear, descriptive names:

✅ Good:
- "Daily Office Cleaning"
- "Weekly Deep Clean"
- "Pre-Event Setup"

❌ Avoid:
- "Template 1"
- "Checklist A"
- "Regular"

### Writing Checklist Items

Each item should be:

**Action-oriented**
- Start with a verb
- Be specific and clear

✅ Good:
- "Empty all trash bins"
- "Vacuum carpets in meeting rooms"
- "Clean and sanitize restrooms"
- "Wipe down kitchen countertops"

❌ Avoid:
- "Trash"
- "Floors"
- "Restrooms"

**Measurable**
- Cleaner knows when it's done
- No ambiguity

✅ Good:
- "Mop entire floor area"

❌ Avoid:
- "Clean floors as needed"

**In logical order**
- Match the natural workflow
- Group related tasks

## Using Templates

When creating a job:
1. Select the location
2. Choose the appropriate template
3. The cleaner will see these exact tasks in their app

Templates are **copied** to the job:
- Changes to the template don't affect existing jobs
- Each job has its own checklist instance

## Template Management

### Editing Templates

1. Go to Locations → select location
2. Manage Checklists → select template
3. Make changes:
   - Add items
   - Remove items
   - Reorder items
   - Rename template
4. Save

**Important:** Changes only affect new jobs, not existing ones.

### Deleting Templates

Templates with active jobs cannot be deleted.

To delete:
1. Ensure no active jobs use the template
2. Select the template
3. Click Delete
4. Confirm

### Copying Templates

To reuse a template across locations:

1. Export the template (if supported)
2. Or manually recreate in other locations

## Best Practices

### Keep It Focused

- 5-15 items per template
- Too few = incomplete work
- Too many = overwhelming

### Standard Templates

Create standard templates for:

**Daily Maintenance**
- Empty trash
- Vacuum high-traffic areas
- Wipe surfaces
- Check supplies

**Weekly Deep Clean**
- All daily tasks
- Mop all floors
- Clean windows
- Deep clean restrooms

**Monthly Tasks**
- All weekly tasks
- High dusting
- Deep carpet cleaning
- Equipment maintenance

### Review Regularly

- Update templates quarterly
- Incorporate feedback from cleaners
- Add new requirements from clients
- Remove unnecessary items

### Client-Specific Templates

For custom contracts:

- Create location-specific templates
- Match client requirements exactly
- Document special procedures

## Checklist Compliance

CleanProof tracks checklist completion:

### In the Mobile App

Cleaners:
1. See the checklist after check-in
2. Check off each item as completed
3. Cannot check out until checklist is done

### In Analytics

You can see:
- **Completion rate**: % of checklists fully completed
- **Incomplete jobs**: Jobs with missing checklist items
- **By cleaner**: Which cleaners have incomplete patterns

### SLA Violations

Incomplete checklist = automatic SLA violation

This is flagged in:
- Job details
- Analytics dashboard
- Weekly/monthly reports

## Common Questions

**Can cleaners skip checklist items?**

No. The mobile app requires all items to be checked before allowing check-out.

**What if a task couldn't be done?**

Cleaners should:
- Check it off if attempted
- Use Notes to explain (if supported)
- Inform the manager

**Can I add items to a job after creation?**

No. The checklist is locked when the job is created. This ensures consistency and audit integrity.

**Do templates work across all locations?**

No. Templates are location-specific. To use the same template at multiple locations, create it separately for each.

## Advanced: Template Variables

Some CleanProof versions support variables:

- {location_name}
- {floor_number}
- {contact_person}

These auto-fill when the template is used. Check if your version supports this feature.

## Integration with Reports

Completed checklists appear in:
- Job PDF reports
- Weekly summaries
- Monthly reports
- Client presentations

The checklist shows which tasks were completed, providing accountability and transparency.
    `,
  },

  "proof-system": {
    id: "proof-system",
    title: "Proof System",
    content: `
# Proof System

The Proof System is the foundation of CleanProof. It replaces trust with verifiable evidence.

## Core Principle

**If it's not proven, it didn't happen.**

Traditional cleaning management relies on:
- Trust
- Self-reporting
- Assumptions

CleanProof relies on:
- GPS verification
- Photo evidence
- Timestamped data
- Digital checklists

## Components of Proof

Every completed job must have:

### 1. GPS Check-In

**What it proves:** The cleaner was at the location at the start time.

- Captures exact GPS coordinates
- Records timestamp
- Validates against location's GPS radius
- Cannot be faked or manipulated

**If missing:** Job cannot start.

### 2. Before Photos

**What it proves:** The starting condition of the site.

- Taken immediately after check-in
- GPS coordinates embedded
- Timestamp embedded
- Shows what the site looked like before work

**If missing:** SLA violation.

### 3. Completed Checklist

**What it proves:** All required tasks were done.

- Each item checked off
- Completed in the mobile app
- Timestamped
- No items can be skipped

**If missing:** SLA violation.

### 4. After Photos

**What it proves:** The completed work and final condition.

- Taken before check-out
- GPS coordinates embedded
- Timestamp embedded
- Shows what the site looks like after work

**If missing:** SLA violation.

### 5. GPS Check-Out

**What it proves:** The cleaner was at the location when work was completed.

- Captures exact GPS coordinates
- Records timestamp
- Validates against location's GPS radius
- Calculates total duration

**If missing:** Job incomplete.

## Why Each Component Matters

### GPS = Physical Presence

Without GPS:
- Cleaners could check in remotely
- No way to verify they were on-site
- Disputes about attendance

With GPS:
- Exact location recorded
- Timestamped arrival and departure
- Audit trail for compliance

### Photos = Visual Evidence

Without photos:
- No proof of condition
- Disputes about quality
- No before/after comparison

With photos:
- Visual record of work done
- Before/after comparison
- Client transparency
- Dispute resolution

### Checklist = Task Completion

Without checklist:
- No standard procedure
- Incomplete work goes unnoticed
- Quality varies

With checklist:
- Every task documented
- Compliance tracked
- Quality standards enforced

## The Proof Workflow

### Step 1: Assignment

Manager creates a job in CleanProof. The job includes:
- Location (with GPS pin)
- Scheduled time
- Assigned cleaner
- Checklist template

### Step 2: Execution

On the service date, the cleaner:

1. **Opens the app** → sees the job
2. **Travels to location**
3. **Checks in** → GPS verified
4. **Takes before photos** → visual proof of starting condition
5. **Works through checklist** → completes each task
6. **Takes after photos** → visual proof of completed work
7. **Checks out** → GPS verified

Each step is tracked in real-time.

### Step 3: Validation

CleanProof automatically validates:
- GPS coordinates (within radius?)
- Timestamps (on time?)
- Photos (uploaded?)
- Checklist (completed?)

If anything is missing → SLA violation.

### Step 4: Report Generation

When the cleaner checks out, CleanProof generates:
- PDF report with all proof elements
- SLA status summary
- Job details and timeline

This report is instantly available to you.

## Proof in Action

### Scenario 1: Client Questions Quality

**Client says:** "The restrooms weren't cleaned properly."

**Your response:**
1. Open the job in History
2. Show before/after photos
3. Show completed checklist (including "Clean restrooms")
4. Share the PDF report

The proof speaks for itself.

### Scenario 2: Dispute About Timing

**Client says:** "Your cleaner arrived late."

**Your response:**
1. Open the job in History
2. Show GPS check-in timestamp
3. Compare to scheduled time
4. Share exact coordinates

No ambiguity, just facts.

### Scenario 3: Cleaner Says "I Did It"

**Cleaner says:** "I completed that task."

**Your response:**
1. Check the job checklist
2. If checked off → proven
3. If not checked off → not done

The digital checklist is the source of truth.

## Benefits of the Proof System

### For You (Manager)

- No more "he said, she said" disputes
- Real-time visibility into operations
- Data-driven decisions
- Reduced admin time

### For Your Clients

- Full transparency
- Verifiable service delivery
- Professional reports
- Audit compliance

### For Your Cleaners

- Clear expectations
- Fair accountability
- Protection from false claims
- Simplified workflow

## Proof vs. Trust

| Traditional Model | CleanProof Model |
|-------------------|------------------|
| "Trust me, I was there" | GPS check-in proves presence |
| "I did everything" | Checklist shows exactly what was done |
| "It looked clean" | Photos show before/after condition |
| Disputes and assumptions | Facts and evidence |

## Compliance & Audits

The Proof System makes audits simple:

**For Regulatory Compliance:**
- Timestamped records
- GPS-verified attendance
- Photo documentation
- Digital audit trail

**For Client Contracts:**
- Service level agreements enforced
- Performance metrics tracked
- Professional reporting
- Dispute resolution

**For Internal Quality Control:**
- Cleaner performance data
- Location-specific insights
- Trend analysis
- Process improvement

## Technical Details

### GPS Accuracy

CleanProof uses device GPS:
- Typically accurate to 5-10 meters
- Requires location services enabled
- Works on iOS and Android

### Photo Metadata

Each photo contains:
- GPS coordinates (latitude/longitude)
- Timestamp (date and time)
- Device information
- Resolution details

This metadata is embedded and tamper-evident.

### Data Storage

All proof data is:
- Encrypted at rest
- Backed up automatically
- Retained for audit purposes
- Accessible via reports

## Common Questions

**Can cleaners fake GPS?**

No. Device GPS cannot be easily spoofed, and any attempts are detectable.

**What if GPS doesn't work?**

The cleaner cannot check in without GPS. They should:
- Enable location services
- Move outside if signal is weak
- Contact you if issues persist

**Can photos be edited?**

Photos are uploaded immediately with embedded metadata. Any editing would break the metadata integrity.

**What if a cleaner forgets to check out?**

You can use **Force Complete**, but it creates an SLA violation for incomplete proof.

## Proof = Trust

Ironically, the Proof System builds trust:
- Your clients trust you (verifiable evidence)
- You trust your cleaners (fair accountability)
- Your cleaners trust the system (objective tracking)

It's not about surveillance—it's about transparency and professionalism.
    `,
  },

  "sla-engine": {
    id: "sla-engine",
    title: "SLA Engine",
    content: `
# SLA Engine

The SLA (Service Level Agreement) Engine automatically monitors compliance and detects violations.

## What is SLA?

An SLA defines the expected service quality. CleanProof automatically tracks whether jobs meet these standards.

## SLA Violations

CleanProof detects three types of violations:

### 1. Late Start

**Definition:** Check-in after scheduled start time.

**Example:**
- Job scheduled for 9:00 AM
- Cleaner checks in at 9:15 AM
- → Late start violation

**Why it matters:**
- Client expects service at specific times
- Late starts affect operations
- Pattern of lateness = reliability issue

**In reports:**
- Flagged with "Late Start" label
- Shows scheduled vs actual times
- Visible in SLA breakdown

### 2. Missing Photos

**Definition:** Before or after photos not uploaded.

**Example:**
- Check-in complete
- No before photos taken
- → Missing photos violation

**Why it matters:**
- No visual proof of condition
- Cannot resolve quality disputes
- Incomplete documentation

**In reports:**
- Flagged with "Missing Photos" label
- Indicates which photos are missing (before/after)
- Reduces proof quality

### 3. Incomplete Checklist

**Definition:** One or more checklist items not marked complete.

**Example:**
- 10 items on checklist
- 8 checked off
- 2 not completed
- → Incomplete checklist violation

**Why it matters:**
- Tasks were skipped
- Service quality not met
- Client expectations unmet

**In reports:**
- Flagged with "Incomplete Checklist" label
- Shows which items were missed
- Affects service quality score

## SLA Status

Every job has an SLA status:

### ✅ Compliant

All requirements met:
- On-time check-in
- All photos uploaded
- Checklist 100% complete

No violations.

### ⚠️ Violation

One or more requirements failed:
- Late start, or
- Missing photos, or
- Incomplete checklist

Job is flagged.

## Where to See SLA Data

### Job Details Page

Each job shows:
- SLA status badge
- List of violations (if any)
- Exact times for late start
- Missing photo types
- Incomplete checklist items

### Analytics Dashboard

Navigate to **Analytics** to see:
- **SLA Compliance Rate**: % of jobs compliant
- **Violation Breakdown**: Count by type
- **Trend Over Time**: Weekly violation rate
- **By Cleaner**: Performance comparison
- **By Location**: Site-specific issues

### Reports

Weekly and monthly reports include:
- SLA summary statistics
- Violation details
- Trends and patterns

## Using SLA Data

### Identify Patterns

Look for:

**Systematic late starts**
- Same cleaner always late?
- Specific location causing delays?
- Unrealistic scheduling?

**Consistent photo issues**
- Training problem?
- Mobile app issues?
- Cleaner forgetting?

**Incomplete checklists**
- Template too long?
- Time pressure?
- Tasks unclear?

### Take Action

Based on SLA data:

**For Cleaners:**
- Provide additional training
- Address specific issues
- Recognize good performance

**For Operations:**
- Adjust scheduling
- Review checklist templates
- Improve workflows

**For Clients:**
- Share SLA compliance rates
- Demonstrate accountability
- Address concerns proactively

## SLA Thresholds

CleanProof uses these standards:

**Late Start**
- Even 1 minute late = violation
- Strict but fair
- Encourages punctuality

**Photos**
- Both before AND after required
- No exceptions
- Essential for proof

**Checklist**
- 100% completion required
- All items must be checked
- Quality standard

## Exceptions and Force Complete

Sometimes violations are unavoidable:

**Acceptable situations:**
- Cleaner lost phone mid-job
- GPS malfunction
- Emergency circumstances

In these cases, use **Force Complete**:
1. Find the job
2. Click Force Complete
3. Add internal note explaining why
4. Job is marked complete with violation

This preserves data integrity while handling exceptions.

## SLA in Client Reporting

Use SLA data to build client trust:

### Monthly Reviews

Share with clients:
- Overall compliance rate
- Number of jobs completed
- Violations (if any) and resolutions
- Trend improvements

### Competitive Advantage

CleanProof SLA monitoring shows:
- You track quality objectively
- You're transparent about performance
- You hold your team accountable
- You continuously improve

Most competitors can't provide this level of insight.

## SLA vs. Proof

**Proof** = Did the job happen?
- GPS check-in/out
- Photos
- Checklist

**SLA** = Did the job meet standards?
- On time?
- Complete documentation?
- All tasks done?

Both are important. You can have proof that a job happened but still have SLA violations (e.g., late start, missing photos).

## Improving SLA Compliance

### Training

- Show cleaners their SLA performance
- Explain why each requirement matters
- Demonstrate proper check-in procedures

### Scheduling

- Allow realistic time windows
- Factor in travel time
- Avoid back-to-back jobs in distant locations

### Communication

- Set clear expectations
- Remind cleaners of photo requirements
- Reinforce checklist importance

### Recognition

- Celebrate high compliance rates
- Recognize cleaners with zero violations
- Use data to reward performance

## Analytics Deep Dive

**Navigate to Analytics → SLA Breakdown**

You'll see:

**Summary Metrics**
- Total jobs analyzed
- Compliant jobs count
- Compliant jobs percentage
- Violation jobs count

**Violation Types**
- Late start: count and %
- Missing photos: count and %
- Incomplete checklist: count and %

**Trends**
- Weekly violation rate
- Month-over-month changes
- Improvement or decline

**By Cleaner**
- Each cleaner's compliance rate
- Violation breakdown per cleaner
- Top performers vs. issues

**By Location**
- Location-specific compliance
- Problematic sites
- GPS accuracy issues

Use this data to:
- Spot trends early
- Address issues proactively
- Optimize operations
- Report to stakeholders

## Common Questions

**What's a good SLA compliance rate?**

Target: 90%+ compliant
- 95%+: Excellent
- 90-95%: Good
- 85-90%: Needs attention
- <85%: Requires action

**Do clients see SLA violations?**

Not by default. You control what clients see.

You can:
- Share summary statistics
- Include in monthly reports
- Discuss proactively
- Use as quality assurance proof

**Can I customize SLA rules?**

CleanProof's SLA rules are fixed:
- Late start = any delay
- Missing photos = either before or after
- Incomplete checklist = any unchecked item

This ensures consistency and objectivity.

**What if a violation was not the cleaner's fault?**

Use internal notes to document:
- GPS malfunction
- Client delayed access
- Emergency circumstances

The violation remains logged (for data integrity), but your notes provide context.

## SLA = Accountability

The SLA Engine transforms cleaning management from subjective ("Did they do a good job?") to objective ("Did they meet standards?").

This benefits everyone:
- Cleaners know exactly what's expected
- You have data to manage performance
- Clients see your commitment to quality
    `,
  },

  "analytics": {
    id: "analytics",
    title: "Analytics",
    content: `
# Analytics

CleanProof Analytics gives you operational insights to improve performance and demonstrate value to clients.

## Overview

Navigate to **Analytics** in the sidebar to access:

- **Summary Metrics**: High-level KPIs
- **Jobs Trend**: Completion trends over time
- **SLA Breakdown**: Compliance and violations
- **Performance**: Cleaner and location insights
- **Proof Completion**: Photo and checklist compliance

## Key Metrics

### Jobs Completed

**What it shows:** Number of jobs completed in the selected period.

**Use it to:**
- Track workload volume
- Identify busy periods
- Report to clients

**Filters:**
- Date range (last 7/30/90 days)
- By location
- By cleaner

### On-Time Completion Rate

**What it shows:** Percentage of jobs with no late start violation.

**Formula:** (Jobs started on time ÷ Total jobs) × 100

**Use it to:**
- Track punctuality
- Identify scheduling issues
- Improve reliability

**Target:** 95%+ is excellent

### SLA Compliance Rate

**What it shows:** Percentage of jobs with zero SLA violations.

**Formula:** (Compliant jobs ÷ Total jobs) × 100

**Use it to:**
- Measure overall quality
- Report to stakeholders
- Set improvement goals

**Target:** 90%+ is good

### Proof Completion Rate

**What it shows:** Percentage of jobs with all photos and checklist items.

**Use it to:**
- Track documentation quality
- Identify training needs
- Ensure audit readiness

**Target:** 100% is the goal

## Jobs Trend Chart

Visual representation of:
- Jobs completed over time
- Daily, weekly, or monthly view
- Trend line showing growth or decline

**Insights:**
- Seasonal patterns
- Growth trajectory
- Capacity planning

## SLA Breakdown

Detailed violation analysis:

### By Type

- **Late Start**: Count and percentage
- **Missing Photos**: Count and percentage
- **Incomplete Checklist**: Count and percentage

### By Cleaner

Table showing each cleaner:
- Total jobs
- Compliant jobs
- Violation count
- Compliance rate

**Use it to:**
- Identify top performers
- Spot training needs
- Fair performance reviews

### By Location

Table showing each location:
- Total jobs
- Compliant jobs
- Violation count
- Compliance rate

**Use it to:**
- Identify problematic sites
- GPS accuracy issues
- Schedule optimization

## Cleaners Performance

Detailed breakdown per cleaner:

**Metrics per cleaner:**
- Jobs completed
- On-time rate
- Proof completion rate
- Average job duration
- SLA compliance rate

**Use it to:**
- Performance reviews
- Bonus calculations
- Training priorities
- Workload balancing

## Locations Performance

Detailed breakdown per location:

**Metrics per location:**
- Jobs completed
- Average duration
- SLA compliance rate
- Violation patterns

**Use it to:**
- Client-specific reporting
- Site-specific issues
- Contract reviews
- Service optimization

## Proof Completion Insights

Photos and checklist analysis:

**Photo Compliance:**
- % with before photos
- % with after photos
- % with both

**Checklist Compliance:**
- Average completion rate
- Common incomplete items
- Pattern analysis

## Date Range Filters

All analytics support:
- Last 7 days
- Last 30 days
- Last 90 days
- Custom date range

Choose the period most relevant to your needs.

## Export & Reporting

Export analytics data:
- Download as Excel
- Generate PDF summary
- Schedule email reports

Use exports for:
- Client reporting
- Internal meetings
- Performance reviews
- Contract renewals

## Real-World Use Cases

### Weekly Team Meeting

1. Open Analytics
2. Set date range: Last 7 days
3. Review:
   - Jobs completed this week
   - SLA compliance rate
   - Top performers
   - Any issues

### Monthly Client Report

1. Set date range: Last 30 days
2. Export:
   - Jobs completed
   - SLA compliance rate
   - Proof completion rate
3. Add to client report
4. Show transparency and accountability

### Performance Review

1. Go to Cleaners Performance
2. Select date range: Last 90 days
3. Review individual cleaner:
   - Jobs completed
   - On-time rate
   - Violation patterns
4. Discuss with cleaner
5. Set improvement goals

### Contract Renewal

1. Go to Locations Performance
2. Filter by specific client location
3. Export 12-month data
4. Show:
   - Consistency
   - Quality metrics
   - Compliance rates
5. Use for contract negotiation

## Advanced Insights

### Violation Trends

Look for patterns:

**Increasing late starts?**
- Scheduling too tight?
- Traffic patterns changed?
- Cleaner issues?

**Missing photos spike?**
- App issues?
- Training forgotten?
- New cleaners?

**Incomplete checklists?**
- Template too long?
- Time pressure?
- Unclear items?

### Seasonal Patterns

Compare periods:
- Summer vs. winter
- Weekday vs. weekend
- Month-over-month

Adjust operations based on patterns.

### Capacity Planning

Use job volume trends:
- Are you growing?
- Peak periods?
- Need more cleaners?
- Can handle more contracts?

## Common Questions

**How often is analytics data updated?**

Real-time. As soon as jobs are completed, they appear in analytics.

**Can I compare cleaners fairly?**

Yes. Analytics shows:
- Jobs per cleaner
- Metrics per cleaner
- Fair comparison by rate (not just count)

**What's a good benchmark?**

Industry targets:
- SLA compliance: 90%+
- On-time rate: 95%+
- Proof completion: 100%

**Can I share analytics with clients?**

Yes. Use export features or take screenshots. Show clients:
- Your commitment to quality
- Transparent tracking
- Continuous improvement

**Why do some cleaners have lower metrics?**

Possible reasons:
- Harder locations assigned
- Newer to the team
- More complex jobs
- Training needed

Review context before judging performance.

## Analytics Best Practices

### Review Regularly

- Weekly: Quick check of key metrics
- Monthly: Deep dive into trends
- Quarterly: Strategic planning

### Set Benchmarks

- Establish baseline
- Set improvement goals
- Track progress over time

### Share Insights

- With your team: Show performance
- With clients: Demonstrate quality
- With stakeholders: Report growth

### Take Action

Analytics is only valuable if you act on it:
- Identify issues → Address them
- Spot trends → Adjust operations
- See success → Replicate it

## The Power of Data

CleanProof Analytics transforms cleaning from a commodity service to a data-driven operation.

You move from:
- "We clean well" → "Here's proof we exceed 95% on-time rate"
- "Trust us" → "Here's our SLA compliance data"
- "We're professional" → "Here's 6 months of performance metrics"

Your clients get transparency. You get operational control.
    `,
  },

  "plans-billing": {
    id: "plans-billing",
    title: "Plans & Billing",
    content: `
# Plans & Billing

Information about CleanProof subscription plans, billing, and account management.

## Subscription Plans

CleanProof offers flexible plans for businesses of all sizes.

### Standard Plan

**Best for:** Small to medium cleaning companies

**Includes:**
- Unlimited users
- Unlimited locations
- GPS verification
- Photo documentation
- Digital checklists
- PDF reports
- Email reports
- SLA monitoring
- Analytics dashboard
- Mobile app for cleaners
- Web dashboard for managers

**Billing:**
- Usage-based pricing
- Pay for active jobs
- No long-term contract required

### Pro Plan

**Best for:** Growing companies with advanced needs

**Includes everything in Standard, plus:**
- Advanced analytics
- Custom reporting
- Priority support
- API access (if available)
- White-label reports (if available)

Contact sales for pricing.

### Enterprise Plan

**Best for:** Large organizations with custom requirements

**Includes everything in Pro, plus:**
- Dedicated account manager
- Custom integrations
- SLA guarantees
- Custom training
- Volume discounts

Contact sales for custom pricing.

## Free Trial

**Try CleanProof risk-free:**
- 14-day free trial (or 30 days, check current offer)
- Full access to all Standard features
- No credit card required to start
- Cancel anytime during trial

**After trial:**
- Convert to paid plan
- Or account moves to read-only

## Billing

### How It Works

1. **Trial Period**: Free access
2. **After Trial**: Automatic upgrade to Standard (if configured)
3. **Monthly Billing**: Charged monthly based on usage
4. **Flexible**: Scale up or down as needed

### Usage-Based Pricing

You're charged based on:
- Number of active jobs completed
- Additional users (if applicable to plan)
- Premium features used

**Example:**
- 100 jobs/month: $X
- 500 jobs/month: $Y
- 1000+ jobs/month: Custom pricing

(Check your actual plan for specific rates)

### Payment Methods

Accepted:
- Credit card
- Debit card
- Bank transfer (Enterprise plans)

Managed through secure payment portal.

### Billing Settings

Access via **Settings** → **Billing**

**View:**
- Current plan
- Usage summary
- Billing history
- Next invoice date
- Payment method

**Actions:**
- Update payment method
- Download invoices
- View usage details

## Managing Your Subscription

### Upgrading

To upgrade your plan:
1. Go to Settings → Billing
2. Click **Upgrade Plan**
3. Select new plan
4. Confirm

Changes apply immediately.

### Downgrading

To downgrade:
1. Go to Settings → Billing
2. Click **Change Plan**
3. Select lower tier
4. Changes apply next billing cycle

### Cancellation

To cancel CleanProof:
1. Contact support
2. Provide cancellation request
3. Account moves to read-only after current period

**Note:**
- Data is retained for 90 days
- You can export data before cancellation
- Reactivation possible within 90 days

## Usage Tracking

Monitor your usage:

**Settings → Billing → Usage Summary**

Shows:
- Jobs completed this month
- Current plan limits
- Projected invoice
- Usage trends

**Why it matters:**
- No surprise bills
- Plan right-sized for your needs
- Identify growth

## Invoices

**Automatic invoicing:**
- Sent monthly via email
- Available in Settings → Billing
- Downloadable as PDF

**Invoice includes:**
- Billing period
- Usage details
- Amount charged
- Payment method
- Company details

Use invoices for:
- Accounting records
- Expense reporting
- Tax purposes

## Fair Usage Policy

CleanProof usage-based pricing is fair and transparent:

**No hidden fees:**
- Only pay for what you use
- No setup fees
- No cancellation fees

**Scalable:**
- Start small
- Grow as you grow
- No penalty for growth

## Support Plans

### Standard Support

**Included in all plans:**
- Email support
- Knowledge base access
- Video tutorials
- Response time: 24 hours

### Priority Support

**Included in Pro and Enterprise:**
- Email and phone support
- Faster response time: 4 hours
- Dedicated support contact

### Enterprise Support

**Included in Enterprise:**
- 24/7 support
- Dedicated account manager
- Custom training sessions
- Onboarding assistance

## Common Questions

**Can I change plans anytime?**

Yes. Upgrades are immediate. Downgrades apply next billing cycle.

**What happens if I exceed my plan limits?**

You'll be notified and can:
- Upgrade to higher plan
- Pay overage fees (if applicable)
- Reduce usage

**Do unused jobs roll over?**

No. Billing is monthly based on actual usage.

**Can I get a refund?**

Refunds are evaluated case-by-case. Contact support.

**Is my data safe?**

Yes. CleanProof uses:
- Encrypted storage
- Secure data centers
- Regular backups
- GDPR compliance (if applicable)

**Can I export my data?**

Yes. You can export:
- Job history
- Reports
- Analytics data
- Before leaving CleanProof

## Contact Sales

For custom plans or questions:

- Email: sales@cleanproof.com (example)
- Phone: Available in your account
- Live chat: Available during business hours

We'll help you find the right plan for your business.

## Tips for Optimizing Costs

1. **Right-size your plan**
   - Review usage monthly
   - Upgrade/downgrade as needed

2. **Train your team**
   - Efficient use reduces errors
   - Fewer re-dos = lower costs

3. **Use analytics**
   - Identify inefficiencies
   - Optimize operations
   - Reduce wasted jobs

4. **Plan ahead**
   - Annual plans may offer discounts
   - Ask about volume pricing

CleanProof grows with your business. Pay for what you need, scale when you're ready.
    `,
  },
};
