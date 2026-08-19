from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# Create your views here.

def saludo_api(request):
    return JsonResponse({'mensaje':
                         'Hola mundo, esta es una prueba'})

@api_view(['POST'])
@permission_classes([AllowAny])
def chat_asistente(request):
    mensaje = request.data.get('mensaje', '').strip().lower()
    
    # Listas de palabras clave para los intents
    saludo_keywords = ['hola', 'buen día', 'buen dia', 'saludos', 'buenos días', 'buenos dias', 'buenas tardes', 'buenas noches', 'buena tarde']
    despedida_keywords = ['adiós', 'adios', 'gracias', 'hasta luego', 'chao', 'nos vemos', 'gracia', 'bye']
    enfermedad_keywords = ['dolor', 'síntomas', 'sintoma', 'cáncer', 'cancer', 'enfermedad', 'paliativo', 'malestar', 'nausea', 'vomito', 'tos', 'fatiga', 'ahogo', 'aire']
    ayuda_keywords = ['ayuda', 'cómo usar', 'como usar', '911', 'emergencia', 'soporte', 'botón', 'boton', 'citas', 'hospitales', 'funcion', 'opciones']

    if any(k in mensaje for k in saludo_keywords):
        respuesta = (
            "¡Hola! Te damos una cálida bienvenida a TUSALUDgt. "
            "Somos un portal dedicado a tu cuidado y salud paliativa. "
            "¿En qué podemos apoyarte hoy? Estoy aquí para escucharte."
        )
    elif any(k in mensaje for k in despedida_keywords):
        respuesta = (
            "Muchísimas gracias por comunicarte con nosotros. Recuerda que en TUSALUDgt estamos comprometidos "
            "con brindarte apoyo continuo en cada paso de tu camino. Que pases un día tranquilo y reconfortante. ¡Hasta pronto!"
        )
    elif any(k in mensaje for k in enfermedad_keywords):
        respuesta = (
            "Lamento mucho escuchar que te sientes así. Para el manejo del dolor y otros síntomas paliativos, "
            "es de vital importancia tomar los medicamentos prescritos en sus horarios exactos. Puedes consultar tu sección "
            "de medicamentos recetados en el Dashboard principal. Si el malestar persiste o se intensifica, "
            "por favor ponte en contacto directo con tu médico asignado para recibir orientación médica adecuada."
        )
    elif any(k in mensaje for k in ayuda_keywords):
        respuesta = (
            "Con gusto te explico cómo utilizar este portal institucional. En la sección de 'Hospitales' puedes ver "
            "un mapa interactivo en vivo con los centros de salud más cercanos y sus semáforos de disponibilidad. En la sección "
            "de 'Citas' puedes programar consultas de telemedicina o presenciales. Si tienes una emergencia urgente, "
            "puedes presionar el botón rojo de emergencia 🚨 ubicado en la esquina inferior para comunicarte de inmediato con la línea de auxilio."
        )
    else:
        respuesta = (
            "Entiendo tu consulta. Para poder brindarte una mejor orientación, por favor indícame con mayor detalle si tienes "
            "alguna duda sobre tu salud, sobre el manejo de tus medicamentos recetados, o si requieres soporte administrativo con tus citas o uso del portal."
        )

    return Response({"respuesta": respuesta})
