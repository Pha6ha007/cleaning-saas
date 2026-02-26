/**
 * MaintainProof Documentation Content
 * Content for each documentation page
 */

export interface DocContent {
  title: string;
  content: string;
}

export const docContent: Record<string, DocContent> = {
  "first-steps": {
    title: "First Steps",
    content: `
Welcome to MaintainProof! This guide will help you set up your account and log your first service visit in under 10 minutes.

## Quick Start

Follow these steps to get started with MaintainProof:

### 1. Create Your First Location

Locations represent physical sites where your assets are installed (buildings, facilities, complexes).

- Navigate to **Locations** in the sidebar
- Click **Add Location**
- Enter location details (name, address, contact information)
- Save the location

### 2. Add Asset Types

Asset Types define categories of equipment you maintain (HVAC, Elevators, Electrical Panels, etc.).

- Go to **Settings** → **Asset Types**
- Click **Add Asset Type**
- Enter type name and description
- Optionally add default checklist items
- Save the asset type

### 3. Register Your First Asset

Assets are individual pieces of equipment that require maintenance.

- Navigate to the location you created
- Click **Add Asset**
- Select asset type
- Enter asset details (name, serial number, installation date)
- Optionally generate a QR code for quick mobile access
- Save the asset

### 4. Add a Technician

Technicians are field workers who perform service visits.

- Go to **Settings** → **Team**
- Click **Add Technician**
- Enter technician details (name, email, phone)
- Assign appropriate role and permissions
- Save the technician

### 5. Create Your First Service Visit

Service Visits are maintenance jobs assigned to technicians.

- Navigate to **Service Visits**
- Click **Create Service Visit**
- Select the asset to be serviced
- Assign a technician
- Set date and time
- Select or create a checklist template
- Save and schedule the visit

### 6. Track and Review Proof

Once the technician completes the visit:

- Check-in and check-out times are recorded
- Photos of the work are uploaded
- Checklist items are marked complete
- You can review all proof in the visit details

That's it! You've successfully logged your first service visit in MaintainProof.

## Next Steps

- Explore the **Analytics** dashboard to track performance
- Set up **SLA rules** to monitor compliance
- Create reusable **Checklist Templates** for common tasks
- Review **Asset History** to see maintenance records
`,
  },

  "how-it-works": {
    title: "How It Works",
    content: `
MaintainProof is a comprehensive platform for managing maintenance operations across facilities. Here's how it works.

## Core Workflow

### 1. Asset Registration

Register all equipment and assets that require maintenance. Each asset belongs to a location and has a type (HVAC, elevator, electrical panel, etc.).

Assets can have QR codes attached for quick mobile access by technicians in the field.

### 2. Service Visit Scheduling

Create service visits for scheduled maintenance or reactive repairs. Each visit is assigned to a technician with a specific date and time.

Visits can be:
- **Scheduled** — planned maintenance
- **Reactive** — emergency repairs
- **Recurring** — regular inspections

### 3. Field Execution

Technicians receive notifications about assigned visits. Using the mobile app, they:

1. Check in at the location
2. Take photos of the asset and work performed
3. Complete the checklist (if applicable)
4. Add notes about the condition or issues found
5. Check out when complete

### 4. Proof Collection

Every service visit generates proof of work:

- **Time stamps** — check-in and check-out times
- **Photos** — visual evidence of work performed
- **Checklists** — completion status of required tasks
- **Notes** — technician observations and comments

All proof is automatically collected and stored in the asset history.

### 5. SLA Monitoring

MaintainProof tracks SLA compliance in real-time:

- **Response time** — how quickly work started
- **Completion time** — whether work finished on schedule
- **Proof quality** — whether all required documentation was provided

Managers receive alerts when SLA violations occur.

### 6. Analytics and Reporting

View comprehensive analytics:

- Asset performance and reliability
- Technician productivity
- SLA compliance rates
- Maintenance costs and trends

Generate PDF reports for clients or internal review.

## Key Benefits

- **Accountability** — every visit has timestamped proof
- **Visibility** — real-time tracking of all field operations
- **Efficiency** — mobile-first workflow for technicians
- **Compliance** — automated SLA monitoring
- **Insights** — analytics to improve operations
`,
  },

  "managing-assets": {
    title: "Managing Assets",
    content: `
Assets are physical equipment that require maintenance — HVAC systems, elevators, electrical panels, generators, pumps, and more.

## What is an Asset?

An **asset** in MaintainProof represents a specific piece of equipment installed at a location. Each asset has:

- **Asset Type** — category (HVAC, elevator, etc.)
- **Location** — where it's installed
- **Details** — name, serial number, manufacturer, model
- **Installation Date** — when it was installed
- **QR Code** — for quick mobile access

## Creating Asset Types

Before adding assets, define asset types:

1. Go to **Settings** → **Asset Types**
2. Click **Add Asset Type**
3. Enter type name (e.g., "Split AC Unit", "Passenger Elevator")
4. Add description
5. Optionally define default checklist items
6. Save

Asset types are reusable templates that make adding assets faster.

## Adding Assets

To add an asset:

1. Navigate to the location where the asset is installed
2. Click **Add Asset**
3. Select the asset type
4. Fill in asset details:
   - Name (e.g., "AC Unit - 3rd Floor East")
   - Serial number
   - Manufacturer and model
   - Installation date
   - Notes
5. Generate QR code if needed
6. Save

The asset will appear in the location's asset list.

## QR Codes for Quick Access

Each asset can have a QR code that technicians can scan to:

- View asset details and history
- Start a new service visit
- Access maintenance instructions

Print QR codes and attach them to physical equipment for fast field access.

## Asset History

Every service visit creates a record in the asset's history. View:

- All past service visits
- Photos from each visit
- Issues reported by technicians
- Maintenance trends over time

Export asset history as a PDF report for compliance or client reporting.

## Asset Lifecycle

Track assets through their entire lifecycle:

1. **Installation** — register the asset
2. **Active** — regular maintenance and service
3. **Repair** — reactive service when issues arise
4. **Replacement** — retire old assets, install new ones

MaintainProof maintains a complete record of every stage.
`,
  },

  "creating-service-visits": {
    title: "Creating Service Visits",
    content: `
Service visits are the core of MaintainProof — they represent maintenance work performed by technicians on specific assets.

## What is a Service Visit?

A **service visit** is a maintenance job assigned to a technician. It includes:

- **Asset** — which equipment is being serviced
- **Technician** — who will perform the work
- **Date & Time** — when the work is scheduled
- **Checklist** — tasks to be completed (optional)
- **Type** — scheduled, reactive, or recurring

## Creating a Service Visit

### Step 1: Select Asset

Navigate to **Service Visits** and click **Create Service Visit**.

Choose the asset that needs service. You can search by:
- Asset name
- Asset type
- Location

### Step 2: Assign Technician

Select which technician will perform the work. Consider:
- Technician availability
- Expertise with this asset type
- Location proximity

### Step 3: Schedule Date and Time

Set when the work should be performed:
- **Date** — calendar date
- **Start time** — when work should begin
- **Estimated duration** — how long it should take

For recurring visits, set the recurrence pattern (daily, weekly, monthly).

### Step 4: Add Checklist (Optional)

Select a checklist template or create a custom checklist. Checklists ensure:
- All required tasks are completed
- Nothing is missed during the visit
- Consistent service quality

### Step 5: Save and Schedule

Review the visit details and click **Schedule**. The technician will receive a notification about the new assignment.

## Visit Statuses

Service visits progress through statuses:

- **Scheduled** — assigned but not started
- **In Progress** — technician has checked in
- **Completed** — technician has checked out
- **Reviewed** — manager has reviewed the proof

## What Happens Next?

Once scheduled, the technician:

1. Receives a notification
2. Views visit details in the mobile app
3. Navigates to the location
4. Checks in to start work
5. Takes photos and completes checklist
6. Checks out when done

All proof is automatically captured and stored in the visit record.

## Reactive Service Visits

For emergency repairs, create a reactive visit:

1. Click **Create Service Visit**
2. Select **Reactive** as the type
3. Assign to an available technician
4. Set priority level (urgent, high, normal)
5. Schedule immediately or ASAP

Reactive visits are flagged for faster response.

## Recurring Service Visits

For regular maintenance (monthly inspections, quarterly service), set up recurring visits:

1. Create a service visit as normal
2. Enable **Recurring**
3. Set frequency (daily, weekly, monthly, custom)
4. Set end date or number of occurrences
5. Save

MaintainProof will automatically create future visits based on the recurrence pattern.
`,
  },

  "working-with-technicians": {
    title: "Working with Technicians",
    content: `
Technicians are field workers who perform maintenance and service visits. MaintainProof provides tools to manage technicians, track their work, and monitor performance.

## Adding Technicians

To add a new technician:

1. Go to **Settings** → **Team**
2. Click **Add Technician**
3. Enter details:
   - Full name
   - Email address
   - Phone number
   - Employee ID (optional)
4. Assign role and permissions
5. Save

The technician will receive login credentials via email.

## Roles and Permissions

Technicians can have different access levels:

- **Technician** — can view assigned visits, check in/out, upload photos
- **Lead Technician** — can also create visits and manage team
- **Manager** — full access to all features

Set permissions based on responsibilities.

## Assigning Work

Assign service visits to technicians:

1. Create a service visit
2. Select the technician from the dropdown
3. Optionally notify via SMS or push notification
4. Save

Technicians see assigned visits in their mobile app.

## Mobile App for Technicians

Technicians use the mobile app to:

- View assigned visits and schedules
- Navigate to locations (GPS)
- Check in when arriving
- Take photos of work
- Complete checklists
- Add notes
- Check out when finished

The mobile app works offline and syncs when connected.

## Tracking Performance

Monitor technician performance with analytics:

- **Visits completed** — total visits per period
- **Average duration** — time spent per visit
- **SLA compliance** — on-time completion rate
- **Photo quality** — proof documentation score
- **Customer ratings** — feedback from clients (if enabled)

Use these metrics for performance reviews and training.

## GPS and Check-in/Check-out

MaintainProof captures GPS location and time stamps:

- **Check-in** — when technician arrives
- **Check-out** — when work is complete
- **Location** — GPS coordinates

This provides accountability and proof of field presence.

## Communication

Communicate with technicians:

- **In-app messages** — send notes on specific visits
- **Push notifications** — alert about urgent assignments
- **SMS** — for critical updates

Keep communication centralized in MaintainProof.
`,
  },

  "checklist-templates": {
    title: "Checklist Templates",
    content: `
Checklist templates ensure consistent, high-quality service by defining standard tasks for different asset types.

## What is a Checklist Template?

A **checklist template** is a reusable list of tasks that technicians must complete during a service visit.

For example, an HVAC maintenance checklist might include:
- Check air filters
- Inspect condenser coils
- Test thermostat
- Measure refrigerant levels
- Clean drainage system

## Creating Templates

To create a checklist template:

1. Go to **Settings** → **Checklists**
2. Click **Create Template**
3. Enter template name (e.g., "Monthly HVAC Inspection")
4. Add checklist items:
   - Item description
   - Required or optional
   - Photo required?
5. Save

Templates can be reused across multiple service visits.

## Using Templates

When creating a service visit:

1. Select **Checklist Template** dropdown
2. Choose the appropriate template
3. Optionally customize items for this specific visit
4. Save

The technician will see the checklist in their mobile app.

## Checklist Execution

During the service visit, technicians:

1. View each checklist item
2. Mark as complete when done
3. Add photos if required
4. Add notes if issues found

Incomplete checklists are flagged for manager review.

## Template Best Practices

- Keep checklists focused (5-15 items max)
- Use clear, actionable language
- Require photos for critical items
- Organize by workflow sequence
- Review and update templates quarterly

Good templates improve service quality and reduce errors.

## Asset Type Defaults

Link templates to asset types for automatic selection:

1. Go to **Asset Types**
2. Edit an asset type
3. Set **Default Checklist Template**
4. Save

When creating a visit for that asset type, the template will be pre-selected.
`,
  },

  "scheduling-calendar": {
    title: "Scheduling & Calendar",
    content: `
MaintainProof's scheduling system helps you plan and manage service visits across multiple technicians and locations.

## Calendar View

The calendar view shows:

- All scheduled service visits
- Assigned technicians
- Visit duration
- Location details

Switch between:
- **Day view** — hourly breakdown
- **Week view** — 7-day overview
- **Month view** — full month calendar

## Scheduling Best Practices

### Load Balancing

Distribute work evenly across technicians:
- Avoid over-scheduling any single technician
- Consider travel time between locations
- Account for visit complexity

### Time Buffers

Leave buffer time between visits:
- 15-30 minutes for travel
- Extra time for complex jobs
- Emergency slots for reactive visits

### Location Clustering

Group visits by location to minimize travel:
- Schedule nearby assets on the same day
- Assign local technicians when possible
- Plan efficient routes

## Recurring Schedules

Set up recurring visits for regular maintenance:

1. Create a service visit
2. Enable **Recurring**
3. Choose frequency:
   - Daily
   - Weekly (select days)
   - Monthly (select date or day of week)
   - Custom interval
4. Set end condition:
   - Never (ongoing)
   - After X occurrences
   - End date

Recurring visits auto-generate based on the pattern.

## Drag and Drop Rescheduling

Reschedule visits by dragging on the calendar:

1. Click and hold a visit
2. Drag to new date/time
3. Drop to reschedule
4. Technician is notified automatically

## Availability and Conflicts

MaintainProof prevents scheduling conflicts:

- Shows when technicians are already booked
- Warns if locations have overlapping visits
- Highlights overdue visits

## Notifications

Automated notifications for:

- **Technicians** — new assignments, changes, reminders
- **Managers** — upcoming visits, overdue visits
- **Clients** — service confirmations (if enabled)

Configure notification preferences in settings.

## Integration with Mobile

Technicians see their schedule in the mobile app:

- Today's visits
- Upcoming visits
- Navigation to next location
- Real-time updates

Changes sync instantly between console and mobile.
`,
  },

  "proof-system": {
    title: "Proof System",
    content: `
MaintainProof's proof system captures comprehensive evidence of every service visit, ensuring accountability and compliance.

## What is Proof?

**Proof** is the complete record of a service visit, including:

- **Time stamps** — check-in and check-out
- **GPS location** — where the technician was
- **Photos** — visual evidence of work
- **Checklists** — tasks completed
- **Notes** — technician observations
- **Signatures** — technician and client (optional)

All proof is automatically collected during the visit workflow.

## Check-in and Check-out

When a technician arrives at a location:

1. Open the visit in the mobile app
2. Tap **Check In**
3. GPS location and time are recorded

When work is complete:

1. Tap **Check Out**
2. GPS location and time are recorded
3. Duration is calculated

Check-in/out times prove the technician was on-site.

## Photo Documentation

Photos provide visual proof of:

- Condition before work
- Work in progress
- Completed results
- Issues or damage found

Best practices:
- Require photos for critical tasks
- Capture asset nameplate/serial number
- Show before and after
- Include timestamp and GPS in metadata

## Checklists as Proof

Completed checklists prove:

- All required tasks were performed
- Quality standards were met
- Nothing was missed

Managers can review checklist completion rates in analytics.

## Notes and Observations

Technicians can add notes about:

- Issues found during the visit
- Parts replaced
- Recommendations for future service
- Client requests

Notes become part of the permanent record.

## Client Signatures (Optional)

For client-facing service, collect signatures:

1. Technician completes work
2. Client reviews on-site
3. Client signs on mobile device
4. Signature is stored with visit proof

Signatures provide additional accountability.

## Proof Review

Managers review proof after visits:

1. Go to **Service Visits**
2. Select completed visit
3. Review all proof elements
4. Mark as **Reviewed** or **Requires Followup**

Unreviewed visits are flagged in the dashboard.

## Proof Reports

Generate PDF reports with all proof:

- Visit summary
- Time stamps and duration
- Photos
- Checklist completion
- Technician notes

Send reports to clients or use for compliance audits.

## Why Proof Matters

Proof provides:

- **Accountability** — technicians must document work
- **Transparency** — clients can verify service
- **Compliance** — meet regulatory requirements
- **Dispute resolution** — evidence if questions arise
- **Performance data** — analytics for improvement
`,
  },

  "sla-engine": {
    title: "SLA Engine",
    content: `
MaintainProof's SLA (Service Level Agreement) engine monitors service performance and ensures compliance with response and completion time commitments.

## What is SLA in Maintenance?

SLA defines service standards, including:

- **Response time** — how quickly work must start
- **Completion time** — how quickly work must finish
- **Proof requirements** — minimum documentation needed

For example:
- Emergency HVAC repair: respond within 2 hours, complete within 8 hours
- Routine inspection: complete within scheduled date

## SLA Rules

Define SLA rules for different visit types:

1. Go to **Settings** → **SLA Rules**
2. Click **Create Rule**
3. Set conditions:
   - Asset type (HVAC, elevator, etc.)
   - Visit type (scheduled, reactive, emergency)
   - Priority level
4. Set standards:
   - Max response time (hours)
   - Max completion time (hours)
   - Required proof (photos, checklist)
5. Save

Rules are automatically applied to matching visits.

## SLA Statuses

Each visit has an SLA status:

- **On Track** — within expected time
- **At Risk** — approaching deadline
- **Violated** — missed deadline

Status updates in real-time as time passes.

## Response Time SLA

**Response time** is measured from:
- **Start** — visit created or scheduled time
- **End** — technician check-in

Example:
- Visit created at 9:00 AM
- Technician checks in at 10:30 AM
- Response time: 1.5 hours

If SLA requires 2-hour response, this is **On Track**.

## Completion Time SLA

**Completion time** is measured from:
- **Start** — visit created or scheduled time
- **End** — technician check-out

Example:
- Visit scheduled for 2:00 PM
- Technician checks out at 4:00 PM
- Completion time: 2 hours

If SLA requires completion within 4 hours, this is **On Track**.

## SLA Violations

When a visit violates SLA:

1. Status changes to **Violated**
2. Visit is flagged in dashboard
3. Notifications sent to managers
4. Recorded in analytics

Review violations to identify root causes and improve processes.

## SLA Analytics

Track SLA performance:

- **Compliance rate** — % of visits meeting SLA
- **Average response time** — across all visits
- **Average completion time** — across all visits
- **Violations by type** — which asset types struggle most

Use analytics to:
- Set realistic SLA targets
- Identify training needs
- Optimize technician schedules
- Improve client satisfaction

## Client SLA Reporting

Generate SLA reports for clients:

1. Go to **Reports**
2. Select **SLA Performance**
3. Choose date range and location
4. Export as PDF

Reports show compliance rates and detailed visit metrics.

## Best Practices

- Set achievable SLA targets based on historical data
- Different SLAs for scheduled vs reactive visits
- Stricter SLAs for critical assets (elevators, fire systems)
- Review SLA rules quarterly and adjust as needed
- Communicate SLA expectations to technicians
`,
  },

  "asset-management": {
    title: "Asset Management",
    content: `
Asset management in MaintainProof goes beyond tracking equipment — it provides a complete lifecycle view of every asset's maintenance history, costs, and performance.

## Asset Lifecycle

Every asset goes through stages:

### 1. Registration

When first added to MaintainProof:
- Basic details (type, location, serial number)
- Installation date
- Manufacturer and model
- Initial photos

### 2. Active Service

Regular maintenance and reactive repairs:
- Scheduled service visits
- Emergency repairs
- Inspections and testing
- Parts replacement

Every service visit creates a record in the asset history.

### 3. Performance Tracking

Over time, MaintainProof tracks:
- Total service visits
- Downtime incidents
- Maintenance costs
- SLA compliance
- Reliability trends

### 4. End of Life

When assets are replaced:
- Mark as inactive or retired
- Historical data is preserved
- New replacement asset linked

## Asset History

The asset history is a complete timeline of:

- All service visits
- Photos from each visit
- Issues reported
- Parts replaced
- Costs incurred

Access asset history:

1. Go to **Locations**
2. Select a location
3. Click on an asset
4. View **History** tab

Export history as PDF for client reporting or compliance.

## Preventive vs Reactive Maintenance

MaintainProof tracks:

- **Preventive** — scheduled, regular maintenance
- **Reactive** — repairs due to failures or issues

Analytics show the ratio of preventive to reactive visits. A higher preventive ratio indicates better maintenance planning.

## Asset Health Score

Each asset has a health score based on:

- Frequency of issues
- Severity of failures
- SLA compliance
- Age since installation

Health scores help prioritize assets needing attention.

## Maintenance Costs

Track costs per asset:

- Labor costs (technician time)
- Parts and materials
- Service contracts
- Total cost of ownership

Compare costs across asset types to identify high-maintenance equipment.

## Asset QR Codes

Generate QR codes for physical assets:

1. Open asset details
2. Click **Generate QR Code**
3. Print and attach to equipment

Technicians scan QR codes to:
- View asset details and history
- Start a new service visit
- Access maintenance instructions

QR codes speed up field workflows.

## Asset Groups

Group similar assets for bulk operations:

- Apply same SLA rules
- Schedule recurring maintenance
- Generate group reports

For example, group all "Split AC Units" in a building for monthly filter replacement.

## Integration with Scheduling

Assets drive the scheduling workflow:

1. Select asset needing service
2. System suggests:
   - Appropriate checklist template
   - Qualified technicians
   - Recommended frequency
3. Create service visit
4. Track completion

Asset-centric scheduling ensures nothing is missed.

## Compliance and Audits

Use asset records for compliance:

- Regulatory inspections (fire, safety, etc.)
- Client audits
- Warranty claims
- Insurance documentation

Export asset reports with full service history as evidence.
`,
  },

  "analytics": {
    title: "Analytics",
    content: `
MaintainProof's analytics provide insights into service performance, technician productivity, asset reliability, and SLA compliance.

## Analytics Dashboard

The analytics dashboard shows:

- **Total service visits** — completed this period
- **SLA compliance rate** — % of visits meeting SLA
- **Average response time** — from assignment to check-in
- **Average completion time** — from assignment to check-out
- **Top performing technicians** — by visits completed
- **Asset reliability** — failure rates and downtime

Customize the date range to view trends over time.

## Service Visit Analytics

Track visit metrics:

- **Visits by status** — scheduled, in progress, completed
- **Visits by type** — preventive vs reactive
- **Visits by asset type** — which equipment needs most service
- **Visits by location** — service distribution across sites

Use these metrics to:
- Balance technician workloads
- Plan preventive maintenance schedules
- Identify high-maintenance locations

## SLA Performance

Monitor SLA compliance:

- **Compliance rate** — overall % meeting SLA
- **Violations by type** — which asset types struggle
- **Response time trends** — improving or declining
- **Completion time trends** — efficiency over time

Set targets and track progress toward goals.

## Technician Performance

Evaluate technician productivity:

- **Visits completed** — total per technician
- **Average duration** — time spent per visit
- **SLA compliance** — individual compliance rates
- **Photo quality** — proof documentation scores

Use performance data for:
- Recognition and rewards
- Training and coaching
- Workload balancing

## Asset Reliability

Track asset health and reliability:

- **Failure rate** — % of visits that are reactive repairs
- **Mean time between failures (MTBF)** — reliability metric
- **Maintenance costs** — total cost per asset
- **Downtime** — hours out of service

Identify problematic assets that need replacement or more frequent maintenance.

## Cost Analytics

Monitor maintenance costs:

- **Labor costs** — technician time
- **Parts and materials** — consumables
- **Service contracts** — external vendors
- **Cost per location** — total spending by site

Track cost trends and budget accordingly.

## Trends and Forecasting

View historical trends:

- Service volume over time
- Seasonal patterns (e.g., HVAC spikes in summer)
- Cost trends
- SLA performance trends

Use trends to forecast future needs and plan resources.

## Custom Reports

Generate custom reports:

1. Go to **Reports**
2. Select report type (visits, SLA, costs, etc.)
3. Set filters:
   - Date range
   - Locations
   - Asset types
   - Technicians
4. Export as PDF or CSV

Share reports with stakeholders or clients.

## Client Dashboards (Optional)

Provide clients with their own dashboard:

- Service visits for their locations
- SLA compliance
- Asset history
- Proof of service

Client dashboards improve transparency and satisfaction.

## Using Analytics for Improvement

Apply analytics insights:

- **Low SLA compliance?** — Review scheduling and technician training
- **High reactive visits?** — Increase preventive maintenance frequency
- **Costly assets?** — Consider replacement or upgrade
- **Technician performance gaps?** — Provide targeted training

Data-driven decisions improve operations and profitability.
`,
  },

  "plans-billing": {
    title: "Plans & Billing",
    content: `
MaintainProof offers flexible pricing plans for businesses of all sizes.

## Plans

### Starter Plan

For small maintenance teams:
- Up to 5 technicians
- Unlimited service visits
- Basic analytics
- Mobile app for technicians
- Email support

### Professional Plan

For growing businesses:
- Up to 20 technicians
- Advanced analytics and reports
- SLA monitoring
- Custom checklist templates
- Priority support

### Enterprise Plan

For large organizations:
- Unlimited technicians
- Multi-location support
- Custom integrations
- Dedicated account manager
- White-label options

## Billing

### Monthly Billing

- Pay monthly per technician
- No long-term commitment
- Cancel anytime

### Annual Billing

- Pay annually for 2 months free
- Lock in current pricing
- Priority support

## Adding or Removing Technicians

Adjust your plan as your team changes:

1. Go to **Settings** → **Billing**
2. Click **Manage Team Size**
3. Add or remove technician seats
4. Billing adjusts automatically

Charges are prorated for mid-month changes.

## Payment Methods

Accepted payment methods:
- Credit card (Visa, Mastercard, Amex)
- Direct debit
- Invoice (Enterprise plan only)

Update payment method in **Settings** → **Billing**.

## Invoices

Access invoices:

1. Go to **Settings** → **Billing**
2. Click **Invoice History**
3. Download PDF invoices

Invoices include:
- Plan details
- Number of technicians
- Usage summary
- Payment date

## Contact Sales

For custom pricing or enterprise needs:
- Email: sales@maintainproof.ae
- Phone: +971 4 XXX XXXX

Our sales team will work with you to create a plan that fits your business.
`,
  },
};
