import json
from rest_framework import serializers
from .models import RecetaMedica, RegistroESAS

class RecetaMedicaSerializer(serializers.ModelSerializer):
    paciente_name = serializers.ReadOnlyField(source='paciente.get_full_name')
    doctor_name = serializers.ReadOnlyField(source='doctor.get_full_name')
    cita_info = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RecetaMedica
        fields = '__all__'

    def get_cita_info(self, obj):
        if obj.cita:
            return f"Cita #{obj.cita.id} el {obj.cita.cita_fecha.strftime('%Y-%m-%d %H:%M')}"
        return None

    def to_internal_value(self, data):
        # Convertir a dict normal para evitar problemas de QueryDict con JSONField
        if hasattr(data, 'dict'):
            # dict() de QueryDict obtiene el último elemento por key
            data_dict = data.dict()
        else:
            data_dict = data.copy() if hasattr(data, 'copy') else data
            
        # Extraer archivo_pdf si está en data (ya que dict() lo podría haber sacado mal si es MultiValueDict)
        # En realidad dict() en QueryDict preserva los archivos si se usa bien, pero es más seguro:
        if hasattr(data, 'getlist'):
            for key in data.keys():
                lst = data.getlist(key)
                if len(lst) > 1:
                    data_dict[key] = lst
                    
        # Parse medicamentos_json if it comes as a string (from FormData)
        med_json = data_dict.get('medicamentos_json')
        if isinstance(med_json, str):
            try:
                data_dict['medicamentos_json'] = json.loads(med_json)
            except json.JSONDecodeError:
                pass
                
        # Handle stringified booleans
        req_control = data_dict.get('requiere_control_especial')
        if isinstance(req_control, str):
            data_dict['requiere_control_especial'] = req_control.lower() in ['true', '1', 't', 'y', 'yes']
            
        return super().to_internal_value(data_dict)

    def validate_medicamentos_json(self, value):
        """Valida que cada medicamento tenga campos numéricos válidos."""
        if not isinstance(value, list):
            raise serializers.ValidationError("medicamentos_json debe ser una lista de objetos.")
        
        for i, med in enumerate(value):
            if not isinstance(med, dict):
                raise serializers.ValidationError(f"El elemento {i} debe ser un objeto JSON.")
            
            nombre = med.get('nombre_medicamento', '')
            if not nombre or not str(nombre).strip():
                raise serializers.ValidationError(f"El medicamento en posición {i} requiere un nombre válido.")
            
            # Validar dosificacion como número positivo
            dosis = med.get('dosificacion', '')
            try:
                dosis_num = float(dosis)
                if dosis_num <= 0:
                    raise serializers.ValidationError(
                        f"La dosificación del medicamento '{nombre}' debe ser un número positivo (recibido: {dosis})."
                    )
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    f"La dosificación del medicamento '{nombre}' debe ser un valor numérico (recibido: '{dosis}')."
                )
            
            # Validar frecuencia_horas como entero positivo
            frecuencia = med.get('frecuencia_horas')
            try:
                freq_num = int(frecuencia)
                if freq_num <= 0:
                    raise serializers.ValidationError(
                        f"La frecuencia del medicamento '{nombre}' debe ser un entero positivo (recibido: {frecuencia})."
                    )
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    f"La frecuencia del medicamento '{nombre}' debe ser un número entero (recibido: '{frecuencia}')."
                )
            
            # Validar duracion_dias como entero positivo
            duracion = med.get('duracion_dias')
            try:
                dur_num = int(duracion)
                if dur_num <= 0:
                    raise serializers.ValidationError(
                        f"La duración del medicamento '{nombre}' debe ser un entero positivo (recibido: {duracion})."
                    )
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    f"La duración del medicamento '{nombre}' debe ser un número entero (recibido: '{duracion}')."
                )
        
        return value

class RegistroESASSerializer(serializers.ModelSerializer):
    """Serializer para el modelo RegistroESAS con validación de rango 0-10."""
    
    SYMPTOM_FIELDS = ['dolor', 'cansancio', 'nausea', 'depresion', 'ansiedad', 'somnolencia', 'apetito', 'respiracion']
    
    class Meta:
        model = RegistroESAS
        fields = '__all__'
        read_only_fields = ['paciente', 'fecha']

    def validate(self, data):
        """Valida que todos los campos de síntomas estén en el rango 0-10."""
        for field in self.SYMPTOM_FIELDS:
            if field in data:
                value = data[field]
                if not isinstance(value, int) or value < 0 or value > 10:
                    raise serializers.ValidationError({
                        field: f"El valor de {field} debe ser un entero entre 0 y 10 (recibido: {value})."
                    })
        return data
