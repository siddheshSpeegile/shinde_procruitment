# import os
# from dotenv import load_dotenv

# load_dotenv()

# class Config:
#     """Base configuration"""
#     SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-this')
#     JSON_SORT_KEYS = False
#     JSONIFY_PRETTYPRINT_REGULAR = True

# class DevelopmentConfig(Config):
#     """Development configuration"""
#     DEBUG = True
#     TESTING = False
    
#     # Database
#     DB_HOST = os.getenv('DB_HOST', 'localhost')
#     DB_USER = os.getenv('DB_USER', 'root')
#     DB_PASSWORD = os.getenv('DB_PASSWORD', '')
#     DB_NAME = os.getenv('DB_NAME', 'shinde_procurement')
#     DB_PORT = int(os.getenv('DB_PORT', 3306))

# class ProductionConfig(Config):
#     """Production configuration"""
#     DEBUG = False
#     TESTING = False
    
#     # Database
#     DB_HOST = os.getenv('DB_HOST')
#     DB_USER = os.getenv('DB_USER')
#     DB_PASSWORD = os.getenv('DB_PASSWORD')
#     DB_NAME = os.getenv('DB_NAME')
#     DB_PORT = int(os.getenv('DB_PORT', 3306))

# # Select config based on environment
# ENV = os.getenv('FLASK_ENV', 'development')
# if ENV == 'production':
#     config = ProductionConfig()
# else:
#     config = DevelopmentConfig()


import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-this')
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = True

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'shinde_procurement')
    DB_PORT = int(os.getenv('DB_PORT', 5432))
    # Defaults to 'public' - only needed if your tables live in a
    # non-default schema (e.g. you created a schema named
    # 'shinde_procurement' instead of a separate database for it).
    DB_SCHEMA = os.getenv('DB_SCHEMA', 'public')

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Database
    DB_HOST = os.getenv('DB_HOST')
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_NAME = os.getenv('DB_NAME')
    DB_PORT = int(os.getenv('DB_PORT', 5432))
    DB_SCHEMA = os.getenv('DB_SCHEMA', 'public')

# Select config based on environment
ENV = os.getenv('FLASK_ENV', 'development')
if ENV == 'production':
    config = ProductionConfig()
else:
    config = DevelopmentConfig()