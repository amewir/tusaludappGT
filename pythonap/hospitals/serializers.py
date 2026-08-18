from rest_framework import serializers
from .models import Hospital, AlertaEmergencia

class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = '__all__'

class AlertaEmergenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertaEmergencia
        fields = '__all__'
