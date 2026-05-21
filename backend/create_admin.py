from database import SessionLocal # Ajusta según tus nombres de archivos
from security import hash_password # Tu función de encriptar contraseñas
import models

db = SessionLocal()

# Modificación en create_admin.py (quita los "id = X")
admin = models.Usuario(nombre="Admin", email="admin@instituto.es", password_hash=hash_password("admin123"), rol="admin")
profe = models.Usuario(nombre="Profe", email="profe@instituto.es", password_hash=hash_password("profe123"), rol="profesor")
usuario = models.Usuario(nombre="Alumno", email="alumno@instituto.es", password_hash=hash_password("alumno123"), rol="alumno")

db.add(admin)
db.add(profe)
db.add(usuario)
db.commit()

ciclo = models.Ciclo(nombre="DAM", anio_inicio=2025, anio_fin=2027)
db.add(ciclo)
db.commit()

alumno = models.Alumno(usuario_id=usuario.id, ciclo_id=ciclo.id)
db.add(alumno)
db.commit()