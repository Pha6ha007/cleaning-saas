# config/celery.py
# Celery configuration for automated task scheduling
# Stage 14: Automated Visit Generation

import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Create Celery app
app = Celery('cleanproof')

# Load config from Django settings, using CELERY_ namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# Configure periodic tasks (beat schedule)
app.conf.beat_schedule = {
    # Generate visits from recurring templates every day at 6:00 AM
    'generate-recurring-visits-daily': {
        'task': 'apps.maintenance.tasks.generate_recurring_visits',
        'schedule': crontab(hour=6, minute=0),
        'options': {'queue': 'maintenance'},
    },
    # Check for SLA warnings every hour
    'check-sla-warnings-hourly': {
        'task': 'apps.maintenance.tasks.check_sla_warnings',
        'schedule': crontab(minute=0),  # Every hour at :00
        'options': {'queue': 'maintenance'},
    },
}

# Task routing
app.conf.task_routes = {
    'apps.maintenance.tasks.*': {'queue': 'maintenance'},
}

# Task settings
app.conf.task_serializer = 'json'
app.conf.result_serializer = 'json'
app.conf.accept_content = ['json']
app.conf.timezone = 'UTC'
app.conf.enable_utc = True


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    print(f'Request: {self.request!r}')
