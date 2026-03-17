# config/celery.py
# Celery configuration for automated task scheduling
# Stage 14: Automated Visit Generation

import os
from celery import Celery

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Create Celery app
app = Celery('cleanproof')

# Load config from Django settings, using CELERY_ namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# Configure periodic tasks (beat schedule)
# NOTE (M002/S04): Periodic tasks are now managed via Django Admin through
# django-celery-beat DB-backed schedules. The hardcoded beat_schedule has been
# removed. Run on each deploy to create/update tasks:
#
#   python manage.py setup_periodic_tasks
#
# This populates django_celery_beat PeriodicTask entries which beat reads
# via DatabaseScheduler (set in settings.py: CELERY_BEAT_SCHEDULER).

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
