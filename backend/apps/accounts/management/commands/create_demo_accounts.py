"""
Management command: create_demo_accounts

Creates demo accounts for CleanProof and MaintainProof with minimal
seed data so new visitors can explore the product immediately.

Usage: python manage.py create_demo_accounts
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

DEMO_ACCOUNTS = [
    {
        "email": "demo-cleaning@proofplatform.com",
        "first_name": "Demo",
        "last_name": "Manager",
        "role": "manager",
    },
    {
        "email": "demo-maintenance@proofplatform.com",
        "first_name": "Demo",
        "last_name": "Manager",
        "role": "manager",
    },
]


class Command(BaseCommand):
    help = "Create demo accounts for CleanProof and MaintainProof"

    def handle(self, *args, **options):
        for account in DEMO_ACCOUNTS:
            user, created = User.objects.get_or_create(
                email=account["email"],
                defaults={
                    "first_name": account["first_name"],
                    "last_name": account["last_name"],
                    "role": account.get("role", "manager"),
                    "is_active": True,
                    "is_demo": True,
                },
            )
            if created:
                # Set an unusable password — demo login doesn't need one
                user.set_unusable_password()
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f"Created demo account: {account['email']}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Demo account already exists: {account['email']}")
                )

        self.stdout.write(self.style.SUCCESS("\nDone. Demo accounts ready."))
        self.stdout.write("Run seed_demo_data to populate with sample data.")
