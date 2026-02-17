#!/usr/bin/env python
"""
Seed script for creating test data for Maintenance context
V3 PWA Enhancement - Offline Photo Capture testing
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from apps.accounts.models import User, Company
from apps.locations.models import Location
from apps.maintenance.models import Asset, AssetType
from apps.jobs.models import Job


def seed_test_data():
    """Create test data for Maintenance testing"""

    print("=" * 60)
    print("SEED TEST DATA - Maintenance Context")
    print("=" * 60)

    # Get the latest user (the one who just registered)
    try:
        user = User.objects.filter(role__in=['owner', 'manager']).latest('id')
        company = user.company
        print(f"\n✅ Found user: {user.email} (Company: {company.name})")
    except User.DoesNotExist:
        print("\n❌ No owner/manager user found. Please register first.")
        return

    # 1. Create Location
    print("\n1. Creating Location...")
    location, created = Location.objects.get_or_create(
        company=company,
        name="Test Building - Downtown",
        defaults={
            'address': "123 Sheikh Zayed Road, Dubai",
            'latitude': 25.2048,
            'longitude': 55.2708,
            'is_active': True,
        }
    )
    if created:
        print(f"   ✅ Created location: {location.name}")
    else:
        print(f"   ℹ️  Location already exists: {location.name}")

    # 2. Create Technician (Staff user)
    print("\n2. Creating Technician...")
    tech_email = f"tech-{company.id}@test.com"
    technician, created = User.objects.get_or_create(
        email=tech_email,
        defaults={
            'full_name': "Ahmed Al-Rashid (Technician)",
            'role': User.ROLE_STAFF,
            'company': company,
            'phone': "+971501234567",
            'is_active': True,
        }
    )
    if created:
        technician.set_password("Test1234!")
        technician.save()
        print(f"   ✅ Created technician: {technician.full_name} ({technician.email})")
        print(f"      Password: Test1234!")
    else:
        print(f"   ℹ️  Technician already exists: {technician.full_name}")

    # 3. Create Asset Type
    print("\n3. Creating Asset Type...")
    asset_type, created = AssetType.objects.get_or_create(
        company=company,
        name="Fire Safety Equipment",
        defaults={
            'description': "Fire alarms, extinguishers, and safety systems",
        }
    )
    if created:
        print(f"   ✅ Created asset type: {asset_type.name}")
    else:
        print(f"   ℹ️  Asset type already exists: {asset_type.name}")

    # 4. Create Asset
    print("\n4. Creating Asset...")
    asset, created = Asset.objects.get_or_create(
        company=company,
        location=location,
        name="Fire Alarm Panel - Zone A",
        defaults={
            'asset_type': asset_type,
            'serial_number': "FA-2024-001",
            'description': "Main fire alarm control panel for Zone A",
            'is_active': True,
        }
    )
    if created:
        print(f"   ✅ Created asset: {asset.name}")
    else:
        print(f"   ℹ️  Asset already exists: {asset.name}")

    # 5. Create Service Visit
    print("\n5. Creating Service Visit...")
    today = datetime.now().date()
    visit_exists = Job.objects.filter(
        company=company,
        context=Job.CONTEXT_MAINTENANCE,
        asset=asset,
        scheduled_date=today
    ).exists()

    if not visit_exists:
        visit = Job.objects.create(
            company=company,
            context=Job.CONTEXT_MAINTENANCE,
            location=location,
            cleaner=technician,
            asset=asset,
            scheduled_date=today,
            scheduled_start_time="10:00:00",
            scheduled_end_time="12:00:00",
            status=Job.STATUS_IN_PROGRESS,  # Set to in_progress for photo testing
            priority=Job.PRIORITY_MEDIUM,
            manager_notes="Routine maintenance check - test fire alarm functionality",
        )
        print(f"   ✅ Created service visit: #{visit.id}")
        print(f"      Status: {visit.status}")
        print(f"      Date: {visit.scheduled_date}")
        print(f"      Time: {visit.scheduled_start_time} - {visit.scheduled_end_time}")
    else:
        visit = Job.objects.filter(
            company=company,
            context=Job.CONTEXT_MAINTENANCE,
            asset=asset,
            scheduled_date=today
        ).first()
        print(f"   ℹ️  Visit already exists: #{visit.id}")

    # Summary
    print("\n" + "=" * 60)
    print("SEED COMPLETED ✅")
    print("=" * 60)
    print(f"\n📋 Test Data Summary:")
    print(f"   Company:    {company.name}")
    print(f"   User:       {user.email}")
    print(f"   Technician: {technician.email}")
    print(f"   Location:   {location.name}")
    print(f"   Asset:      {asset.name}")
    print(f"   Visit ID:   {visit.id}")
    print(f"\n🔗 Visit URL:")
    print(f"   http://localhost:8080/maintenance/visits/{visit.id}")
    print(f"\n📸 Ready to test Offline Photo Capture!")
    print("=" * 60)


if __name__ == '__main__':
    seed_test_data()
