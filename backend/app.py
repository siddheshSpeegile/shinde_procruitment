import os 
from flask import Flask
from flask_cors import CORS
from config import config
from database import db

# Import blueprints
from routes.auth import auth_bp
from routes.products import products_bp
from routes.cart import cart_bp
from routes.orders import orders_bp
from routes.dashboard import dashboard_bp
from flask import send_from_directory
from routes.roles import roles_bp



app = Flask(__name__)

# Configuration
app.config.from_object(config)

# Whole-request limit: POST /api/products carries up to 4 photos (10MB each,
# enforced per photo in routes/products.py) plus the form fields.
app.config['MAX_CONTENT_LENGTH'] = 45 * 1024 * 1024
# Enable CORS for all routes

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'products')
CORS(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(products_bp)
app.register_blueprint(cart_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(roles_bp)


@app.before_request
def before_request():
    """Connect to database before each request"""
    db.connect()

# Legacy: products created before photos moved into the DB (see
# GET /api/product-photos/<id>) still point at files on disk here.
@app.route('/uploads/products/<filename>')
def uploaded_product_photo(filename):
     return send_from_directory(UPLOAD_DIR, filename)

@app.teardown_request
def teardown_request(exception):
    """Close database after each request"""
    db.close()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return {'status': 'healthy'}, 200

@app.route('/health/db')
def db_health():
    conn = db.connect()
    if conn:
        return {"status": "connected"}, 200
    return {"status": "failed"}, 500


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )



