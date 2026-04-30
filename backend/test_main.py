import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal

client = TestClient(app)

# Test para validar la restricción de plazas libres[cite: 1, 3]
def test_asignar_alumno_sin_plazas():
    # 1. Intentamos asignar a una plaza que sabemos que está llena
    # (Asumiendo que previamente creamos una plaza con cantidad_total=1 y cantidad_ocupada=1)
    payload = {
        "alumno_id": 1,
        "plaza_id": 99, # ID de una plaza llena
        "tutor_laboral_id": 1
    }
    response = client.post("/asignaciones/", json=payload)
    
    # Verificamos que el error sea 400 y el mensaje correcto
    assert response.status_code == 400
    assert response.json()["detail"] == "No quedan plazas libres en esta empresa para este ciclo"

# Test de seguridad: acceso sin token
def test_crear_ciclo_sin_autorizacion():
    response = client.post("/ciclos/", json={"nombre": "ASIR", "anio_inicio": 2024, "anio_fin": 2026})
    # Si implementas la protección, debería devolver 401[cite: 3]
    assert response.status_code == 401

client = TestClient(app)

def test_importar_alumnos_como_alumno_falla():
    """
    Prueba que un usuario con rol de 'alumno' recibe un 403 (Prohibido)
    al intentar acceder a una ruta de profesor.
    """
    # Simulamos un token de alumno (en un test real deberías generar un JWT válido)
    # Aquí probamos el endpoint directamente
    headers = {"Authorization": "Bearer TOKEN_DE_ALUMNO_AQUI"}
    
    # Intentamos subir un CSV ficticio
    files = {'file': ('alumnos.csv', 'nombre,email,ciclo_id\nPepe,pepe@mail.com,1', 'text/csv')}
    
    response = client.post("/alumnos/importar/", headers=headers, files=files)
    
    # Debe devolver 403 porque el rol no es suficiente[cite: 2]
    assert response.status_code == 403
    assert response.json()["detail"] == "No tienes permisos suficientes para realizar esta acción"

def test_importar_alumnos_sin_token_falla():
    """
    Prueba que si no envías token, devuelve 401 (No autorizado).[cite: 7, 8]
    """
    response = client.post("/alumnos/importar/")
    assert response.status_code == 401

def test_asignar_alumno_sin_plazas_libres():
    """
    Verifica que no se permite la asignación si cantidad_ocupada >= cantidad_total.[cite: 2, 8]
    """
    # Simulamos los datos de una asignación
    payload = {
        "alumno_id": 1,
        "plaza_id": 10, # Imaginemos que la plaza 10 está llena
        "tutor_laboral_id": 1
    }
    
    # En el test, podrías mockear la base de datos para que devuelva una plaza llena
    response = client.post("/asignaciones/", json=payload)
    
    # Verificamos el error 400 y el mensaje exacto que pusimos en main.py[cite: 2]
    assert response.status_code == 400
    assert "No quedan plazas libres" in response.json()["detail"]