from database import SessionLocal # Ajusta según tus nombres de archivos
from security import hash_password # Tu función de encriptar contraseñas
import models

db = SessionLocal()
admin_user = models.Usuario(
    nombre="Admin General",
    email="admin@instituto.es",
    password_hash=hash_password("admin123"), # Usa tu función de hash
    rol="Administrador" # Asegúrate de que coincida con tus roles
)
db.add(admin_user)
db.commit()
print("¡Administrador creado con éxito!")