from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import SessionLocal, engine
from security import verify_password, create_access_token, hash_password
import csv
import codecs
import os
from jose import JWTError, jwt
import security

# Crea las tablas físicamente en la BD al arrancar
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GestorFFEOE API",
    description="API para la gestión de prácticas FCT",
    version="1.0.0"
)

# Crear la carpeta de archivos si no existe
if not os.path.exists("uploads"):
    os.makedirs("uploads")

# Montar la carpeta para que los archivos sean accesibles vía URL
app.mount("/static", StaticFiles(directory="uploads"), name="static")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Dependencia para obtener la sesión de la BD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="No se pudo validar el usuario",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodificamos el token usando tu SECRET_KEY[cite: 6]
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def check_profesor_role(current_user: models.Usuario = Depends(get_current_user)):
    # Solo permitimos el paso si el rol es 'profesor' o 'admin'[cite: 3]
    if current_user.rol not in ["profesor", "admin"]:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permisos suficientes para realizar esta acción"
        )
    return current_user

@app.get("/")
def read_root():
    return {"message": "Bienvenido al GestorFFEOE API"}

# --- RUTAS DE CICLOS ---
@app.post("/ciclos/", response_model=schemas.CicloResponse)
def crear_ciclo(ciclo: schemas.CicloCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    db_ciclo = models.Ciclo(**ciclo.model_dump())
    db.add(db_ciclo)
    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo

@app.get("/ciclos/", response_model=List[schemas.CicloResponse])
def listar_ciclos(db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    return db.query(models.Ciclo).all()

@app.post("/asignaciones/")
def crear_asignacion(asignacion: schemas.AsignacionCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
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
def registrar_seguimiento(seguimiento: schemas.SeguimientoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
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

@app.post("/token")
def login(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Email o contraseña incorrectos")
    
    access_token = create_access_token(data={"sub": user.email, "rol": user.rol})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/usuarios/")
def crear_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    hashed_pwd = hash_password(usuario.password)
    db_usuario = models.Usuario(
        nombre=usuario.nombre,
        email=usuario.email,
        rol=usuario.rol,
        password_hash=hashed_pwd
    )
    db.add(db_usuario)
    db.commit()
    return {"message": "Usuario creado con éxito"}

@app.post("/alumnos/importar/")
async def importar_alumnos_csv(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    # 1. Obtener todos los IDs de ciclos existentes para validar rápido
    ciclos_existentes = {c.id for c in db.query(models.Ciclo.id).all()}
    reader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
    alumnos_creados = 0
    errores = []

    for i, row in enumerate(reader):
        temp_password = hash_password("Cambiame123")
        try:
            # Dentro del bucle de importación:
            c_id = int(row['ciclo_id'])

            # VALIDACIÓN: Si el ciclo no existe, saltamos la fila y avisamos
            if c_id not in ciclos_existentes:
                errores.append(f"Fila {i+1}: El ciclo ID {c_id} no existe.")
                continue

            # Creación del usuario
            nuevo_usuario = models.Usuario(
                nombre=row['nombre'],
                email=row['email'],
                password_hash=temp_password,
                rol="alumno"
            )
            db.add(nuevo_usuario)
            db.flush() # Esto asigna el ID a nuevo_usuario sin cerrar la transacción

            # Creación del alumno
            nuevo_alumno = models.Alumno(
                usuario_id=nuevo_usuario.id, # Vinculación correcta
                ciclo_id=c_id
            )
            db.add(nuevo_alumno)
            alumnos_creados += 1

        except Exception as e:
            errores.append(f"Fila {i+1}: Error inesperado - {str(e)}")

    db.commit()
    
    return {
        "message": f"Importación finalizada. {alumnos_creados} alumnos creados.",
        "errores": errores # Esto ayuda al profesor a saber qué filas fallaron
    }

@app.post("/empresas/importar/")
async def importar_empresas_csv(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    # 1. Validar extensión
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    # 2. Leer CSV
    reader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
    
    empresas_creadas = 0
    for row in reader:
        # 3. Crear instancia del modelo Empresa
        nueva_empresa = models.Empresa(
            nombre=row['nombre'],
            direccion=row.get('direccion'),
            web=row.get('web'),
            persona_contacto=row.get('persona_contacto'),
            email=row.get('email'),
            telefono=row.get('telefono'),
            responsable_legal_dni=row.get('responsable_legal_dni')
        )
        db.add(nueva_empresa)
        empresas_creadas += 1
    
    db.commit()
    return {"message": f"Se han importado {empresas_creadas} empresas correctamente"}

@app.post("/plazas/", response_model=schemas.PlazaResponse)
def crear_o_actualizar_plaza(plaza: schemas.PlazaCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    # 1. Verificar si ya existe una configuración de plazas para esa empresa y ciclo
    db_plaza = db.query(models.Plaza).filter(
        models.Plaza.empresa_id == plaza.empresa_id,
        models.Plaza.ciclo_id == plaza.ciclo_id
    ).first()

    if db_plaza:
        # Si existe, actualizamos el total
        db_plaza.cantidad_total = plaza.cantidad_total
    else:
        # Si no existe, creamos el registro
        db_plaza = models.Plaza(**plaza.model_dump())
        db.add(db_plaza)
    
    db.commit()
    db.refresh(db_plaza)
    return db_plaza

@app.get("/plazas/disponibles", response_model=List[schemas.PlazaResponse])
def listar_plazas_disponibles(db: Session = Depends(get_db)):
    # Filtramos las plazas donde la cantidad ocupada es menor a la total[cite: 3]
    return db.query(models.Plaza).filter(models.Plaza.cantidad_ocupada < models.Plaza.cantidad_total).all()

# --- RUTAS DE TUTORES LABORALES ---

@app.post("/tutores/", response_model=schemas.TutorLaboralResponse)
def crear_tutor(tutor: schemas.TutorLaboralCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    # Verificamos que la empresa existe antes de asignarle un tutor
    empresa = db.query(models.Empresa).filter(models.Empresa.id == tutor.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="La empresa no existe")
    
    nuevo_tutor = models.TutorLaboral(**tutor.model_dump())
    db.add(nuevo_tutor)
    db.commit()
    db.refresh(nuevo_tutor)
    return nuevo_tutor

@app.get("/empresas/{empresa_id}/tutores", response_model=List[schemas.TutorLaboralResponse])
def listar_tutores_empresa(empresa_id: int, db: Session = Depends(get_db)):
    # Esto servirá para que el frontend rellene un desplegable al asignar
    return db.query(models.TutorLaboral).filter(models.TutorLaboral.empresa_id == empresa_id).all()

@app.post("/alumnos/{alumno_id}/upload-cv/")
async def subir_cv(alumno_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Validar que sea un PDF
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    # 2. Buscar al alumno en la BD
    db_alumno = db.query(models.Alumno).filter(models.Alumno.id == alumno_id).first()
    if not db_alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    # 3. Guardar el archivo físicamente
    file_path = f"uploads/cv_{alumno_id}.pdf"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    # 4. Guardar la URL en la base de datos[cite: 3]
    db_alumno.cv_url = f"/static/cv_{alumno_id}.pdf"
    db.commit()

    return {"message": "CV subido con éxito", "url": db_alumno.cv_url}

@app.get("/alumnos/{alumno_id}/dashboard")
def obtener_dashboard_alumno(alumno_id: int, db: Session = Depends(get_db)):
    # Buscamos al alumno y unimos con su ciclo, asignación, plaza y empresa[cite: 3]
    alumno = db.query(models.Alumno).filter(models.Alumno.id == alumno_id).first()
    
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    # Intentamos obtener la asignación si existe[cite: 3]
    asignacion = db.query(models.Asignacion).filter(models.Asignacion.alumno_id == alumno_id).first()
    
    detalles_asignacion = None
    if asignacion:
        # Si está asignado, sacamos los nombres de la empresa y el tutor
        plaza = db.query(models.Plaza).filter(models.Plaza.id == asignacion.plaza_id).first()
        empresa = db.query(models.Empresa).filter(models.Empresa.id == plaza.empresa_id).first()
        tutor = db.query(models.TutorLaboral).filter(models.TutorLaboral.id == asignacion.tutor_laboral_id).first()
        
        detalles_asignacion = {
            "empresa": empresa.nombre,
            "direccion": empresa.direccion,
            "tutor_laboral": tutor.nombre if tutor else "No asignado aún",
            "fecha_inicio": asignacion.fecha_asignacion
        }

    return {
        "perfil": {
            "nombre": alumno.nombre,
            "email": alumno.email,
            "estado": alumno.estado_asignacion, # 'Pendiente' o 'Asignado'[cite: 3]
            "cv_url": alumno.cv_url
        },
        "asignacion": detalles_asignacion
    }

@app.get("/alumnos/me/dashboard")
def obtener_mi_dashboard(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # 1. Verificamos que el usuario logueado realmente tenga rol de alumno
    if current_user.rol != "alumno":
        raise HTTPException(status_code=403, detail="Acceso denegado: No eres un alumno")

    # 2. Buscamos la extensión de datos de ese alumno
    alumno = db.query(models.Alumno).filter(models.Alumno.usuario_id == current_user.id).first()
    
    if not alumno:
        raise HTTPException(status_code=404, detail="Datos de alumno no encontrados para este usuario")

    # 3. Llamamos a la lógica que ya tenías para montar el dashboard
    # Pasamos el ID del ALUMNO (de su tabla específica), no del usuario base
    return obtener_dashboard_alumno(alumno.id, db)