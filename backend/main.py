from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
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
from datetime import datetime

# Crea las tablas físicamente en la BD al arrancar
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GestorFFEOE API",
    description="API para la gestión de prácticas FCT",
    version="1.0.0"
)

# Permitir que el Frontend se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "adventurous-joy-production-20dc.up.railway.app",  
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        # Decodificamos el token usando tu SECRET_KEY
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
    # Solo permitimos el paso si el rol es 'profesor' o 'admin'
    if current_user.rol not in ["profesor", "admin"]:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permisos suficientes para realizar esta acción"
        )
    return current_user


@app.get("/")
def read_root():
    return {"message": "Bienvenido al GestorFFEOE API"}

# ========== RUTAS DE CICLOS ==========

@app.get("/ciclos/", response_model=List[schemas.CicloResponse])
def listar_ciclos(db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    return db.query(models.Ciclo).all()

@app.put("/ciclos/{ciclo_id}", response_model=schemas.CicloResponse)
def editar_ciclo(ciclo_id: int, ciclo_actualizado: schemas.CicloCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    # 1. Buscar el ciclo existente
    db_ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    
    if not db_ciclo:
        raise HTTPException(status_code=404, detail="El ciclo no existe")

    # 2. Actualizar los campos manualmente o mediante un bucle
    for key, value in ciclo_actualizado.model_dump().items():
        setattr(db_ciclo, key, value)

    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo

@app.delete("/ciclos/{ciclo_id}")
def borrar_ciclo(ciclo_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    # 1. Buscar el ciclo
    db_ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    
    if not db_ciclo:
        raise HTTPException(status_code=404, detail="El ciclo no existe")

    # 2. Eliminarlo de la base de datos
    db.delete(db_ciclo)
    db.commit()
    
    return {"message": f"Ciclo {db_ciclo.nombre} eliminado correctamente"}

@app.post("/ciclos/{ciclo_id}/asignar-profesor/{usuario_id}")
def asignar_profe_a_ciclo(ciclo_id: int, usuario_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # Solo el admin puede hacer esto[cite: 10, 16]
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo el administrador puede asignar profesores")

    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    profe = db.query(models.Usuario).filter(models.Usuario.id == usuario_id, models.Usuario.rol == "profesor").first()

    if not ciclo or not profe:
        raise HTTPException(status_code=404, detail="Ciclo o Profesor no encontrado")

    # Realizamos la unión en la tabla intermedia
    ciclo.profesores.append(profe)
    db.commit()
    return {"message": f"Profesor {profe.nombre} asignado al ciclo {ciclo.nombre}"}

# ========== RUTAS DE ASIGNACIONES ==========
@app.post("/asignaciones/")
def crear_asignacion(asignacion: schemas.AsignacionCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    # Validación de fechas
    config = db.query(models.ConfiguracionGlobal).first()
    ahora = datetime.now()

    if not config:
        raise HTTPException(status_code=400, detail="El periodo de asignación no ha sido configurado")

    if not (config.fecha_inicio <= ahora <= config.fecha_fin):
        raise HTTPException(
            status_code=400, 
            detail=f"Fuera de plazo. El periodo es del {config.fecha_inicio.date()} al {config.fecha_fin.date()}"
        )
    
    # Buscar la plaza seleccionada y el alumno
    db_plaza = db.query(models.Plaza).filter(models.Plaza.id == asignacion.plaza_id).first()
    db_alumno = db.query(models.Alumno).filter(models.Alumno.id == asignacion.alumno_id).first()

    # VALIDACIONES DE SEGURIDAD
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
    nueva_asignacion = models.Asignacion(alumno_id=asignacion.alumno_id, plaza_id=asignacion.plaza_id, tutor_laboral_id=asignacion.tutor_laboral_id)
    
    # 4. ACTUALIZACIÓN DE ESTADOS
    db_plaza.cantidad_ocupada += 1  # Sumamos la plaza ocupada
    db_alumno.estado_asignacion = "Asignado" # <--- AQUÍ actualizamos el estado del alumno 
    
    db.add(nueva_asignacion)
    db.commit()
    
    return {"message": f"Alumno {db_alumno.nombre} asignado correctamente"}

# # ========== RUTAS DE SEGUIMIENTOS ==========
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

# ========== RUTAS DE LOGIN ==========
@app.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    # 1. Buscar al usuario por email
    user = db.query(models.Usuario).filter(models.Usuario.email == user_credentials.email).first()
    
    # 2. Verificar si existe y la contraseña es correcta
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Crear el Token JWT
    access_token = create_access_token(data={"sub": user.email, "rol": user.rol})
    return {"access_token": access_token, "token_type": "bearer"}

# ========== RUTAS DE USUARIOS ==========
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

# ========== RUTAS DE ALUMNOS ==========
@app.post("/alumnos/me/cv")
def subir_cv(cv: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # Validar que sea un PDF usando la nueva variable 'cv'
    if not cv.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    db_alumno = db.query(models.Alumno).filter(models.Alumno.usuario_id == current_user.id).first()
    if not db_alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    # Guardar el archivo físicamente en el servidor
    nombre_archivo = f"cv_{current_user.id}_{cv.filename}"
    ruta_archivo = os.path.join("uploads", nombre_archivo)
    
    with open(ruta_archivo, "wb") as buffer:
        buffer.write(cv.file.read())  # <-- Cambiado a 'cv.file'
        
    # Actualizar la URL en la base de datos
    db_alumno.cv_url = f"/static/{nombre_archivo}"
    db.commit()
    
    return {"cv_url": db_alumno.cv_url, "message": "CV subido con éxito"}

@app.get("/alumnos/{alumno_id}/dashboard")
def obtener_dashboard_alumno(alumno_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # 1. Buscar al alumno en la BD
    alumno = db.query(models.Alumno).filter(models.Alumno.id == alumno_id).first()
    usuario = db.query(models.Usuario).filter(models.Usuario.id == alumno.usuario_id).first()
    
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    # 2. Lógica para montar el dashboard
    asignacion = db.query(models.Asignacion).filter(models.Asignacion.alumno_id == alumno_id).first()
    
    detalles_asignacion = None
    if asignacion:
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
            "nombre": usuario.nombre,
            "estado": alumno.estado_asignacion,
            "cv_url": alumno.cv_url
        },
        "asignacion": detalles_asignacion
    }

@app.get("/alumnos/me")
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

@app.patch("/alumnos/me/contacto")
def actualizar_mis_datos(datos: schemas.AlumnoUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # 1. Buscamos la extensión de alumno del usuario actual[cite: 3, 4]
    alumno = db.query(models.Alumno).filter(models.Alumno.usuario_id == current_user.id).first()
    
    if not alumno:
        raise HTTPException(status_code=404, detail="Perfil de alumno no encontrado")

    # 2. Actualizar email (en la tabla Usuario) si se proporciona[cite: 3, 4]
    if datos.email:
        # Verificar si el email ya existe en otro usuario para evitar errores[cite: 3, 4]
        email_exists = db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()
        if email_exists and email_exists.id != current_user.id:
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        current_user.email = datos.email

    # 3. Actualizar teléfono (en la tabla Alumno)[cite: 3, 4]
    if datos.telefono:
        alumno.telefono = datos.telefono

    db.commit()
    return {"message": "Datos de contacto actualizados correctamente"}

# ========== RUTAS DE PROFESORES ==========
@app.get("/profesores/me")
def obtener_perfil_profesor(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # 1. Verificamos que realmente sea un profesor
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permisos de profesor")
    
    # 2. Devolvemos los datos del usuario (que es el profesor)
    return current_user

@app.get("/profesores/me/alumnos")
def obtener_mis_alumnos(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # 1. Seguridad: Solo los profesores pueden ver sus alumnos
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="Acceso denegado")

    # 2. Buscamos los IDs de los ciclos que tiene asignados este profesor
    # Miramos en la tabla intermedia 'profesor_ciclo'
    ciclos_ids = [ciclo.id for ciclo in current_user.ciclos_gestionados]
    
    # 3. Traemos todos los alumnos que pertenezcan a esos ciclos
    alumnos = db.query(models.Alumno).filter(models.Alumno.ciclo_id.in_(ciclos_ids)).all()
    
    return alumnos

@app.post("/profesores/me/alumnos/importar")
async def importar_alumnos_csv(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    # 1. Obtener todos los IDs de ciclos existentes para validar rápido
    ciclos_existentes = {c.id for c in db.query(models.Ciclo.id).all()}
    reader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'), delimiter=';')
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

@app.get("/profesores/me/empresas", response_model=List[schemas.EmpresaResponse])
def obtener_mis_empresas(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # 1. Seguridad: Solo profesores
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="Acceso denegado")

    # 2. Lógica: Obtener empresas que tienen plazas para los ciclos del profesor
    ciclos_ids = [ciclo.id for ciclo in current_user.ciclos_gestionados]
    
    # Buscamos empresas haciendo un join con la tabla Plaza para filtrar por sus ciclos
    empresas = db.query(models.Empresa)\
        .join(models.Plaza)\
        .filter(models.Plaza.ciclo_id.in_(ciclos_ids))\
        .distinct()\
        .all()
    
    return empresas

@app.post("/profesores/me/empresas/importar")
async def importar_empresas_csv(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    # 1. Validar extensión
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    # 2. Leer CSV
    reader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'), delimiter=';')
    
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

# ========== RUTAS DE ADMINS ==========
@app.get("/admin/ciclos", response_model=List[schemas.CicloResponse])
def listar_ciclos_admin(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return db.query(models.Ciclo).all()

@app.post("/admin/ciclos", response_model=schemas.CicloResponse)
def crear_ciclo_admin(ciclo: schemas.CicloCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # Comprobar si ya existe un ciclo con el mismo nombre
    db_ciclo_existente = db.query(models.Ciclo).filter(models.Ciclo.nombre == ciclo.nombre).first()
    if db_ciclo_existente:
        raise HTTPException(status_code=400, detail="El ciclo ya existe")

    # Mapeo directo y limpio a las columnas de la Base de Datos
    db_ciclo = models.Ciclo(
        nombre=ciclo.nombre,
        anio_inicio=ciclo.anio_inicio,
        anio_fin=ciclo.anio_fin
    )
    db.add(db_ciclo)
    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo

@app.get("/admin/stats")
def obtener_estadisticas_admin(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    total_ciclos = db.query(models.Ciclo).count()
    total_profesores = db.query(models.Usuario).filter(models.Usuario.rol == "profesor").count()
    total_alumnos = db.query(models.Usuario).filter(models.Usuario.rol == "alumno").count()
    
    return {
        "total_ciclos": total_ciclos,
        "total_profesores": total_profesores,
        "total_alumnos": total_alumnos
    }

@app.get("/admin/profesores")
def listar_profesores(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    # Retorna los usuarios que tengan rol de profesor
    return db.query(models.Usuario).filter(models.Usuario.rol == "profesor").all()

@app.post("/admin/profesores", response_model=schemas.UsuarioResponse)
def crear_profesor_admin(profesor: schemas.UsuarioCreate,db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    # 1. Validar que quien hace la petición sea Administrador
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # 2. Comprobar si el email ya está registrado en el sistema
    email_existente = db.query(models.Usuario).filter(models.Usuario.email == profesor.email).first()
    if email_existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # 3. Crear el nuevo objeto Usuario forzando el rol de "profesor"
    nuevo_profe = models.Usuario(
        nombre=profesor.nombre,
        email=profesor.email,
        password_hash=hash_password(profesor.password), # Hasheamos la contraseña de forma segura
        rol="profesor" # Forzamos que sea profesor obligatoriamente
    )
    
    db.add(nuevo_profe)
    db.commit()
    db.refresh(nuevo_profe)
    
    return nuevo_profe

@app.get("/admin/configuracion")
def obtener_configuracion(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    config = db.query(models.ConfiguracionGlobal).first()
    if not config:
        return {"fecha_inicio": None, "fecha_fin": None, "descripcion": ""}
    return config

@app.put("/admin/configuracion")
def guardar_configuracion(config_in: schemas.ConfiguracionBase, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo el admin puede configurar periodos")
    
    db_config = db.query(models.ConfiguracionGlobal).first()
    if not db_config:
        db_config = models.ConfiguracionGlobal(**config_in.model_dump())
        db.add(db_config)
    else:
        db_config.fecha_inicio = config_in.fecha_inicio
        db_config.fecha_fin = config_in.fecha_fin
    
    db.commit()
    return {"message": "Configuración actualizada con éxito"}

# ========== RUTAS DE EMPRESAS ==========

@app.get("/empresas/{empresa_id}/tutores", response_model=List[schemas.TutorLaboralResponse])
def listar_tutores_empresa(empresa_id: int, db: Session = Depends(get_db)):
    # Esto servirá para que el frontend rellene un desplegable al asignar
    return db.query(models.TutorLaboral).filter(models.TutorLaboral.empresa_id == empresa_id).all()

# ========== RUTAS DE PLAZAS ==========
@app.post("/plazas", response_model=schemas.PlazaResponse)
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

# ========== RUTAS DE TUTORES ==========
@app.post("/tutores", response_model=schemas.TutorLaboralResponse)
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

# ========== RUTAS DE ASIGNACIONES ==========
@app.get("/tablero-asignacion")
def obtener_datos_tablero(db: Session = Depends(get_db), current_user: models.Usuario = Depends(check_profesor_role)):
    alumnos_pendientes = db.query(models.Alumno).filter(models.Alumno.estado_asignacion == "Pendiente").all()
    plazas_libres = db.query(models.Plaza).filter(models.Plaza.cantidad_ocupada < models.Plaza.cantidad_total).all()
    
    return {
        "alumnos": alumnos_pendientes,
        "plazas": plazas_libres
    }