import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from security import create_access_token
from sqlalchemy.orm import Session
import models, security
from datetime import datetime, timedelta, timezone

client = TestClient(app)

@pytest.fixture
def db_session():
    # Crea las tablas en cada test (si usas una BD de test separada)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine) # Limpia después del test

@pytest.fixture
def setup_data(db_session: Session):
    # Creamos un periodo válido (desde ayer hasta mañana) para que el test pase la validación
    config = models.ConfiguracionGlobal(
        fecha_inicio=datetime.now(timezone.utc) - timedelta(days=1),
        fecha_fin=datetime.now(timezone.utc) + timedelta(days=1)
    )
    db_session.add(config)

    # 1. Crear un Ciclo
    ciclo = models.Ciclo(nombre="DAW", anio_inicio=2024, anio_fin=2026)
    db_session.add(ciclo)
    
    # 2. Crear un Profesor
    pwd_hasheada = security.hash_password("admin123") 
    
    profe = models.Usuario(
        nombre="Profe Test",
        email="profe@test.com",
        password_hash=pwd_hasheada, # Guardamos el hash
        rol="profesor"
    )
    db_session.add(profe)
    
    # 3. Crear una Empresa y una Plaza agotada (para probar el error 400)[cite: 3, 4, 8]
    empresa = models.Empresa(nombre="Tech Solutions", email="info@tech.com")
    db_session.add(empresa)
    db_session.flush() # Para obtener IDs sin hacer commit[cite: 3]

    plaza_llena = models.Plaza(
        empresa_id=empresa.id, 
        ciclo_id=ciclo.id, 
        cantidad_total=1, 
        cantidad_ocupada=1 # Ya está llena[cite: 3, 4]
    )
    db_session.add(plaza_llena)
    
    # 4. Crear un Alumno[cite: 3, 4]
    user_alumno = models.Usuario(
        nombre="Pepe Alumno", 
        email="pepe@test.com", 
        password_hash="...", 
        rol="alumno"
    )
    db_session.add(user_alumno)
    db_session.flush()
    
    alumno = models.Alumno(usuario_id=user_alumno.id, ciclo_id=ciclo.id, estado_asignacion="Pendiente")
    db_session.add(alumno)
    
    db_session.commit()
    return {"alumno_id": alumno.id, "plaza_id": plaza_llena.id}

def test_asignar_alumno_sin_plazas_libres(setup_data):
    """Prueba que no se puede asignar si la plaza está llena[cite: 8]"""
    token = security.create_access_token(data={"sub": "profe@test.com", "rol": "profesor"})
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "alumno_id": setup_data["alumno_id"], 
        "plaza_id": setup_data["plaza_id"], 
        "tutor_laboral_id": None
    }
    
    response = client.post("/asignaciones/", json=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "No quedan plazas libres en esta empresa para este ciclo"

# Test de seguridad: acceso sin token
def test_crear_ciclo_sin_autorizacion():
    """Prueba que sin token devuelve 401[cite: 3, 8]"""
    response = client.post("/ciclos/", json={"nombre": "ASIR", "anio_inicio": 2024, "anio_fin": 2026})
    assert response.status_code == 401

def test_importar_alumnos_como_alumno_falla(db_session): # Añade la sesión aquí
    # 1. Primero crea un usuario con rol 'alumno' en la BD de pruebas
    user = models.Usuario(
        nombre="Test Alumno",
        email="alumno@test.com",
        password_hash=security.hash_password("123456"),
        rol="alumno"
    )
    db_session.add(user)
    db_session.commit()

    # 2. Ahora genera el token
    token = create_access_token(data={"sub": "alumno@test.com", "rol": "alumno"})
    headers = {"Authorization": f"Bearer {token}"}
    
    files = {'file': ('alumnos.csv', 'nombre,email,ciclo_id\nPepe,pepe@mail.com,1', 'text/csv')}
    response = client.post("/alumnos/importar/", headers=headers, files=files)
    
    assert response.status_code == 403

def test_importar_alumnos_sin_token_falla():
    """
    Prueba que si no envías token, devuelve 401 (No autorizado).[cite: 7, 8]
    """
    response = client.post("/alumnos/importar/")
    assert response.status_code == 401

def test_alumno_no_puede_crear_ciclo(db_session):
    # 1. CREAR EL USUARIO EN LA BD DE TEST
    usuario_alumno = models.Usuario(
        nombre="Alumno de Prueba",
        email="alumno@test.com",
        password_hash="...", # No importa el hash aquí para este test
        rol="alumno"
    )
    db_session.add(usuario_alumno)
    db_session.commit()

    # 2. Generar el token para ese email que ya existe
    token = create_access_token(data={"sub": "alumno@test.com", "rol": "alumno"})
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {"nombre": "Nuevo Ciclo", "anio_inicio": 2025, "anio_fin": 2027}
    response = client.post("/ciclos/", json=payload, headers=headers)
    
    # 3. El sistema te reconoce (pasa el 401) pero te deniega por rol (da 403)
    assert response.status_code == 403