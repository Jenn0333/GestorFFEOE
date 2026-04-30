from pydantic import BaseModel, EmailStr, HttpUrl, Field
from typing import Optional, List
from datetime import datetime

# Esquema para Ciclos
class CicloBase(BaseModel):
    nombre: str
    anio_inicio: int
    anio_fin: int

class CicloCreate(CicloBase):
    pass

class CicloResponse(CicloBase):
    id: int
    class Config:
        from_attributes = True

# Esquema para Alumnos
class AlumnoBase(BaseModel):
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None
    ciclo_id: int

class AlumnoCreate(AlumnoBase):
    pass

class AlumnoResponse(AlumnoBase):
    id: int
    estado_asignacion: str
    class Config:
        from_attributes = True

# --- ESQUEMAS DE TUTOR LABORAL ---
class TutorLaboralBase(BaseModel):
    nombre: str
    dni: str
    telefono: Optional[str] = None

class TutorLaboralCreate(TutorLaboralBase):
    empresa_id: int

class TutorLaboralResponse(TutorLaboralBase):
    id: int
    class Config:
        from_attributes = True

# --- ESQUEMAS DE EMPRESA ---
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
    class Config:
        from_attributes = True

# --- ESQUEMAS DE PLAZAS ---
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
    class Config:
        from_attributes = True

# --- ESQUEMAS DE ASIGNACIÓN (Drag & Drop) ---
class AsignacionBase(BaseModel):
    alumno_id: int
    plaza_id: int
    tutor_laboral_id: Optional[int] = None

class AsignacionCreate(AsignacionBase):
    pass

class AsignacionResponse(AsignacionBase):
    id: int
    fecha_asignacion: datetime
    class Config:
        from_attributes = True

# --- ESQUEMAS DE SEGUIMIENTO ---
class SeguimientoBase(BaseModel):
    empresa_id: int
    profesor_id: int
    fecha_hora: datetime
    comentarios: Optional[str] = None

class SeguimientoCreate(SeguimientoBase):
    pass

class SeguimientoResponse(SeguimientoBase):
    id: int
    class Config:
        from_attributes = True

# Esquema para recibir datos de inicio de sesión
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Esquema para la respuesta que contiene el Token JWT
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    rol: Optional[str] = None