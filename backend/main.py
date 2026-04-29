from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import SessionLocal, engine

# Crea las tablas físicamente en la BD al arrancar
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GestorFFEOE API",
    description="API para la gestión de prácticas FCT",
    version="1.0.0"
)

# Dependencia para obtener la sesión de la BD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Bienvenido al GestorFFEOE API"}

# --- RUTAS DE CICLOS ---
@app.post("/ciclos/", response_model=schemas.CicloResponse)
def crear_ciclo(ciclo: schemas.CicloCreate, db: Session = Depends(get_db)):
    db_ciclo = models.Ciclo(**ciclo.model_dump())
    db.add(db_ciclo)
    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo

@app.get("/ciclos/", response_model=List[schemas.CicloResponse])
def listar_ciclos(db: Session = Depends(get_db)):
    return db.query(models.Ciclo).all()

@app.post("/asignaciones/")
def crear_asignacion(asignacion: schemas.AsignacionCreate, db: Session = Depends(get_db)):
    # 1. Buscar la plaza seleccionada y el alumno
    db_plaza = db.query(models.Plaza).filter(models.Plaza.id == asignacion.plaza_id).first()
    db_alumno = db.query(models.Alumno).filter(models.Alumno.id == asignacion.alumno_id).first()

    # 2. VALIDACIONES DE SEGURIDAD
    if not db_plaza:
        raise HTTPException(status_code=404, detail="La plaza especificada no existe")
    
    if not db_alumno:
        raise HTTPException(status_code=404, detail="El alumno especificado no existe")

    # Verificar si el alumno ya tiene una asignación (evitar duplicados)
    if db_alumno.estado_asignacion == "Asignado":
        raise HTTPException(status_code=400, detail="Este alumno ya tiene una empresa asignada")

    # VALIDACIÓN: ¿Hay sitio en la empresa? [cite: 14, 40]
    if db_plaza.cantidad_ocupada >= db_plaza.cantidad_total:
        raise HTTPException(status_code=400, detail="No quedan plazas libres en esta empresa para este ciclo")

    # 3. PROCESO DE ASIGNACIÓN
    nueva_asignacion = models.Asignacion(**asignacion.model_dump())
    
    # 4. ACTUALIZACIÓN DE ESTADOS
    db_plaza.cantidad_ocupada += 1  # Sumamos la plaza ocupada
    db_alumno.estado_asignacion = "Asignado" # <--- AQUÍ actualizamos el estado del alumno 
    
    db.add(nueva_asignacion)
    db.commit()
    
    return {"message": f"Alumno {db_alumno.nombre} asignado correctamente"}

# --- RUTAS DE SEGUIMIENTO ---
@app.post("/seguimientos/", response_model=schemas.SeguimientoResponse)
def registrar_seguimiento(seguimiento: schemas.SeguimientoCreate, db: Session = Depends(get_db)):
    # 1. Verificar que el profesor (usuario) existe y es realmente un profesor
    profe = db.query(models.Usuario).filter(models.Usuario.id == seguimiento.profesor_id).first()
    if not profe:
        raise HTTPException(status_code=404, detail="El profesor especificado no existe")
    
    # 2. Verificar que la empresa existe
    empresa = db.query(models.Empresa).filter(models.Empresa.id == seguimiento.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="La empresa especificada no existe")

    # 3. Crear el registro de contacto 
    nuevo_seguimiento = models.SeguimientoContacto(**seguimiento.model_dump())
    
    db.add(nuevo_seguimiento)
    db.commit()
    db.refresh(nuevo_seguimiento)
    
    return nuevo_seguimiento