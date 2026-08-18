# pyrefly: ignore [missing-import]
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Appointment

class AppointmentSerializer(serializers.ModelSerializer):
    paciente_name = serializers.ReadOnlyField(source='paciente.get_full_name')
    doctor_name = serializers.ReadOnlyField(source='doctor.get_full_name')
    hospital_name = serializers.ReadOnlyField(source='hospital.nombre')

    class Meta:
        model = Appointment
        fields = '__all__'

    def validate(self, data):
        """Invoca clean() del modelo para activar la validación de traslapes."""
        instance = Appointment(**data)
        if self.instance:
            # Si es una actualización, conservar el PK para que clean() se excluya a sí misma
            instance.pk = self.instance.pk
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else {'detail': str(e)})
        return data
