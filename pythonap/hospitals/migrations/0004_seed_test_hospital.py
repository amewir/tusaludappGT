from django.db import migrations

def seed_hospital(apps, schema_editor):
    Hospital = apps.get_model('hospitals', 'Hospital')
    Hospital.objects.get_or_create(
        nombre="Centro Médico Paliativo del Valle",
        defaults={
            "direccion": "Valle de la Ermita, a 30km de la Ciudad de Guatemala",
            "latitud": 14.5635,
            "longitud": -90.7344,
            "tel_emergencia": "911 GT",
            "tiene_unidad_paliativa": True,
            "calendario_atencion": "Abierto 24 Horas y Festivos",
            "estado_atencion": "Verde"
        }
    )

def remove_hospital(apps, schema_editor):
    Hospital = apps.get_model('hospitals', 'Hospital')
    Hospital.objects.filter(nombre="Centro Médico Paliativo del Valle").delete()

class Migration(migrations.Migration):

    dependencies = [
        ('hospitals', '0003_hospital_estado_atencion_alertaemergencia'),
    ]

    operations = [
        migrations.RunPython(seed_hospital, reverse_code=remove_hospital),
    ]
