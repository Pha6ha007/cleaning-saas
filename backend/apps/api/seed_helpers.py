# backend/apps/api/seed_helpers.py
"""
Helper functions for seeding default data when creating new companies.
"""

from apps.accounts.models import Company
from apps.locations.models import ChecklistTemplate, ChecklistTemplateItem


def seed_default_checklists(company: Company) -> None:
    """
    Create default checklist templates for a new company.
    Creates templates for BOTH cleaning and maintenance contexts.

    Called automatically when a new company is created via signup.

    Args:
        company: The newly created Company instance
    """
    # Maintenance context templates (8 templates)
    MAINTENANCE_TEMPLATES = [
        {
            "name": "HVAC — Preventive Visit",
            "description": "Routine HVAC system preventive maintenance checklist",
            "items": [
                ("Verify unit model and serial number", True),
                ("Inspect air filters, replace if needed", True),
                ("Check refrigerant levels", True),
                ("Inspect condenser coils for debris", True),
                ("Verify thermostat operation", True),
                ("Check electrical connections", True),
                ("Lubricate fan motor bearings", False),
                ("Test system cycle operation", True),
                ("Clean drain pan and condensate line", True),
                ("Document findings and recommendations", True),
            ],
        },
        {
            "name": "Electrical — Safety Inspection",
            "description": "Electrical system safety inspection checklist",
            "items": [
                ("Inspect main panel for damage or corrosion", True),
                ("Verify breaker labels match circuits", True),
                ("Check for loose connections", True),
                ("Test GFCI outlets functionality", True),
                ("Inspect outlet covers for damage", True),
                ("Check emergency lighting operation", True),
                ("Verify grounding integrity", True),
                ("Thermal scan for hot spots", False),
                ("Document any code violations", True),
                ("Provide safety recommendations", True),
            ],
        },
        {
            "name": "Plumbing — Leak / Pressure Check",
            "description": "Plumbing system inspection and pressure testing",
            "items": [
                ("Visual inspection of exposed pipes", True),
                ("Check for active leaks or moisture", True),
                ("Test water pressure at fixtures", True),
                ("Inspect water heater condition", True),
                ("Check shut-off valve operation", True),
                ("Inspect drain flow and condition", True),
                ("Check toilet fill and flush mechanism", True),
                ("Test backflow preventer (if present)", False),
                ("Document findings and photos", True),
            ],
        },
        {
            "name": "Generator — Monthly Test",
            "description": "Monthly generator operational test checklist",
            "items": [
                ("Check fuel level and quality", True),
                ("Inspect battery condition and connections", True),
                ("Check coolant level", True),
                ("Inspect oil level and condition", True),
                ("Check air filter condition", True),
                ("Verify automatic transfer switch operation", True),
                ("Run generator under load for 30 minutes", True),
                ("Record runtime hours", True),
                ("Check exhaust system for leaks", True),
                ("Document operational parameters", True),
                ("Schedule next service if needed", False),
            ],
        },
        {
            "name": "Elevator — Routine Check",
            "description": "Elevator safety and operational inspection",
            "items": [
                ("Verify cab lighting and ventilation", True),
                ("Check door operation and safety edge", True),
                ("Test emergency phone operation", True),
                ("Inspect cab interior for damage", True),
                ("Check floor leveling accuracy", True),
                ("Verify emergency stop functionality", True),
                ("Inspect machine room equipment", True),
                ("Check safety certificates current", True),
                ("Document any issues found", True),
            ],
        },
        {
            "name": "Fire Safety — Inspection",
            "description": "Fire safety equipment inspection checklist",
            "items": [
                ("Inspect fire extinguisher condition", True),
                ("Verify extinguisher service dates", True),
                ("Test smoke detector operation", True),
                ("Check emergency exit signs", True),
                ("Verify exit paths clear", True),
                ("Inspect sprinkler heads (visual)", True),
                ("Check fire alarm panel status", True),
                ("Document inspection findings", True),
            ],
        },
        {
            "name": "Water Tank — Maintenance",
            "description": "Water storage tank inspection and maintenance",
            "items": [
                ("Inspect tank exterior for damage", True),
                ("Check tank level indicator", True),
                ("Inspect inlet/outlet valves", True),
                ("Check for sediment buildup", True),
                ("Test overflow drain operation", True),
                ("Inspect pump operation (if present)", True),
                ("Verify water quality acceptable", False),
                ("Clean tank interior if scheduled", False),
                ("Document maintenance performed", True),
            ],
        },
        {
            "name": "General Equipment — Service",
            "description": "General equipment service visit checklist",
            "items": [
                ("Confirm asset identification", True),
                ("Review previous service history", False),
                ("Perform visual inspection", True),
                ("Check operational status", True),
                ("Perform required service tasks", True),
                ("Test functionality after service", True),
                ("Clean work area", True),
                ("Document findings and actions", True),
            ],
        },
    ]

    # Cleaning context templates (3 templates)
    CLEANING_TEMPLATES = [
        {
            "name": "Standard Cleaning",
            "description": "Standard apartment/house cleaning",
            "items": [
                ("Vacuum all floors", True),
                ("Mop kitchen and bathrooms", True),
                ("Clean windows and mirrors", True),
                ("Dust all surfaces", True),
                ("Empty trash bins", True),
                ("Sanitize door handles", True),
            ],
        },
        {
            "name": "Deep Cleaning",
            "description": "Deep cleaning with extra detailed tasks",
            "items": [
                ("Vacuum all floors", True),
                ("Mop kitchen and bathrooms", True),
                ("Clean windows and mirrors", True),
                ("Dust all surfaces", True),
                ("Empty trash bins", True),
                ("Sanitize door handles", True),
                ("Clean inside kitchen cabinets", True),
                ("Degrease stove and oven exterior", True),
                ("Scrub tile grout in bathroom", True),
                ("Wipe baseboards and skirting boards", True),
                ("Clean behind and under furniture", True),
                ("Descale shower heads and faucets", True),
            ],
        },
        {
            "name": "Office Cleaning",
            "description": "Office space cleaning",
            "items": [
                ("Vacuum all office floors and carpets", True),
                ("Wipe desks and work surfaces", True),
                ("Disinfect keyboards and mice", True),
                ("Empty all trash bins and replace liners", True),
                ("Clean meeting room tables and chairs", True),
                ("Wipe glass doors and partitions", True),
                ("Clean and restock kitchen area", True),
                ("Clean and restock restrooms", True),
            ],
        },
    ]

    # Create maintenance templates
    for template_data in MAINTENANCE_TEMPLATES:
        template = ChecklistTemplate.objects.create(
            company=company,
            name=template_data["name"],
            description=template_data["description"],
            context=ChecklistTemplate.CONTEXT_MAINTENANCE,
            is_active=True,
        )
        for order, (text, is_required) in enumerate(template_data["items"], start=1):
            ChecklistTemplateItem.objects.create(
                template=template,
                order=order,
                text=text,
                is_required=is_required,
            )

    # Create cleaning templates
    for template_data in CLEANING_TEMPLATES:
        template = ChecklistTemplate.objects.create(
            company=company,
            name=template_data["name"],
            description=template_data["description"],
            context=ChecklistTemplate.CONTEXT_CLEANING,
            is_active=True,
        )
        for order, (text, is_required) in enumerate(template_data["items"], start=1):
            ChecklistTemplateItem.objects.create(
                template=template,
                order=order,
                text=text,
                is_required=is_required,
            )
