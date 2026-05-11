from database import SessionLocal # Ajusta según tus nombres de archivos
from security import hash_password # Tu función de encriptar contraseñas
import models

db = SessionLocal()
admin = models.Usuario(
    nombre="Admin",
    email="admin@instituto.es",
    password_hash=hash_password("admin123"), # Usa tu función de hash
    rol="Administrador" # Asegúrate de que coincida con tus roles
)
profe = models.Usuario(
    nombre="Profe",
    email="profe@instituto.es",
    password_hash=hash_password("profe123"), # Usa tu función de hash
    rol="Profesor" # Asegúrate de que coincida con tus roles
)
alumno = models.Usuario(
    nombre="Alumno",
    email="alumno@instituto.es",
    password_hash=hash_password("alumno123"), # Usa tu función de hash
    rol="Alumno" # Asegúrate de que coincida con tus roles
)
db.add(admin)
db.add(profe)
db.add(alumno)
db.commit()
print("¡Usuarios creados con éxito!")