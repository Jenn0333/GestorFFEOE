from database import SessionLocal # Ajusta según tus nombres de archivos
from security import hash_password # Tu función de encriptar contraseñas
import models

db = SessionLocal()
admin = models.Usuario(
    id = 1,
    nombre="Admin",
    email="admin@instituto.es",
    password_hash=hash_password("admin123"),
    rol="admin"
)
profe = models.Usuario(
    id = 2,
    nombre="Profe",
    email="profe@instituto.es",
    password_hash=hash_password("profe123"),
    rol="profesor"
)
usuario = models.Usuario(
    id = 3,
    nombre="Alumno",
    email="alumno@instituto.es",
    password_hash=hash_password("alumno123"),
    rol="alumno"
)
ciclo = models.Ciclo(
    id = 1,
    nombre = "DAM",
    anio_inicio = 2025,
    anio_fin = 2027
)
alumno = models.Alumno(
    id = 1,
    usuario_id = 3,
    ciclo_id = 1
)
db.add(admin)
db.add(profe)
db.add(usuario)
db.add(ciclo)
db.add(alumno)
db.commit()
print("¡Usuarios creados con éxito!")