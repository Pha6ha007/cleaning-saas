from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketing", "0003_reportemaillog"),
    ]

    operations = [
        migrations.AddField(
            model_name="contactmessage",
            name="phone",
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
