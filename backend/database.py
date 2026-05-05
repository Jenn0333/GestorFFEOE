from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Url hacia la base de datos
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin@localhost:5432/practicas"

# El engine es el que se encarga de la comunicación real
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Cada instancia de SessionLocal será una sesión de base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base de la que heredarán tus modelos (tablas)
Base = declarative_base()