from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PatientProfile, RecordatorioMedico, Procedimiento

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'is_staff', 'is_active', 'password')
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class PatientProfileSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='user.get_full_name')
    email = serializers.ReadOnlyField(source='user.email')
    phone = serializers.ReadOnlyField(source='user.phone')

    class Meta:
        model = PatientProfile
        fields = '__all__'

class RecordatorioMedicoSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='patient.get_full_name')

    class Meta:
        model = RecordatorioMedico
        fields = '__all__'

class ProcedimientoSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='paciente.get_full_name')

    class Meta:
        model = Procedimiento
        fields = '__all__'
