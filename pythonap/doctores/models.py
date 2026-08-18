from django.db import models
from users.models import User

class DoctorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name = 'doctor_profile')
    licencia = models.CharField(max_length=13, blank = False, null = False, unique = True, verbose_name = 'licencia')
    especialidad = models.CharField(max_length=13, blank = False, null = False, unique = True, verbose_name = 'especialidad')

    dpi = models.CharField(max_length=13, blank = False, null = False, unique = True, verbose_name = 'documento personal')
    birth_date = models.DateField()
    emergency_name = models.CharField(max_length=20, blank = False, null = False, unique = True, verbose_name = 'nombre de emergencia')
    emergency_contact = models.CharField(max_length = 8, blank = False, null = False, verbose_name = 'contacto de emergencia')
    def __str__(self):
        return f' Doctor: {self.user.get_full_name()}  {self.especialidad}'
