from sqlalchemy import Column, Integer, String, ForeignKey, Text, TIMESTAMP, CheckConstraint
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Ciclo(Base):
    __tablename__ = "ciclo"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    anio_inicio = Column(Integer, nullable=False)
    anio_fin = Column(Integer, nullable=False)

class Usuario(Base):
    __tablename__ = "usuario"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20)) # Ahora aceptará: 'admin', 'profesor' o 'alumno'
    # Relación opcional: solo si es alumno tendrá datos de alumno
    datos_alumno = relationship("Alumno", back_populates="usuario_base", uselist=False)

class Empresa(Base):
    __tablename__ = "empresa"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    direccion = Column(Text)
    web = Column(String(255))
    persona_contacto = Column(String(100))
    email = Column(String(150))
    telefono = Column(String(20))
    responsable_legal_dni = Column(String(20))
    tutores = relationship("TutorLaboral", back_populates="empresa")

class Alumno(Base):
    __tablename__ = "alumno"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), unique=True)
    cv_url = Column(String(255))
    ciclo_id = Column(Integer, ForeignKey("ciclo.id"))
    estado_asignacion = Column(String(20), default="Pendiente")
    usuario_base = relationship("Usuario", back_populates="datos_alumno")
    asignacion = relationship("Asignacion", back_populates="alumno", uselist=False)

class TutorLaboral(Base):
    __tablename__ = "tutor_laboral"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    dni = Column(String(20), nullable=False)
    telefono = Column(String(20))
    empresa_id = Column(Integer, ForeignKey("empresa.id"))
    
    # Relación: Una empresa tiene muchos tutores 
    empresa = relationship("Empresa", back_populates="tutores")

class Plaza(Base):
    __tablename__ = "plaza"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresa.id", ondelete="CASCADE"))
    ciclo_id = Column(Integer, ForeignKey("ciclo.id", ondelete="CASCADE"))
    cantidad_total = Column(Integer, nullable=False, default=0)
    cantidad_ocupada = Column(Integer, default=0)
    @property
    def plazas_disponibles(self):
        return self.cantidad_total - self.cantidad_ocupada
    
    # Restricción: No puede haber plazas negativas [cite: 14]
    __table_args__ = (CheckConstraint('cantidad_total >= 0', name='check_total_positivo'),)

class Asignacion(Base):
    __tablename__ = "asignacion"
    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("alumno.id", ondelete="CASCADE"), unique=True)
    plaza_id = Column(Integer, ForeignKey("plaza.id", ondelete="CASCADE"))
    tutor_laboral_id = Column(Integer, ForeignKey("tutor_laboral.id")) # Mejor que solo un String 
    fecha_asignacion = Column(TIMESTAMP, default=datetime.datetime.now)

class SeguimientoContacto(Base):
    __tablename__ = "seguimiento_contactos"
    id = Column(Integer, primary_key=True, index=True)
    profesor_id = Column(Integer, ForeignKey("usuario.id"))
    empresa_id = Column(Integer, ForeignKey("empresa.id"))
    fecha_hora = Column(TIMESTAMP, nullable=False, default=datetime.datetime.now)
    comentarios = Column(Text)