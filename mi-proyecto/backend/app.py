from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import datetime
import json
import os

# Servimos el frontend directamente desde Flask
app = Flask(__name__, static_folder="../frontend", static_url_path="/")
CORS(app) 

DB_FILE = "database.db"
JSON_FOLDER = "usuarios_json"

# ==========================================
# INICIALIZAR BASE DE DATOS Y CARPETAS
# ==========================================
def init_db():
    if not os.path.exists(JSON_FOLDER):
        os.makedirs(JSON_FOLDER)

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS usuarios 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, user TEXT UNIQUE, password TEXT, saldo REAL)''')
        c.execute('''CREATE TABLE IF NOT EXISTS productos 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, vendedor TEXT, nombre TEXT, desc TEXT, precio REAL, img TEXT)''')
        c.execute('''CREATE TABLE IF NOT EXISTS compras 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, comprador TEXT, total REAL, fecha TEXT, items TEXT)''')
        
        c.execute("SELECT COUNT(*) FROM productos")
        if c.fetchone()[0] == 0:
            productos_completos = [
                ('TechStore', 'Apple MacBook Pro M3', 'Chip M3 Pro, 18GB RAM, 512GB SSD.', 2029.00, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'),
                ('TechStore', 'Tarjeta Gráfica RTX 4090', 'NVIDIA GeForce RTX 4090 24GB GDDR6X.', 1899.90, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=800&q=80'),
                ('ComponentesPC', 'Monitor Dell UltraSharp 27"', 'Resolución 4K UHD, panel IPS, USB-C.', 549.00, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80'),
                ('TechStore', 'Logitech MX Master 3S', 'Ratón inalámbrico ergonómico, sensor 8K DPI.', 115.00, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80'),
                ('ComponentesPC', 'Teclado Mecánico Keychron Q1', 'Formato 75%, switches Gateron Pro Red.', 179.00, 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80'),
                ('TechStore', 'Procesador AMD Ryzen 9 7950X', '16 Núcleos, 32 Hilos, hasta 5.7 GHz.', 620.50, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=800&q=80'),
                ('TechStore', 'Auriculares Sony WH-1000XM5', 'Cancelación de ruido, 30h de batería.', 349.00, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80'),
                ('ComponentesPC', 'SSD Samsung 990 PRO 2TB', 'PCIe 4.0 NVMe M.2. Hasta 7450 MB/s.', 185.99, 'https://images.unsplash.com/photo-1628557044797-f21a177c37ec?auto=format&fit=crop&w=800&q=80'),
                ('TechStore', 'Placa Base ASUS ROG Strix', 'Para procesadores Intel 13ª Gen, WiFi 6E.', 499.00, 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'),
                ('TechStore', 'RAM Corsair Vengeance 32GB', '2x16GB DDR5 a 6000MHz C36.', 124.90, 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=800&q=80'),
                ('OficinaPro', 'Silla Herman Miller Aeron', 'Soporte postural avanzado.', 1295.00, 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=800&q=80'),
                ('TechStore', 'Apple iPad Pro M4 13"', 'Pantalla Ultra Retina XDR.', 1549.00, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80'),
                ('ComponentesPC', 'Micrófono Shure SM7B', 'Micrófono dinámico para podcasting.', 389.00, 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80'),
                ('TechStore', 'Gafas VR Meta Quest 3', 'VR y realidad mixta, 128GB.', 549.99, 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=800&q=80'),
                ('GamingWorld', 'Mando Sony DualSense', 'Mando oficial para PS5 y PC.', 69.99, 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&q=80')
            ]
            c.executemany("INSERT INTO productos (vendedor, nombre, desc, precio, img) VALUES (?, ?, ?, ?, ?)", productos_completos)
        conn.commit()

init_db()

@app.route('/')
def index():
    return app.send_static_file('index.html')

# ==========================================
# RUTAS DE AUTENTICACIÓN
# ==========================================
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('email') or not data.get('user') or not data.get('pass'):
        return jsonify({'error': 'Faltan datos'}), 400
    
    hashed_pw = generate_password_hash(data['pass'])
    try:
        with sqlite3.connect(DB_FILE) as conn:
            c = conn.cursor()
            c.execute("INSERT INTO usuarios (email, user, password, saldo) VALUES (?, ?, ?, ?)", 
                      (data['email'], data['user'], hashed_pw, 0.0))
            conn.commit()
            
        datos_usuario = {
            "usuario": data['user'],
            "email": data['email'],
            "fecha_registro": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "saldo_inicial": 0.0
        }
        
        with open(f"{JSON_FOLDER}/perfil_{data['user']}.json", 'w', encoding='utf-8') as f:
            json.dump(datos_usuario, f, indent=4, ensure_ascii=False)

        return jsonify({'msg': 'Registrado con éxito y JSON creado'}), 201
        
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Usuario/Email ya existe'}), 409

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("SELECT id, user, password, saldo FROM usuarios WHERE user = ? OR email = ?", 
                  (data.get('login'), data.get('login')))
        user = c.fetchone()

    if user and check_password_hash(user[2], data.get('pass')):
        return jsonify({'id': user[0], 'user': user[1], 'saldo': user[3]}), 200
    return jsonify({'error': 'Credenciales incorrectas'}), 401

@app.route('/api/recargar', methods=['POST'])
def recargar():
    data = request.json
    try:
        cantidad = round(float(data['cantidad']), 2)
        with sqlite3.connect(DB_FILE) as conn:
            c = conn.cursor()
            c.execute("UPDATE usuarios SET saldo = saldo + ? WHERE user = ?", (cantidad, data['user']))
            c.execute("SELECT saldo FROM usuarios WHERE user = ?", (data['user'],))
            nuevo_saldo = c.fetchone()[0]
            conn.commit()
        return jsonify({'nuevo_saldo': nuevo_saldo}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ==========================================
# RUTAS DE TIENDA (Blindadas contra SQLi)
# ==========================================
@app.route('/api/productos/buscar', methods=['GET'])
def buscar_producto():
    query_param = f"%{request.args.get('q', '')}%"
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row 
        c = conn.cursor()
        # SEGURO: Usamos '?' para evitar Inyección SQL
        c.execute("SELECT * FROM productos WHERE nombre LIKE ?", (query_param,))
        productos = [dict(row) for row in c.fetchall()]
    return jsonify(productos), 200

@app.route('/api/productos', methods=['POST'])
def crear_producto():
    data = request.json
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("INSERT INTO productos (vendedor, nombre, desc, precio, img) VALUES (?, ?, ?, ?, ?)", 
                  (data['vendedor'], data['nombre'], data['desc'], float(data['precio']), data.get('img', '')))
        conn.commit()
    return jsonify({'msg': 'OK'}), 201

@app.route('/api/comprar', methods=['POST'])
def comprar():
    data = request.json
    comprador = data.get('comprador')
    total = round(float(data.get('total', 0)), 2)
    items = json.dumps(data.get('items', []))
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("SELECT saldo FROM usuarios WHERE user = ?", (comprador,))
        user = c.fetchone()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        saldo_actual = round(float(user[0]), 2)
        
        if saldo_actual < total:
            return jsonify({'error': f'Saldo insuficiente. Tienes {saldo_actual}€'}), 400
        
        nuevo_saldo = round(saldo_actual - total, 2)
        c.execute("UPDATE usuarios SET saldo = ? WHERE user = ?", (nuevo_saldo, comprador))
        c.execute("INSERT INTO compras (comprador, total, fecha, items) VALUES (?, ?, ?, ?)", 
                  (comprador, total, fecha, items))
        conn.commit()
        
    return jsonify({'nuevo_saldo': nuevo_saldo}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)