from pydantic import BaseModel, EmailStr, HttpUrl, Field
from typing import Optional, List
from datetime import datetime

# ========== ESQUEMAS DE CICLOS ==========
class CicloBase(BaseModel):
    nombre: str
    anio_inicio: int
    anio_fin: int

class CicloCreate(CicloBase):
    pass

class CicloResponse(CicloBase):
    id: int
    model_config = {"from_attributes": True}

# ========== ESQUEMAS DE USUARIOS ==========
class UsuarioCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str = "hola123"
    rol: str = "alumno"  # Por defecto alumno, pero el profe puede cambiarlo

    model_config = {"from_attributes": True}

class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: EmailStr
    rol: str

    model_config = {"from_attributes": True}

# ========== ESQUEMAS DE ALUMNOS ==========
class AlumnoBase(BaseModel):
    ciclo_id: int
    cv_url: Optional[str] = None

class AlumnoCreate(AlumnoBase):
    # Al crear un alumno desde el endpoint de profesor, 
    # necesitamos los datos para crear su Usuario base también.
    nombre: str
    email: EmailStr

class AlumnoResponse(BaseModel):
    id: int
    usuario_id: int
    ciclo_id: int
    estado_asignacion: str
    cv_url: Optional[str] = None
    
    model_config = {"from_attributes": True}

class AlumnoUpdate(BaseModel):
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None

# ========== ESQUEMAS DE TUTORES LABORALES ==========
class TutorLaboralBase(BaseModel):
    nombre: str
    dni: str
    telefono: Optional[str] = None

class TutorLaboralCreate(TutorLaboralBase):
    empresa_id: int

class TutorLaboralResponse(TutorLaboralBase):
    id: int
    model_config = {"from_attributes": True}

# ========== ESQUEMAS DE EMPRESAS ==========
class EmpresaBase(BaseModel):
    nombre: str
    direccion: Optional[str] = None
    web: Optional[str] = None
    persona_contacto: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    responsable_legal_dni: Optional[str] = None

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaResponse(EmpresaBase):
    id: int
    # Incluimos los tutores relacionados si existen 
    tutores: List[TutorLaboralResponse] = []
    model_config = {"from_attributes": True}

# ========== ESQUEMAS DE PLAZAS ==========
class PlazaBase(BaseModel):
    empresa_id: int
    ciclo_id: int
    cantidad_total: int = Field(..., ge=0, description="No puede haber plazas negativas")

class PlazaCreate(PlazaBase):
    pass

class PlazaResponse(PlazaBase):
    id: int
    cantidad_ocupada: int
    plazas_disponibles: int
    model_config = {"from_attributes": True}

# ========== ESQUEMAS DE ASIGNACIÓN ==========
class AsignacionBase(BaseModel):
    alumno_id: int
    plaza_id: int
    tutor_laboral_id: Optional[int] = None

class AsignacionCreate(AsignacionBase):
    pass

class AsignacionResponse(AsignacionBase):
    id: int
    fecha_asignacion: datetime
    model_config = {"from_attributes": True}

# ========== ESQUEMAS DE SEGUIMIENTO ==========
class SeguimientoBase(BaseModel):
    empresa_id: int
    profesor_id: int
    fecha_hora: datetime
    comentarios: Optional[str] = None

class SeguimientoCreate(SeguimientoBase):
    pass

class SeguimientoResponse(SeguimientoBase):
    id: int
    model_config = {"from_attributes": True}

# ========== ESQUEMAS DE INICIAR SESIÓN ==========
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ========== ESQUEMAS DE TOKENS ==========
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    rol: Optional[str] = None

# ========== ESQUEMAS DE CONFIGURACIÓN ==========
class ConfiguracionBase(BaseModel):
    fecha_inicio: datetime
    fecha_fin: datetime

class ConfiguracionResponse(ConfiguracionBase):
    id: int
    model_config = {"from_attributes": True}