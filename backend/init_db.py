from database import SessionLocal
from security import hash_password
import models

db = SessionLocal()

# Comprobar si ya existe el admin
existe = db.query(models.Usuario).filter(models.Usuario.email == "admin@instituto.es").first()

if not existe:
    usuarios = [
        models.Usuario(nombre="Admin", email="admin@instituto.es", password_hash=hash_password("admin123"), rol="admin"),
        models.Usuario(nombre="Profesor", email="profe@instituto.es", password_hash=hash_password("profe123"), rol="profesor"),
        models.Usuario(nombre="Alumno", email="alumno@instituto.es", password_hash=hash_password("alumno123"), rol="alumno"),
    ]
    for u in usuarios:
        db.add(u)
    db.commit()
    print("Usuarios creados correctamente")
else:
    print("Los usuarios ya existen")

db.close()